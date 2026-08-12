import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, type ChildProcess } from 'node:child_process'
import { pathsService } from '@src/main/util/paths-service'
import { settingsService } from '@src/main/business/service/settings-service'
import { langService } from '@src/main/util/lang-service'
import type { Voice } from '@src/shared/types'

const SR_VOICE = 'sr_Marko_medium'
const EN_VOICE = 'en_US-lessac-medium'
const DEFAULT_INSTALL_VOICES = [SR_VOICE, EN_VOICE]
const SR_REPO = 'https://huggingface.co/phantom9623/piper-serbian-tts/resolve/main'
const VOICES_BASE = 'https://huggingface.co/rhasspy/piper-voices/resolve/main'

function _splitVoiceNameIntoParts(name: string): {
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

function _resolveVoiceDownloadUrlPrefix(params: { name: string }): string {
  if (params.name === SR_VOICE) {
    return SR_REPO
  }
  const { lang, langRegion, voice, quality } = _splitVoiceNameIntoParts(params.name)
  return `${VOICES_BASE}/${lang}/${langRegion}/${voice}/${quality}`
}

function _venvPipBinPath(): string {
  return path.join(pathsService.venvDir(), 'bin', 'pip')
}

function _forwardCommandOutputLineByLine(params: {
  output: Buffer
  onLog?: (line: string) => void
}): void {
  params.output
    .toString()
    .split('\n')
    .forEach((line) => {
      if (line.trim()) {
        params.onLog?.(line)
      }
    })
}

function _runCommandStreamingOutput(params: {
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
    const onStdout = (d: Buffer): void => {
      _forwardCommandOutputLineByLine({ output: d, onLog: params.onLog })
    }
    child.stdout?.on('data', onStdout)
    child.stderr?.on('data', onStdout)
    child.on('exit', (code) => {
      resolve(code ?? -1)
    })
    child.on('error', (err) => {
      params.onLog?.(String(err))
      resolve(-1)
    })
  })
}

function _wavFileHasAudio(params: { wavPath: string }): boolean {
  try {
    return fs.existsSync(params.wavPath) && fs.statSync(params.wavPath).size > 0
  } catch {
    return false
  } finally {
    try {
      fs.rmSync(params.wavPath, { force: true })
    } catch {}
  }
}

function _verifyVoiceProducesAudio(voice: string): Promise<boolean> {
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
      child = spawn(pathsService.piperBin(), ['-m', onnx, '-c', json, '-f', wav], {
        stdio: ['pipe', 'ignore', 'ignore']
      })
    } catch {
      resolve(false)
      return
    }
    child.on('error', () => {
      resolve(false)
    })
    child.on('exit', () => {
      resolve(_wavFileHasAudio({ wavPath: wav }))
    })
    child.stdin?.end('test.\n')
  })
}

async function _downloadFileWithProgress(params: {
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
    out.end(() => {
      resolve()
    })
  })
}

async function _ensurePythonVersionMeetsMinimum(params: {
  onLog: (line: string) => void
}): Promise<boolean> {
  const exitCode = await _runCommandStreamingOutput({
    cmd: 'python3',
    args: [
      '-c',
      'import sys; sys.exit(0 if (sys.version_info.major, sys.version_info.minor) >= (3, 9) else 1)'
    ]
  })
  if (exitCode !== 0) {
    params.onLog('error: Python 3.9+ is required to run the Piper engine.')
    return false
  }
  return true
}

async function _createVenvAndInstallPiperIfMissing(params: {
  onLog: (line: string) => void
}): Promise<boolean> {
  const log = params.onLog
  if (modelsService.isEngineInstalled()) {
    log('piper-tts already installed.')
    return true
  }

  log('Creating virtualenv…')
  const venvExit = await _runCommandStreamingOutput({
    cmd: 'python3',
    args: ['-m', 'venv', pathsService.venvDir()],
    onLog: log
  })
  if (venvExit !== 0) {
    log('python3 -m venv failed. On Debian/Ubuntu you may need: sudo apt install python3-venv')
    return false
  }

  log('Installing piper-tts (one-time, ~1 min)…')
  await _runCommandStreamingOutput({
    cmd: _venvPipBinPath(),
    args: ['install', '-q', '--upgrade', 'pip'],
    onLog: log
  })
  const installExit = await _runCommandStreamingOutput({
    cmd: _venvPipBinPath(),
    args: ['install', 'piper-tts'],
    onLog: log
  })
  if (installExit !== 0 || !modelsService.isEngineInstalled()) {
    log('pip install piper-tts failed.')
    if (process.platform === 'darwin') {
      log('On macOS try: brew install espeak-ng   then retry.')
    } else {
      log('On Linux try: sudo apt install espeak-ng-dev   then retry.')
    }
    return false
  }

  log('piper-tts installed.')
  return true
}

async function _downloadEachMissingDefaultVoice(params: {
  onLog: (line: string) => void
}): Promise<void> {
  const log = params.onLog
  fs.mkdirSync(pathsService.modelsDir(), { recursive: true })
  await DEFAULT_INSTALL_VOICES.reduce(async (acc, voice) => {
    await acc
    const onnx = path.join(pathsService.modelsDir(), `${voice}.onnx`)
    if (fs.existsSync(onnx)) {
      log(`  present: ${voice}`)
      return
    }
    log(`Downloading ${voice}…`)
    try {
      await modelsService.downloadVoice({ name: voice, onProgress: () => {} })
      log(`  done: ${voice}`)
    } catch (err) {
      log(`  failed: ${voice}: ${String(err)}`)
    }
  }, Promise.resolve())
}

async function _verifySynthesisProducesAudio(params: {
  onLog: (line: string) => void
}): Promise<void> {
  params.onLog('Verifying synthesis…')
  const verified = await _verifyVoiceProducesAudio(SR_VOICE)
  if (verified) {
    params.onLog('  ok')
  } else {
    params.onLog('  verify failed (the engine may still work).')
  }
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
      entries
        .filter((e) => {
          return e.endsWith('.onnx')
        })
        .map((e) => {
          return e.slice(0, -'.onnx'.length)
        })
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

    const pythonOk = await _ensurePythonVersionMeetsMinimum({ onLog: log })
    if (!pythonOk) {
      return false
    }

    const installed = await _createVenvAndInstallPiperIfMissing({ onLog: log })
    if (!installed) {
      return false
    }

    await _downloadEachMissingDefaultVoice({ onLog: log })

    await _verifySynthesisProducesAudio({ onLog: log })
    log('[done]')
    return this.isEngineInstalled()
  },

  async downloadVoice(params: {
    name: string
    onProgress: (p: number) => void
  }): Promise<void> {
    fs.mkdirSync(pathsService.modelsDir(), { recursive: true })
    const prefix = _resolveVoiceDownloadUrlPrefix({ name: params.name })
    const files = [
      { ext: 'onnx', weight: 0.97 },
      { ext: 'onnx.json', weight: 0.03 }
    ]
    let base = 0
    await files.reduce(async (acc, f) => {
      await acc
      const dest = path.join(pathsService.modelsDir(), `${params.name}.${f.ext}`)
      const url = `${prefix}/${params.name}.${f.ext}`
      await _downloadFileWithProgress({
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
