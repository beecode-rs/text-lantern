import { singletonPattern } from '@beecode/msh-util/singleton/pattern'
import { app, shell } from 'electron'
import { createWriteStream } from 'node:fs'
import { rename, rm } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import { constant } from '#src/main/util/constants'
import { logger } from '#src/main/util/logger'
import {
  type UpdateAsset,
  type UpdateCheckError,
  type UpdateCheckState,
  type UpdateDownloadResult,
  UpdateErrorKind,
  type UpdateStatus,
} from '#src/shared/types'
import { versionUtil } from '#src/shared/version/version-util'

const PARTIAL_FILE_SUFFIX = '.part'

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
  protected readonly _listeners = new Set<(status: UpdateStatus) => void>()

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
    const release = await this._fetchLatestRelease()
    const status = this._toUpdateStatus({ release })
    this._setStatus(status)

    if (status.state !== 'updateAvailable') {
      throw new Error(`No update available (latest known version: ${status.latestVersion ?? 'unknown'})`)
    }
    if (status.asset === null) {
      await shell.openExternal(status.releaseUrl)

      return { didDownloadInstaller: false, filePath: null }
    }

    const filePath = await this._downloadAsset({ asset: status.asset })

    return { didDownloadInstaller: true, filePath }
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

  protected async _downloadAsset(params: { asset: UpdateAsset }): Promise<string> {
    const { asset } = params
    const filePath = this._toDownloadFilePath({ asset })
    const partialFilePath = `${filePath}${PARTIAL_FILE_SUFFIX}`

    try {
      const response = await fetch(asset.url)
      if (!response.ok) {
        throw new Error(`Update download failed with status ${String(response.status)}`)
      }
      await pipeline(this._toResponseBodyReadable({ response }), createWriteStream(partialFilePath))
      await rename(partialFilePath, filePath)
      await shell.openPath(filePath)

      return filePath
    } catch (error) {
      await rm(partialFilePath, { force: true }).catch(() => {
        return undefined
      })
      throw error
    }
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

  protected _setStatus(status: UpdateStatus): void {
    this._status = status
    this._listeners.forEach((cb) => {
      cb(status)
    })
  }

  protected _toDownloadFilePath(params: { asset: UpdateAsset }): string {
    const { asset } = params
    const fileName = basename(asset.name)

    if (fileName === '' || fileName === '.' || fileName === '..') {
      throw new Error('Update asset has an invalid file name')
    }

    return join(app.getPath('downloads'), fileName)
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

  protected _toResponseBodyReadable(params: { response: Response }): Readable {
    const { response } = params

    if (response.body === null) {
      throw new Error('Update download returned no content')
    }

    return Readable.fromWeb(response.body)
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
      asset: versionUtil.selectPlatformAsset({
        assets: this._toUpdateAssets({ release }),
        platform: process.platform,
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
