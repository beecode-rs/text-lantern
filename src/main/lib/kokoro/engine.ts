import { singletonPattern } from '@beecode/msh-util/singleton/pattern'
import fs from 'node:fs'
import path from 'node:path'

import { constant } from '#src/main/util/constants'
import { pathUtil } from '#src/main/util/path-util'
import { KOKORO_VOICE_CATALOG, type KokoroVoice } from '#src/shared/voice/kokoro-voice-catalog'

export class KokoroEngine {
  protected _modelDownloadPromise: Promise<void> | null = null

  deleteVoice(params: { voiceId: string }): void {
    this._bestEffort(() => {
      fs.rmSync(this._voiceMarkerPath({ voiceId: params.voiceId }), { force: true })

      return undefined
    })
  }

  async downloadVoice(params: { voiceId: string; onProgress: (p: number) => void }): Promise<void> {
    this._requireKnownVoiceId({ voiceId: params.voiceId })
    await this._ensureModelDownloaded({ onProgress: params.onProgress })
    if (!this._isVoiceDownloaded({ voiceId: params.voiceId })) {
      this._writeVoiceMarker({ voiceId: params.voiceId })
    }
  }

  isModelDownloaded(): boolean {
    return constant().kokoroEngine.modelFiles.every((file) => {
      try {
        return fs.statSync(path.join(pathUtil.kokoroModelDir(), file.path)).size === file.sizeBytes
      } catch {
        return false
      }
    })
  }

  isVoiceDownloaded(params: { voiceId: string }): boolean {
    return this._isVoiceDownloaded({ voiceId: params.voiceId })
  }

  protected _isVoiceDownloaded(params: { voiceId: string }): boolean {
    try {
      return fs.existsSync(this._voiceMarkerPath({ voiceId: params.voiceId }))
    } catch {
      return false
    }
  }

  protected _requireKnownVoiceId(params: { voiceId: string }): KokoroVoice {
    const voice = KOKORO_VOICE_CATALOG.find((catalogVoice) => {
      return catalogVoice.id === params.voiceId
    })
    if (voice === undefined) {
      throw new Error(`Unknown Kokoro voice id: ${params.voiceId}`)
    }

    return voice
  }

  protected _voiceMarkerPath(params: { voiceId: string }): string {
    return path.join(pathUtil.kokoroVoicesDir(), `${params.voiceId}${constant().kokoroEngine.markerFileSuffix}`)
  }

  protected _writeVoiceMarker(params: { voiceId: string }): void {
    fs.mkdirSync(pathUtil.kokoroVoicesDir(), { recursive: true })
    fs.writeFileSync(this._voiceMarkerPath({ voiceId: params.voiceId }), '')
  }

  protected async _ensureModelDownloaded(params: { onProgress: (p: number) => void }): Promise<void> {
    if (this.isModelDownloaded()) {
      params.onProgress(1)

      return
    }
    this._modelDownloadPromise ??= this._downloadModelFiles({ onProgress: params.onProgress })
    try {
      await this._modelDownloadPromise
    } catch (err) {
      this._modelDownloadPromise = null
      throw err
    }
    params.onProgress(1)
  }

  protected async _downloadModelFiles(params: { onProgress: (p: number) => void }): Promise<void> {
    const files = constant().kokoroEngine.modelFiles
    const totalSizeBytes = files.reduce((acc, file) => {
      return acc + file.sizeBytes
    }, 0)
    let base = 0
    await files.reduce(async (acc, file) => {
      await acc
      const dest = path.join(pathUtil.kokoroModelDir(), file.path)
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      const weight = file.sizeBytes / totalSizeBytes
      await this._downloadFileWithProgress({
        dest,
        onProgress: (p) => {
          params.onProgress(base + p * weight)
        },
        url: `${constant().kokoroEngine.modelBaseUrl}/${file.path}`,
      })
      base += weight
      params.onProgress(base)
    }, Promise.resolve())
    params.onProgress(1)
  }

  protected async _downloadFileWithProgress(params: {
    url: string
    dest: string
    onProgress: (p: number) => void
  }): Promise<void> {
    const res = await fetch(params.url, {
      signal: AbortSignal.timeout(constant().kokoroEngine.downloadTimeoutMs),
    })
    if (!res.ok || !res.body) {
      throw new Error(`Download failed (${String(res.status)} ${res.statusText}): ${params.url}`)
    }
    const total = Number(res.headers.get('content-length')) || 0
    const reader = res.body.getReader()
    const out = fs.createWriteStream(params.dest)
    const streamSettled = new Promise<void>((resolve, reject) => {
      out.on('error', (err) => {
        reject(err)
      })
      out.on('finish', () => {
        resolve()
      })
    })
    streamSettled.catch(() => {
      return undefined
    })
    try {
      await this._pumpDownloadChunks({ onProgress: params.onProgress, out, reader, total })
      out.end()
      await streamSettled
    } catch (err) {
      this._bestEffort(() => {
        void reader.cancel()

        return undefined
      })
      out.destroy()
      this._bestEffort(() => {
        fs.rmSync(params.dest, { force: true })

        return undefined
      })
      throw err
    }
  }

  protected async _pumpDownloadChunks(params: {
    onProgress: (progress: number) => void
    out: fs.WriteStream
    reader: ReadableStreamDefaultReader<Uint8Array>
    total: number
  }): Promise<void> {
    const { done, value } = await params.reader.read()
    if (done) {
      return Promise.resolve()
    }
    params.out.write(Buffer.from(value))
    if (params.total > 0) {
      params.onProgress(params.out.bytesWritten / params.total)
    }

    return this._pumpDownloadChunks(params)
  }

  protected _bestEffort(action: () => unknown): void {
    try {
      action()
    } catch {
      return undefined
    }
  }
}

export const kokoroEngineSingleton = singletonPattern(() => {
  return new KokoroEngine()
})
