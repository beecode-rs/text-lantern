import fs from 'node:fs'
import path from 'node:path'
import { spawn, type ChildProcess } from 'node:child_process'
import { pathsService } from './paths'
import { settingsService } from './settings'
import { langService } from './lib/lang'
import type { Voice } from '../shared/types'

const SR_VOICE = 'sr_Marko_medium'
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

function listVoices(): Voice[] {
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
}

function isEngineInstalled(): boolean {
  try {
    return fs.existsSync(pathsService.piperBin())
  } catch {
    return false
  }
}

function installEngine(params: { onLog: (line: string) => void }): Promise<boolean> {
  return new Promise((resolve) => {
    const child: ChildProcess = spawn('bash', [pathsService.installScript()], {
      cwd: pathsService.projectRoot(),
      env: { ...process.env, FORCE: '0' }
    })
    const feed = (d: Buffer): void => {
      d.toString()
        .split('\n')
        .forEach((line) => {
          if (line.trim()) {
            params.onLog(line)
          }
        })
    }
    child.stdout?.on('data', feed)
    child.stderr?.on('data', feed)
    child.on('exit', (code) => {
      if (code === 0) {
        params.onLog('[done]')
      } else {
        params.onLog(`[failed (exit ${code})]`)
      }
      resolve(code === 0 && isEngineInstalled())
    })
    child.on('error', (err) => {
      params.onLog(String(err))
      resolve(false)
    })
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

async function downloadVoice(params: {
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
}

function deleteVoice(params: { name: string }): void {
  const dir = pathsService.modelsDir()
  ;['onnx', 'onnx.json'].forEach((ext) => {
    const file = path.join(dir, `${params.name}.${ext}`)
    try {
      fs.rmSync(file, { force: true })
    } catch {}
  })
}

export const modelsService = {
  listVoices,
  isEngineInstalled,
  installEngine,
  downloadVoice,
  deleteVoice
}
