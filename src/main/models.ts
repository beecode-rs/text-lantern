import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, type ChildProcess } from 'node:child_process'
import { pathsService } from '@src/main/paths'
import { settingsService } from '@src/main/settings'
import { langService } from '@src/main/lib/lang'
import type { Voice } from '@src/shared/types'

const SR_VOICE = 'sr_Marko_medium'
const EN_VOICE = 'en_US-lessac-medium'
const DEFAULT_INSTALL_VOICES = [SR_VOICE, EN_VOICE]
const SR_REPO = 'https://huggingface.co/phantom9623/piper-serbian-tts/resolve/main'
const VOICES_BASE = 'https://huggingface.co/rhasspy/piper-voices/resolve/main'

function voiceNameParts(name: string): {
  lang: string
  langRegion: string
  voice: string
  quality: string
} {
  const dash = name.indexOf('-')
  let langRegion = name
  let rest = ''
  if (dash >= 0) {
    langRegion = name.slice(0, dash)
    rest = name.slice(dash + 1)
  }
  const lastDash = rest.lastIndexOf('-')
  let voice = rest
  let quality = ''
  if (lastDash >= 0) {
    voice = rest.slice(0, lastDash)
    quality = rest.slice(lastDash + 1)
  }
  const lang = langRegion.split('_')[0] || langRegion
  return { lang, langRegion, voice, quality }
}

function voiceUrlPrefix(params: { name: string }): string {
  if (params.name === SR_VOICE) {
    return SR_REPO
  }
  const { lang, langRegion, voice, quality } = voiceNameParts(params.name)
  return `${VOICES_BASE}/${lang}/${langRegion}/${voice}/${quality}`
}

function venvPip(): string {
  return path.join(pathsService.venvDir(), 'bin', 'pip')
}

// Run a command, streaming each stdout/stderr line to onLog. Resolves with the
// exit code (or -1 on a failure to spawn).
function runCmd(params: {
  cmd: string
  args: string[]
  env?: NodeJS.ProcessEnv
  onLog?: (line: string) => void
}): Promise<number> {
  return new Promise((resolve) => {
    const child: ChildProcess = spawn(params.cmd, params.args, {
      cwd: pathsService.projectRoot(),
      env: { ...process.env, ...(params.env ?? {}) }
    })
    const feed = (d: Buffer): void => {
      for (const line of d.toString().split('\n')) {
        if (line.trim()) params.onLog?.(line)
      }
    }
    child.stdout?.on('data', feed)
    child.stderr?.on('data', feed)
    child.on('exit', (code) => resolve(code ?? -1))
    child.on('error', (err) => {
      params.onLog?.(String(err))
      resolve(-1)
    })
  })
}

// Pipe "test." through piper into a throwaway WAV; true if audio was produced.
function verifySynthesis(voice: string): Promise<boolean> {
  return new Promise((resolve) => {
    const onnx = path.join(pathsService.modelsDir(), `${voice}.onnx`)
    const json = path.join(pathsService.modelsDir(), `${voice}.onnx.json`)
    if (!fs.existsSync(onnx) || !fs.existsSync(json)) {
      resolve(false)
      return
    }
    const wav = path.join(os.tmpdir(), `tts-verify-${process.pid}.wav`)
    let child: ChildProcess
    try {
      child = spawn(
        pathsService.piperBin(),
        ['-m', onnx, '-c', json, '-f', wav],
        { stdio: ['pipe', 'ignore', 'ignore'] }
      )
    } catch {
      resolve(false)
      return
    }
    child.on('error', () => resolve(false))
    child.on('exit', () => {
      let ok = false
      try {
        ok = fs.existsSync(wav) && fs.statSync(wav).size > 0
      } catch {}
      try {
        fs.rmSync(wav, { force: true })
      } catch {}
      resolve(ok)
    })
    child.stdin?.end('test.\n')
  })
}

async function downloadOne(params: {
  url: string
  dest: string
  onProgress: (p: number) => void
}): Promise<void> {
  const res = await fetch(params.url)
  if (!res.ok || !res.body) {
    throw new Error(`Download failed (${res.status} ${res.statusText}): ${params.url}`)
  }
  const total = Number(res.headers.get('content-length')) || 0
  const reader = res.body.getReader()
  const out = fs.createWriteStream(params.dest)
  let received = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    out.write(Buffer.from(value))
    received += value.byteLength
    if (total > 0) {
      params.onProgress(received / total)
    }
  }
  await new Promise<void>((resolve) => {
    out.end(() => resolve())
  })
}

export const modelsService = {
  listVoices(): Voice[] {
    const dir = pathsService.modelsDir()
    const settings = settingsService.get()
    let entries: string[] = []
    try {
      entries = fs.readdirSync(dir)
    } catch {
      return []
    }

    const onnxNames = new Set(
      entries.filter((e) => e.endsWith('.onnx')).map((e) => e.slice(0, -'.onnx'.length))
    )

    return Array.from(onnxNames)
      .sort()
      .map<Voice>((name) => {
        let sizeBytes = 0
        try {
          sizeBytes = fs.statSync(path.join(dir, `${name}.onnx`)).size
        } catch {}
        return {
          name,
          hasJson: fs.existsSync(path.join(dir, `${name}.onnx.json`)),
          sizeBytes,
          lang: langService.voiceLang({ name }),
          isDefault: name === settings.voiceSr || name === settings.voiceEn
        }
      })
  },

  isEngineInstalled(): boolean {
    try {
      return fs.existsSync(pathsService.piperBin())
    } catch {
      return false
    }
  },

  async installEngine(params: { onLog: (line: string) => void }): Promise<boolean> {
    const log = params.onLog

    // 1. python3 3.9+
    const versionOk = await runCmd({
      cmd: 'python3',
      args: ['-c', 'import sys; sys.exit(0 if (sys.version_info.major, sys.version_info.minor) >= (3, 9) else 1)']
    })
    if (versionOk !== 0) {
      log('error: Python 3.9+ is required to run the Piper engine.')
      return false
    }

    // 2. Create the virtualenv and install piper-tts (unless already present).
    if (!this.isEngineInstalled()) {
      log('Creating virtualenv…')
      const venvOk = await runCmd({
        cmd: 'python3',
        args: ['-m', 'venv', pathsService.venvDir()],
        onLog: log
      })
      if (venvOk !== 0) {
        log('python3 -m venv failed. On Debian/Ubuntu you may need: sudo apt install python3-venv')
        return false
      }

      log('Installing piper-tts (one-time, ~1 min)…')
      await runCmd({ cmd: venvPip(), args: ['install', '-q', '--upgrade', 'pip'], onLog: log })
      const installOk = await runCmd({ cmd: venvPip(), args: ['install', 'piper-tts'], onLog: log })
      if (installOk !== 0 || !this.isEngineInstalled()) {
        log('pip install piper-tts failed.')
        log(
          process.platform === 'darwin'
            ? 'On macOS try: brew install espeak-ng   then retry.'
            : 'On Linux try: sudo apt install espeak-ng-dev   then retry.'
        )
        return false
      }
      log('piper-tts installed.')
    } else {
      log('piper-tts already installed.')
    }

    // 3. Download the default voices if missing (any other voice is added in the UI).
    fs.mkdirSync(pathsService.modelsDir(), { recursive: true })
    for (const voice of DEFAULT_INSTALL_VOICES) {
      const onnx = path.join(pathsService.modelsDir(), `${voice}.onnx`)
      if (fs.existsSync(onnx)) {
        log(`  present: ${voice}`)
        continue
      }
      log(`Downloading ${voice}…`)
      try {
        await this.downloadVoice({ name: voice, onProgress: () => {} })
        log(`  done: ${voice}`)
      } catch (err) {
        log(`  failed: ${voice}: ${String(err)}`)
      }
    }

    // 4. Lenient verify.
    log('Verifying synthesis…')
    const verified = await verifySynthesis(SR_VOICE)
    log(verified ? '  ok' : '  verify failed (the engine may still work).')
    log('[done]')
    return this.isEngineInstalled()
  },

  async downloadVoice(params: {
    name: string
    onProgress: (p: number) => void
  }): Promise<void> {
    fs.mkdirSync(pathsService.modelsDir(), { recursive: true })
    const prefix = voiceUrlPrefix({ name: params.name })
    const files = [
      { ext: 'onnx', weight: 0.97 },
      { ext: 'onnx.json', weight: 0.03 }
    ]
    let base = 0
    await files.reduce(async (acc, f) => {
      await acc
      const dest = path.join(pathsService.modelsDir(), `${params.name}.${f.ext}`)
      const url = `${prefix}/${params.name}.${f.ext}`
      await downloadOne({
        url,
        dest,
        onProgress: (p) => {
          params.onProgress(base + p * f.weight)
        }
      })
      base += f.weight
      params.onProgress(base)
    }, Promise.resolve())
    params.onProgress(1)
  },

  deleteVoice(params: { name: string }): void {
    const dir = pathsService.modelsDir()
    ;['onnx', 'onnx.json'].forEach((ext) => {
      const file = path.join(dir, `${params.name}.${ext}`)
      try {
        fs.rmSync(file, { force: true })
      } catch {}
    })
  }
}
