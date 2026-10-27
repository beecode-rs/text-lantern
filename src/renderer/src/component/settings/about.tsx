import { Download, RefreshCw, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'

import { api } from '#src/renderer/src/api'
import iconUrl from '#src/renderer/src/asset/icon.png'
import { SettingsPage } from '#src/renderer/src/component/ui/settings-page'
import { type UpdateFlowState, useUpdateStore } from '#src/renderer/src/store/update'
import { languageCatalogSingleton } from '#src/shared/language/language-catalog'
import {
  type Settings,
  type UpdateCheckError,
  type UpdateDownloadResult,
  UpdateErrorKind,
  type UpdateStatus,
} from '#src/shared/types'

const credits = [
  { label: 'Piper TTS engine (piper-tts, GPL-3.0)', url: 'https://github.com/OHF-voice/piper1-gpl' },
  { label: 'rhasspy/piper-voices (English + more)', url: 'https://huggingface.co/rhasspy/piper-voices' },
  {
    label: 'phantom9623/piper-serbian-tts (Serbian voice)',
    url: 'https://huggingface.co/phantom9623/piper-serbian-tts',
  },
  { label: 'eSpeak NG (phonemization)', url: 'https://github.com/espeak-ng/espeak-ng' },
  { label: 'Kokoro TTS engine (kokoro-js, Apache-2.0)', url: 'https://github.com/hexgrad/kokoro-js' },
  {
    label: 'onnx-community/Kokoro-82M (English voices)',
    url: 'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX',
  },
  { label: 'tinyld (language auto-detection)', url: 'https://github.com/komodojp/tinyld' },
  { label: 'Handy — the dictation app that inspired this app', url: 'https://handy.computer' },
]

const rateLimitResetFormatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
})

export function AboutSettings(): React.JSX.Element {
  const [settings, setSettings] = useState<Settings | null>(null)
  const downloadError = useUpdateStore((s) => s.downloadError)
  const downloadPercent = useUpdateStore((s) => s.downloadPercent)
  const downloadResult = useUpdateStore((s) => s.downloadResult)
  const downloadState = useUpdateStore((s) => s.downloadState)
  const status = useUpdateStore((s) => s.status)
  const check = useUpdateStore((s) => s.check)
  const download = useUpdateStore((s) => s.download)
  const init = useUpdateStore((s) => s.init)
  const restart = useUpdateStore((s) => s.restart)

  useEffect(() => {
    void api.getSettings().then(setSettings)
    init()
  }, [])

  const bindingList = getBindingList({ settings })
  const isChecking = status !== null && status.state === 'checking'
  const isUpdateBusy = downloadState === 'downloading' || downloadState === 'installing'

  return (
    <SettingsPage>
      <header>
        <h1 className="text-xl font-semibold">About</h1>
        <p className="text-sm text-text/55 mt-1">On-device text-to-speech, inspired by Handy.</p>
      </header>

      <section className="rounded-xl border border-mid-gray/25 bg-mid-gray/5 p-5 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <img src={iconUrl} alt="" className="h-10 w-10 rounded-xl" draggable={false} />
          <div>
            <div className="text-base font-semibold">Text Lantern</div>
            <div className="text-xs text-text/55">{getVersionLabel({ status })}</div>
          </div>
        </div>
        <p className="text-sm text-text/70 leading-relaxed">
          Press a global shortcut to read the selected text aloud with neural Piper and Kokoro voices. Everything runs
          on your device — nothing is sent anywhere. Language is auto-detected from the text or chosen via a
          per-language shortcut.
        </p>
        <a
          className="text-sm text-logo-primary hover:underline"
          href="https://github.com/beecode-rs/text-lantern"
          rel="noreferrer"
          target="_blank"
        >
          GitHub
        </a>
        {bindingList}
      </section>

      <section className="rounded-xl border border-mid-gray/25 bg-mid-gray/5 p-5 flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Updates</h2>
        <p className="text-xs text-text/55 leading-relaxed">{getUpdateStatusLabel({ status })}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isChecking || isUpdateBusy}
            onClick={() => {
              void check()
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-mid-gray/40 bg-mid-gray/10 disabled:opacity-60"
          >
            <RefreshCw size={14} />
            {getCheckButtonLabel({ isChecking })}
          </button>
          {getDownloadButton({ download, downloadPercent, downloadResult, downloadState, restart, status })}
        </div>
        {getDownloadOutcome({ downloadError, downloadResult })}
      </section>

      <section className="rounded-xl border border-mid-gray/25 bg-mid-gray/5 p-5 flex flex-col gap-2 text-sm">
        <h2 className="text-sm font-semibold mb-1">Credits</h2>
        {credits.map((credit) => {
          return (
            <a
              key={credit.url}
              className="text-logo-primary hover:underline"
              href={credit.url}
              rel="noreferrer"
              target="_blank"
            >
              {credit.label}
            </a>
          )
        })}
      </section>
    </SettingsPage>
  )

  function getBindingList(params: { settings: Settings | null }): React.JSX.Element | null {
    if (!params.settings || params.settings.languageBindings.length === 0) {
      return null
    }

    return (
      <div className="text-xs text-text/55 mt-1">
        {params.settings.languageBindings.map((binding, index) => {
          return (
            <span key={binding.id}>
              {getSeparator({ index })}
              {languageCatalogSingleton().getDisplayName({ code: binding.langCode })}:{' '}
              <span className="selectable">{binding.voice}</span>
            </span>
          )
        })}
      </div>
    )
  }

  function getCheckButtonLabel(params: { isChecking: boolean }): string {
    if (params.isChecking) {
      return 'Checking…'
    }

    return 'Check for updates'
  }

  function getDownloadButton(params: {
    download: () => Promise<void>
    downloadPercent: number | null
    downloadResult: UpdateDownloadResult | null
    downloadState: UpdateFlowState
    restart: () => void
    status: UpdateStatus | null
  }): React.JSX.Element | null {
    if (params.status?.state !== 'updateAvailable') {
      return null
    }

    const isRestartRequired = params.downloadState === 'restart-required'
    const isUpdateBusy = params.downloadState === 'downloading' || params.downloadState === 'installing'
    const handleDownloadClick = (): void => {
      if (isRestartRequired) {
        params.restart()

        return
      }

      void params.download()
    }

    return (
      <button
        type="button"
        disabled={isUpdateBusy}
        onClick={handleDownloadClick}
        title={getDownloadButtonTitle({
          currentVersion: params.status.currentVersion,
          downloadedFilePath: params.downloadResult?.filePath ?? null,
          downloadState: params.downloadState,
          latestVersion: params.status.latestVersion ?? '',
        })}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-logo-primary text-logo-stroke disabled:opacity-60"
      >
        {getDownloadButtonIcon({ isRestartRequired })}
        {getDownloadButtonLabel({
          downloadPercent: params.downloadPercent,
          downloadState: params.downloadState,
          status: params.status,
        })}
      </button>
    )
  }

  function getDownloadButtonIcon(params: { isRestartRequired: boolean }): React.JSX.Element {
    if (params.isRestartRequired) {
      return <RotateCcw size={14} />
    }

    return <Download size={14} />
  }

  function getDownloadButtonLabel(params: {
    downloadPercent: number | null
    downloadState: UpdateFlowState
    status: UpdateStatus
  }): string {
    if (params.downloadState === 'downloading') {
      if (params.downloadPercent === null) {
        return 'Downloading…'
      }

      return `Downloading… ${String(params.downloadPercent)}%`
    }
    if (params.downloadState === 'installing') {
      return 'Installing…'
    }
    if (params.downloadState === 'restart-required') {
      return 'Restart to finish update'
    }
    if (params.downloadState === 'downloaded') {
      return 'Opened installer'
    }
    if (params.status.asset === null) {
      return 'View release page'
    }

    return `Download v${params.status.latestVersion ?? ''}`
  }

  function getDownloadButtonTitle(params: {
    currentVersion: string
    downloadedFilePath: string | null
    downloadState: UpdateFlowState
    latestVersion: string
  }): string {
    if (params.downloadState === 'restart-required') {
      return 'Update installed — restart to finish'
    }
    if (params.downloadState === 'installing') {
      return 'Installing the downloaded update…'
    }
    if (params.downloadedFilePath !== null) {
      return `Installer saved to ${params.downloadedFilePath}`
    }

    return `Version ${params.latestVersion} available (current ${params.currentVersion})`
  }

  function getDownloadOutcome(params: {
    downloadError: string | null
    downloadResult: UpdateDownloadResult | null
  }): React.JSX.Element | null {
    if (params.downloadError !== null) {
      return <p className="text-xs text-red-500 leading-relaxed">Download failed: {params.downloadError}</p>
    }
    if (params.downloadResult === null) {
      return null
    }
    if (params.downloadResult.outcome === 'restart-required') {
      return (
        <p className="text-xs text-text/55 leading-relaxed">Update installed — restart the app to finish updating.</p>
      )
    }
    if (params.downloadResult.outcome === 'installer-opened') {
      return (
        <p className="text-xs text-text/55 leading-relaxed">Installer saved and opened from your Downloads folder.</p>
      )
    }

    return <p className="text-xs text-text/55 leading-relaxed">Opened the release page in your browser.</p>
  }

  function getSeparator(params: { index: number }): string {
    if (params.index > 0) {
      return ' · '
    }

    return ''
  }

  function getUpdateStatusLabel(params: { status: UpdateStatus | null }): string {
    const status = params.status
    if (status === null || status.state === 'idle') {
      return 'Not checked yet.'
    }
    if (status.state === 'checking') {
      return 'Checking for updates…'
    }
    if (status.state === 'upToDate') {
      return `You're on the latest version (v${status.currentVersion}).`
    }
    if (status.state === 'error') {
      return `Update check failed: ${getUpdateErrorMessage({ error: status.error })}`
    }

    return `Version ${status.latestVersion ?? ''} is available.`
  }

  function getUpdateErrorMessage(params: { error: UpdateCheckError | null }): string {
    if (params.error === null) {
      return 'The update check could not be completed.'
    }
    switch (params.error.kind) {
      case UpdateErrorKind.HTTP_ERROR: {
        return getHttpErrorMessage({ error: params.error })
      }
      case UpdateErrorKind.INVALID_RESPONSE: {
        return 'GitHub returned a response we could not read'
      }
      case UpdateErrorKind.NETWORK: {
        return 'Network error — check your connection'
      }
      case UpdateErrorKind.RATE_LIMITED: {
        return getRateLimitMessage({ error: params.error })
      }
      case UpdateErrorKind.TIMEOUT: {
        return 'Request timed out'
      }
      case UpdateErrorKind.UNKNOWN: {
        return 'Something went wrong while checking for updates'
      }
      default: {
        const exhaustive: never = params.error.kind
        throw new Error(`Unknown update error kind: ${String(exhaustive)}`)
      }
    }
  }

  function getHttpErrorMessage(params: { error: UpdateCheckError }): string {
    if (params.error.statusCode === 404) {
      return 'No GitHub release published yet for this project'
    }
    if (params.error.statusCode === null) {
      return 'GitHub responded with an error'
    }

    return `GitHub responded with an error (HTTP ${String(params.error.statusCode)})`
  }

  function getRateLimitMessage(params: { error: UpdateCheckError }): string {
    if (params.error.rateLimitResetAt === null) {
      return 'GitHub API rate limit exceeded — try again later'
    }

    return `GitHub API rate limit exceeded — resets at ${formatResetTime({ epochSeconds: params.error.rateLimitResetAt })}`
  }

  function formatResetTime(params: { epochSeconds: number }): string {
    return rateLimitResetFormatter.format(new Date(params.epochSeconds * 1000))
  }

  function getVersionLabel(params: { status: UpdateStatus | null }): string {
    if (params.status === null) {
      return 'Version —'
    }

    return `Version ${params.status.currentVersion}`
  }
}
