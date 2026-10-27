import { singletonPattern } from '@beecode/msh-util/singleton/pattern'
import { app, shell } from 'electron'
import { spawn } from 'node:child_process'
import { constants, createWriteStream } from 'node:fs'
import { access, chmod, rename, rm } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import { constant } from '#src/main/util/constants'
import { logger } from '#src/main/util/logger'
import {
  type UpdateAsset,
  type UpdateCheckError,
  type UpdateCheckState,
  type UpdateDownloadProgress,
  type UpdateDownloadResult,
  type UpdateDownloadStatus,
  UpdateErrorKind,
  type UpdateInstallType,
  type UpdateStatus,
} from '#src/shared/types'
import { versionUtil } from '#src/shared/version/version-util'

const PARTIAL_FILE_SUFFIX = '.part'

const STDERR_TAIL_MAX_LENGTH = 2048

interface GithubReleaseAsset {
  browser_download_url?: string
  name?: string
  size?: number
}

interface GithubReleaseResponse {
  assets?: GithubReleaseAsset[]
  html_url?: string
  tag_name?: string
}

class UpdateCheckFailure extends Error {
  readonly kind: UpdateErrorKind
  readonly rateLimitResetAt: number | null
  readonly statusCode: number | null

  constructor(params: {
    kind: UpdateErrorKind
    message: string
    rateLimitResetAt?: number | null
    statusCode?: number | null
  }) {
    super(params.message)
    this.kind = params.kind
    this.rateLimitResetAt = params.rateLimitResetAt ?? null
    this.statusCode = params.statusCode ?? null
  }
}

export class UpdateService {
  protected readonly _downloadListeners = new Set<(progress: UpdateDownloadProgress) => void>()

  protected readonly _listeners = new Set<(status: UpdateStatus) => void>()

  protected _downloadStatus: UpdateDownloadProgress = {
    receivedBytes: 0,
    state: 'idle',
    totalBytes: 0,
  }

  protected _status: UpdateStatus = {
    asset: null,
    currentVersion: constant().projectVersion,
    error: null,
    latestVersion: null,
    releaseUrl: '',
    state: 'idle',
  }

  async checkNow(): Promise<UpdateStatus> {
    this._setStatus({ ...this._status, error: null, state: 'checking' })
    try {
      const release = await this._fetchLatestRelease()
      this._setStatus(this._toUpdateStatus({ release }))
    } catch (error) {
      const failure = this._toFailure({ error })
      const checkError = this._toFailurePayload({ failure })
      logger().warn('Update check failed:', checkError)
      this._setStatus({
        ...this._status,
        error: checkError,
        state: 'error',
      })
    }

    return this._status
  }

  async downloadLatest(): Promise<UpdateDownloadResult> {
    const busyStatusMessage = this._toBusyStatusMessage({ state: this._downloadStatus.state })

    if (busyStatusMessage !== null) {
      throw new Error(busyStatusMessage)
    }

    const release = await this._fetchLatestRelease()
    const status = this._toUpdateStatus({ release })
    this._setStatus(status)

    if (status.state !== 'updateAvailable') {
      throw new Error(`No update available (latest known version: ${status.latestVersion ?? 'unknown'})`)
    }
    if (status.asset === null) {
      await shell.openExternal(status.releaseUrl)

      return { filePath: null, outcome: 'release-page' }
    }

    return await this._downloadAsset({ asset: status.asset })
  }

  getStatus(): UpdateStatus {
    return this._status
  }

  onChange(cb: (status: UpdateStatus) => void): () => void {
    this._listeners.add(cb)

    return () => {
      this._listeners.delete(cb)
    }
  }

  onDownloadChange(cb: (progress: UpdateDownloadProgress) => void): () => void {
    this._downloadListeners.add(cb)

    return () => {
      this._downloadListeners.delete(cb)
    }
  }

  relaunchForUpdate(): void {
    const appImagePath = this._toAppImagePath()

    if (appImagePath !== null) {
      app.relaunch({ execPath: appImagePath })
      app.exit(0)

      return
    }

    app.relaunch()
    app.exit(0)
  }

  protected _addReceivedBytes(params: { bytes: number }): void {
    const { bytes } = params

    this._setDownloadStatus({
      ...this._downloadStatus,
      receivedBytes: this._downloadStatus.receivedBytes + bytes,
    })
  }

  protected async _downloadAsset(params: { asset: UpdateAsset }): Promise<UpdateDownloadResult> {
    const { asset } = params
    const appImagePath = await this._toSelfUpdatableAppImagePath()
    const filePath = this._toDownloadTargetFilePath({ appImagePath, asset })
    const partialFilePath = `${filePath}${PARTIAL_FILE_SUFFIX}`

    this._setDownloadStatus({
      filePath,
      receivedBytes: 0,
      state: 'downloading',
      totalBytes: 0,
    })

    try {
      const response = await fetch(asset.url)
      if (!response.ok) {
        throw new Error(`Update download failed with status ${String(response.status)}`)
      }

      this._setDownloadStatus({
        ...this._downloadStatus,
        totalBytes: this._toContentLength({ response }),
      })
      await pipeline(this._toProgressReadable({ response }), createWriteStream(partialFilePath))
      await rename(partialFilePath, filePath)
      await this._installDownloadedUpdate({ appImagePath, filePath, installType: this._toInstallType() })

      return { filePath, outcome: this._toDownloadOutcome() }
    } catch (error) {
      await rm(partialFilePath, { force: true }).catch(() => {
        return undefined
      })

      this._setDownloadStatus({
        ...this._downloadStatus,
        errorMessage: this._toErrorMessage({ error }),
        state: 'error',
      })

      throw error
    }
  }

  protected async _installAppImageUpdate(params: { filePath: string }): Promise<void> {
    const { filePath } = params

    this._setDownloadStatus({ ...this._downloadStatus, state: 'installing' })
    await chmod(filePath, 0o755)
    this._setDownloadStatus({ ...this._downloadStatus, state: 'restart-required' })
  }

  protected async _installDebUpdate(params: { filePath: string }): Promise<void> {
    const { filePath } = params

    this._setDownloadStatus({ ...this._downloadStatus, state: 'installing' })

    const installResult = await this._toDebInstallResult({ filePath })
    const outcome = versionUtil.toDebInstallOutcome({
      exitCode: installResult.exitCode,
      isSpawnFailed: installResult.isSpawnFailed,
    })

    if (outcome === 'installed') {
      this._setDownloadStatus({ ...this._downloadStatus, state: 'restart-required' })

      return
    }

    if (outcome === 'fallback') {
      await shell.openPath(filePath)
      this._setDownloadStatus({ ...this._downloadStatus, state: 'completed' })

      return
    }

    throw new Error(`Update install failed (dpkg exit ${String(installResult.exitCode)}): ${installResult.stderrTail}`)
  }

  protected async _installDownloadedUpdate(params: {
    appImagePath: string | null
    filePath: string
    installType: UpdateInstallType
  }): Promise<void> {
    const { appImagePath, filePath, installType } = params

    if (installType === 'deb') {
      await this._installDebUpdate({ filePath })

      return
    }

    if (appImagePath !== null) {
      await this._installAppImageUpdate({ filePath })

      return
    }

    await shell.openPath(filePath)
    this._setDownloadStatus({ ...this._downloadStatus, state: 'completed' })
  }

  protected async _fetchLatestRelease(): Promise<GithubReleaseResponse> {
    const response = await fetch(constant().update.latestReleaseApiUrl, {
      headers: this._toGitHubHeaders(),
      signal: AbortSignal.timeout(constant().update.checkTimeoutMs),
    })

    if (!response.ok) {
      throw this._toResponseFailure({ response })
    }

    try {
      return (await response.json()) as GithubReleaseResponse
    } catch {
      throw new UpdateCheckFailure({
        kind: UpdateErrorKind.INVALID_RESPONSE,
        message: 'GitHub release response is not valid JSON',
      })
    }
  }

  protected _isTimeoutError(params: { error: unknown }): boolean {
    const { error } = params

    return error instanceof Error && error.name === 'TimeoutError'
  }

  protected async _isWritableAppImageDir(params: { appImagePath: string }): Promise<boolean> {
    const { appImagePath } = params

    try {
      await access(dirname(appImagePath), constants.W_OK)

      return true
    } catch {
      return false
    }
  }

  protected _runCommand(params: {
    args: string[]
    command: string
  }): Promise<{ code: number | null; stderrTail: string }> {
    const { args, command } = params

    return new Promise((resolve, reject) => {
      const childProcess = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
      const stderrChunks: Buffer[] = []

      childProcess.stderr.on('data', (chunk: Buffer) => {
        stderrChunks.push(chunk)
      })

      childProcess.on('error', (error: Error) => {
        reject(error)
      })

      childProcess.on('close', (code: number | null) => {
        const stderrTail = Buffer.concat(stderrChunks).toString('utf8').slice(-STDERR_TAIL_MAX_LENGTH)

        resolve({ code, stderrTail })
      })
    })
  }

  protected _setDownloadStatus(progress: UpdateDownloadProgress): void {
    this._downloadStatus = progress
    this._downloadListeners.forEach((cb) => {
      cb(progress)
    })
  }

  protected _setStatus(status: UpdateStatus): void {
    this._status = status
    this._listeners.forEach((cb) => {
      cb(status)
    })
  }

  protected _toAppImagePath(): string | null {
    return process.env.APPIMAGE ?? null
  }

  protected _toBusyStatusMessage(params: { state: UpdateDownloadStatus }): string | null {
    const { state } = params

    switch (state) {
      case 'downloading': {
        return 'Update download already in progress'
      }
      case 'installing': {
        return 'Update install already in progress'
      }
      case 'restart-required': {
        return 'Update already installed — restart to finish'
      }
      default: {
        return null
      }
    }
  }

  protected _toContentLength(params: { response: Response }): number {
    const { response } = params
    const contentLength = Number.parseInt(response.headers.get('content-length') ?? '', 10)

    if (Number.isNaN(contentLength)) {
      return 0
    }

    return contentLength
  }

  protected async _toDebInstallResult(params: {
    filePath: string
  }): Promise<{ exitCode: number | null; isSpawnFailed: boolean; stderrTail: string }> {
    const { filePath } = params

    try {
      const commandResult = await this._runCommand({ args: ['dpkg', '-i', filePath], command: 'pkexec' })

      return {
        exitCode: commandResult.code,
        isSpawnFailed: false,
        stderrTail: commandResult.stderrTail,
      }
    } catch {
      return { exitCode: null, isSpawnFailed: true, stderrTail: '' }
    }
  }

  protected _toDownloadFilePath(params: { asset: UpdateAsset }): string {
    const { asset } = params
    const fileName = basename(asset.name)

    if (fileName === '' || fileName === '.' || fileName === '..') {
      throw new Error('Update asset has an invalid file name')
    }

    return join(app.getPath('downloads'), fileName)
  }

  protected _toDownloadOutcome(): 'installer-opened' | 'restart-required' {
    if (this._downloadStatus.state === 'restart-required') {
      return 'restart-required'
    }

    return 'installer-opened'
  }

  protected _toDownloadTargetFilePath(params: { appImagePath: string | null; asset: UpdateAsset }): string {
    const { appImagePath, asset } = params

    if (appImagePath !== null) {
      return appImagePath
    }

    return this._toDownloadFilePath({ asset })
  }

  protected _toErrorMessage(params: { error: unknown }): string {
    const { error } = params

    if (error instanceof Error) {
      return error.message
    }

    return String(error)
  }

  protected _toFailure(params: { error: unknown }): UpdateCheckFailure {
    const { error } = params

    if (error instanceof UpdateCheckFailure) {
      return error
    }
    if (this._isTimeoutError({ error })) {
      return new UpdateCheckFailure({
        kind: UpdateErrorKind.TIMEOUT,
        message: `GitHub release check timed out after ${String(constant().update.checkTimeoutMs)}ms`,
      })
    }
    if (error instanceof TypeError) {
      return new UpdateCheckFailure({ kind: UpdateErrorKind.NETWORK, message: 'GitHub release check request failed' })
    }

    return new UpdateCheckFailure({ kind: UpdateErrorKind.UNKNOWN, message: this._toErrorMessage({ error }) })
  }

  protected _toFailurePayload(params: { failure: UpdateCheckFailure }): UpdateCheckError {
    const { failure } = params

    return {
      kind: failure.kind,
      message: failure.message,
      rateLimitResetAt: failure.rateLimitResetAt,
      statusCode: failure.statusCode,
    }
  }

  protected _toGitHubHeaders(): Headers {
    const headers = new Headers()

    headers.append('Accept', 'application/vnd.github+json')
    headers.append('User-Agent', `${constant().projectName}/${constant().projectVersion}`)

    return headers
  }

  protected _toInstallType(): UpdateInstallType {
    return versionUtil.toInstallType({
      appImagePath: this._toAppImagePath(),
      isPackaged: app.isPackaged,
      platform: process.platform,
    })
  }

  protected _toLatestVersion(params: { tagName: string }): string | null {
    const latestVersion = versionUtil.normalizeVersion({ version: params.tagName })
    if (latestVersion === '') {
      return null
    }

    return latestVersion
  }

  protected _toRateLimitResetAt(params: { response: Response }): number | null {
    const { response } = params
    const resetHeaderValue = response.headers.get('x-ratelimit-reset')

    if (resetHeaderValue === null || resetHeaderValue === '') {
      return null
    }
    const resetAt = Number(resetHeaderValue)
    if (Number.isNaN(resetAt)) {
      return null
    }

    return resetAt
  }

  protected _toProgressReadable(params: { response: Response }): Readable {
    const { response } = params

    if (response.body === null) {
      throw new Error('Update download returned no content')
    }

    const readable = Readable.fromWeb(response.body)

    readable.on('data', (chunk: Buffer) => {
      this._addReceivedBytes({ bytes: chunk.length })
    })

    return readable
  }

  protected _toResponseFailure(params: { response: Response }): UpdateCheckFailure {
    const { response } = params
    const statusCode = response.status

    if (statusCode === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
      return new UpdateCheckFailure({
        kind: UpdateErrorKind.RATE_LIMITED,
        message: 'GitHub API rate limit exceeded',
        rateLimitResetAt: this._toRateLimitResetAt({ response }),
        statusCode,
      })
    }
    if (statusCode === 404) {
      return new UpdateCheckFailure({
        kind: UpdateErrorKind.HTTP_ERROR,
        message: 'GitHub release check found no release',
        statusCode,
      })
    }

    return new UpdateCheckFailure({
      kind: UpdateErrorKind.HTTP_ERROR,
      message: `GitHub release check failed with status ${String(statusCode)}`,
      statusCode,
    })
  }

  protected async _toSelfUpdatableAppImagePath(): Promise<string | null> {
    const appImagePath = this._toAppImagePath()

    if (appImagePath === null) {
      return null
    }

    const isWritable = await this._isWritableAppImageDir({ appImagePath })

    if (!isWritable) {
      return null
    }

    return appImagePath
  }

  protected _toUpdateAssets(params: { release: GithubReleaseResponse }): UpdateAsset[] {
    const { release } = params

    return (release.assets ?? []).reduce<UpdateAsset[]>((assets, asset) => {
      if (typeof asset.name !== 'string' || typeof asset.browser_download_url !== 'string') {
        return assets
      }

      return [...assets, { name: asset.name, sizeBytes: asset.size ?? 0, url: asset.browser_download_url }]
    }, [])
  }

  protected _toUpdateState(params: { currentVersion: string; latestVersion: string | null }): UpdateCheckState {
    const { currentVersion, latestVersion } = params
    if (latestVersion === null) {
      return 'upToDate'
    }
    if (versionUtil.isNewerVersion({ candidate: latestVersion, current: currentVersion })) {
      return 'updateAvailable'
    }

    return 'upToDate'
  }

  protected _toUpdateStatus(params: { release: GithubReleaseResponse }): UpdateStatus {
    const { release } = params
    const latestVersion = this._toLatestVersion({ tagName: release.tag_name ?? '' })
    const currentVersion = constant().projectVersion

    return {
      asset: versionUtil.selectUpdateAsset({
        assets: this._toUpdateAssets({ release }),
        installType: this._toInstallType(),
      }),
      currentVersion,
      error: null,
      latestVersion,
      releaseUrl: release.html_url ?? '',
      state: this._toUpdateState({ currentVersion, latestVersion }),
    }
  }
}

export const updateServiceSingleton = singletonPattern(() => {
  return new UpdateService()
})
