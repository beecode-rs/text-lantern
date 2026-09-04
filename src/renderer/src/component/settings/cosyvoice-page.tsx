import { AlertTriangle, Cpu, Download, Mic, RefreshCw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { api } from '#src/renderer/src/api'
import { type ProviderPageProps } from '#src/renderer/src/component/settings/provider-page-registry'
import { ConfirmDialog } from '#src/renderer/src/component/ui/confirm-dialog'
import { StarBadge } from '#src/renderer/src/component/ui/star-badge'
import { cosyvoiceArtifactUtil } from '#src/renderer/src/lib/cosyvoice-artifact'
import { formatSingleton } from '#src/renderer/src/lib/format'
import { useModelsStore } from '#src/renderer/src/store/models'
import { languageCatalogSingleton } from '#src/shared/language/language-catalog'
import type { CosyvoiceModelVariant, VoiceDownload } from '#src/shared/types'

const ENGINE_SIZE_LABEL = '~34 MB'
const FRONTEND_SIZE_LABEL = '~253 MB'
const MAX_LOG_LINES = 200
const RECOMMENDED_MODEL_FILE_NAME = 'CosyVoice3-2512_Q8_0.gguf'

export function CosyvoicePage(_props: ProviderPageProps): React.JSX.Element {
  const { download, downloads, load } = useModelsStore()

  const [isSupported, setIsSupported] = useState<boolean | null>(null)
  const [isEngineInstalled, setIsEngineInstalled] = useState(false)
  const [isFrontendInstalled, setIsFrontendInstalled] = useState(false)
  const [modelVariants, setModelVariants] = useState<CosyvoiceModelVariant[]>([])
  const [logLines, setLogLines] = useState<string[]>([])
  const [voiceName, setVoiceName] = useState('')
  const [langCode, setLangCode] = useState('en')
  const [transcript, setTranscript] = useState('')
  const [isCreatingVoice, setIsCreatingVoice] = useState(false)
  const [isUninstallPending, setIsUninstallPending] = useState(false)
  const [pendingDeleteModelFileName, setPendingDeleteModelFileName] = useState<string | null>(null)

  useEffect(() => {
    void api.isCosyvoiceSupported().then((supported) => {
      setIsSupported(supported)
      void refreshArtifacts()
    })
  }, [])

  useEffect(() => {
    const offLog = api.onModelsLog((line) => {
      appendLog(line)
    })

    return offLog
  }, [])

  const isVoiceFormComplete = voiceName.trim() !== '' && transcript.trim() !== ''

  if (isSupported === null) {
    return <></>
  }

  if (!isSupported) {
    return getUnsupportedSection()
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text/55">
        CosyVoice voices are cloned from reference audio and synthesized on-device by the cosyvoice.cpp engine.
      </p>

      {getEngineSection()}

      {getModelSection()}

      {getCreateVoiceSection()}

      {getLogSection()}

      {isUninstallPending && (
        <ConfirmDialog
          title="Uninstall engine"
          message="Uninstall the CosyVoice engine? Your cloned voices and downloaded models stay on disk but cannot be used until you reinstall the engine. This cannot be undone."
          confirmLabel="Uninstall"
          onCancel={() => {
            setIsUninstallPending(false)
          }}
          onConfirm={() => {
            setIsUninstallPending(false)
            uninstallEngine()
          }}
        />
      )}

      {pendingDeleteModelFileName !== null && (
        <ConfirmDialog
          title="Delete model"
          message={`Delete "${pendingDeleteModelFileName}" from your device? CosyVoice voices stop working until you download a model again. This cannot be undone.`}
          confirmLabel="Delete"
          onCancel={() => {
            setPendingDeleteModelFileName(null)
          }}
          onConfirm={() => {
            deleteModel(pendingDeleteModelFileName)
            setPendingDeleteModelFileName(null)
          }}
        />
      )}
    </div>
  )

  function refreshArtifacts(): Promise<void> {
    const refreshed = Promise.all([
      api.isCosyvoiceEngineInstalled(),
      api.getCosyvoiceModelVariants(),
      api.isCosyvoiceFrontendInstalled(),
    ]).then(([isEngineInstalled, modelVariants, isFrontendInstalled]) => {
      setIsEngineInstalled(isEngineInstalled)
      setModelVariants(modelVariants)
      setIsFrontendInstalled(isFrontendInstalled)
    })

    return refreshed
  }

  function appendLog(line: string): void {
    setLogLines((prev) => {
      return [...prev, line].slice(-MAX_LOG_LINES)
    })
  }

  function installArtifact(id: string): void {
    void download(id).then(() => {
      void refreshArtifacts()
    })
  }

  function uninstallEngine(): void {
    void api.uninstallCosyvoiceEngine().then(() => {
      void refreshArtifacts()
    })
  }

  function deleteModel(fileName: string): void {
    void api.deleteCosyvoiceModel(fileName).then((modelVariants) => {
      setModelVariants(modelVariants)
    })
  }

  function createVoice(): void {
    setIsCreatingVoice(true)
    void api
      .createCosyvoiceVoice({ lang: langCode, name: voiceName, promptText: transcript })
      .then(() => {
        setIsCreatingVoice(false)
        void load()
      })
      .catch((err: unknown) => {
        setIsCreatingVoice(false)
        appendLog(`Voice creation failed: ${String(err)}`)
      })
  }

  function isDownloading(params: { entry: VoiceDownload | undefined }): boolean {
    return params.entry?.state === 'downloading'
  }

  function getUnsupportedSection(): React.JSX.Element {
    return (
      <section className="rounded-xl border border-mid-gray/25 bg-mid-gray/5 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-text/50 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">CosyVoice requires an Apple Silicon Mac</p>
            <p className="text-xs text-text/60 mt-1">
              The CosyVoice engine is built for Apple Silicon (M-series) Macs, so it is unavailable on this device.
              Piper and Kokoro voices work everywhere.
            </p>
          </div>
        </div>
      </section>
    )
  }

  function getEngineSection(): React.JSX.Element {
    const entry = downloads[cosyvoiceArtifactUtil.engineDownloadId()]

    if (!isEngineInstalled) {
      return (
        <section className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">CosyVoice engine not installed</p>
              <p className="text-xs text-text/60 mt-1">
                The cosyvoice.cpp engine ({ENGINE_SIZE_LABEL}) runs locally and powers every CosyVoice voice.
              </p>
              <button
                type="button"
                disabled={isDownloading({ entry })}
                onClick={() => {
                  installArtifact(cosyvoiceArtifactUtil.engineDownloadId())
                }}
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-logo-primary text-logo-stroke disabled:opacity-60"
              >
                {getDownloadIcon({ isBusy: isDownloading({ entry }) })}
                {getEngineButtonLabel({ isBusy: isDownloading({ entry }) })}
              </button>
              {getProgressBar({ entry })}
              {getErrorLine({ entry })}
            </div>
          </div>
        </section>
      )
    }

    return (
      <section className="rounded-xl border border-mid-gray/25 bg-mid-gray/5 p-4">
        <div className="flex items-start gap-3">
          <Cpu size={18} className="text-text/50 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Engine installed</p>
            <p className="text-xs text-text/60 mt-1">
              cosyvoice.cpp runs locally on this Mac and synthesizes every CosyVoice voice.
            </p>
            <button
              type="button"
              onClick={() => {
                setIsUninstallPending(true)
              }}
              className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={13} />
              Uninstall engine
            </button>
            {getProgressBar({ entry })}
            {getErrorLine({ entry })}
          </div>
        </div>
      </section>
    )
  }

  function getModelSection(): React.JSX.Element {
    return (
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-text/60 px-1">Model</h2>
        <p className="text-xs text-text/55 px-1">
          One model file powers every CosyVoice voice. Download it once — the recommended variant sounds best.
        </p>
        {modelVariants.map((variant) => {
          return getModelRow({ variant })
        })}
      </section>
    )
  }

  function getModelRow(params: { variant: CosyvoiceModelVariant }): React.JSX.Element {
    const entry = downloads[cosyvoiceArtifactUtil.modelDownloadId({ fileName: params.variant.fileName })]
    const isRowDownloading = isDownloading({ entry })

    return (
      <div className="flex items-center gap-3 px-4 py-3 border border-mid-gray/25 rounded-xl bg-mid-gray/5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <code className="text-xs font-medium text-text/85 truncate selectable">{params.variant.fileName}</code>
            {params.variant.fileName === RECOMMENDED_MODEL_FILE_NAME && <StarBadge>recommended</StarBadge>}
            {params.variant.isDownloaded && <StarBadge>installed</StarBadge>}
          </div>
          <div className="text-xs text-text/55 mt-0.5">{formatSingleton().formatBytes(params.variant.sizeBytes)}</div>
          {getProgressBar({ entry })}
          {getErrorLine({ entry })}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {getModelRowActions({ isRowDownloading, variant: params.variant })}
        </div>
      </div>
    )
  }

  function getModelRowActions(params: {
    isRowDownloading: boolean
    variant: CosyvoiceModelVariant
  }): React.JSX.Element {
    if (params.variant.isDownloaded) {
      return (
        <button
          type="button"
          title="Delete model"
          disabled={params.isRowDownloading}
          onClick={() => {
            setPendingDeleteModelFileName(params.variant.fileName)
          }}
          className="p-1.5 rounded-md text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-colors disabled:opacity-50"
        >
          <Trash2 size={15} />
        </button>
      )
    }

    return (
      <button
        type="button"
        disabled={params.isRowDownloading}
        onClick={() => {
          installArtifact(cosyvoiceArtifactUtil.modelDownloadId({ fileName: params.variant.fileName }))
        }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-logo-primary text-logo-stroke disabled:opacity-50"
      >
        <Download size={13} />
        {getModelDownloadLabel({ isBusy: params.isRowDownloading, variant: params.variant })}
      </button>
    )
  }

  function getCreateVoiceSection(): React.JSX.Element {
    return (
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-text/60 px-1">Create a voice (cloning)</h2>
        <p className="text-xs text-text/55 px-1">
          Voices are cloned from reference audio — a clean 5–10 second recording of one person speaking.
        </p>
        {getCreateVoiceBody()}
      </section>
    )
  }

  function getCreateVoiceBody(): React.JSX.Element {
    if (!isEngineInstalled) {
      return (
        <p className="text-xs text-text/55 px-1">
          Install the CosyVoice engine above first — cloning uses it to build each voice.
        </p>
      )
    }

    if (!isFrontendInstalled) {
      return getFrontendGate()
    }

    return getVoiceForm()
  }

  function getFrontendGate(): React.JSX.Element {
    const entry = downloads[cosyvoiceArtifactUtil.frontendDownloadId()]

    return (
      <div className="rounded-xl border border-mid-gray/25 bg-mid-gray/5 p-4">
        <p className="text-sm font-medium">Voice-creation frontend required</p>
        <p className="text-xs text-text/60 mt-1">
          Cloning needs extra frontend models ({FRONTEND_SIZE_LABEL}) used only when creating voices. Nothing is
          downloaded until you click.
        </p>
        <button
          type="button"
          disabled={isDownloading({ entry })}
          onClick={() => {
            installArtifact(cosyvoiceArtifactUtil.frontendDownloadId())
          }}
          className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-logo-primary text-logo-stroke disabled:opacity-60"
        >
          {getDownloadIcon({ isBusy: isDownloading({ entry }) })}
          {getFrontendDownloadLabel({ isBusy: isDownloading({ entry }) })}
        </button>
        {getProgressBar({ entry })}
        {getErrorLine({ entry })}
      </div>
    )
  }

  function getVoiceForm(): React.JSX.Element {
    return (
      <div className="rounded-xl border border-mid-gray/25 bg-mid-gray/5 p-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-text/55">Voice name</span>
          <input
            type="text"
            value={voiceName}
            onChange={(e) => {
              setVoiceName(e.target.value)
            }}
            placeholder="e.g. Nora"
            className="px-3 py-1.5 text-sm rounded-lg border border-mid-gray/40 bg-mid-gray/10 placeholder:text-text/40 focus:outline-none focus:ring-1 focus:ring-logo-primary"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-text/55">Language</span>
          <select
            value={langCode}
            onChange={(e) => {
              setLangCode(e.target.value)
            }}
            className="px-2 py-1.5 text-sm rounded-lg border border-mid-gray/40 bg-mid-gray/10 hover:bg-mid-gray/20 transition-colors"
          >
            {languageCatalogSingleton()
              .list()
              .map((language) => {
                return (
                  <option key={language.code} value={language.code}>
                    {language.name}
                  </option>
                )
              })}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-text/55">Transcript of the reference audio</span>
          <textarea
            value={transcript}
            onChange={(e) => {
              setTranscript(e.target.value)
            }}
            rows={3}
            placeholder="Type exactly what is said in the recording — the transcript must match the audio."
            className="px-3 py-2 text-sm rounded-lg border border-mid-gray/40 bg-mid-gray/10 placeholder:text-text/40 focus:outline-none focus:ring-1 focus:ring-logo-primary resize-none"
          />
        </label>
        <div>
          <button
            type="button"
            disabled={!isVoiceFormComplete || isCreatingVoice}
            onClick={createVoice}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-logo-primary text-logo-stroke disabled:opacity-60"
          >
            {getCreateButtonIcon({ isBusy: isCreatingVoice })}
            {getCreateButtonLabel({ isBusy: isCreatingVoice })}
          </button>
          <p className="text-xs text-text/50 mt-2">
            Creating a voice opens a file picker for the reference audio — cancelling it changes nothing.
          </p>
        </div>
      </div>
    )
  }

  function getLogSection(): React.JSX.Element | null {
    if (logLines.length === 0) {
      return null
    }

    return (
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-text/60 px-1">Log</h2>
        <pre className="selectable text-[11px] leading-relaxed text-text/65 bg-mid-gray/10 rounded-lg p-2 max-h-40 overflow-auto whitespace-pre-wrap">
          {logLines.join('\n')}
        </pre>
      </section>
    )
  }

  function getProgressBar(params: { entry: VoiceDownload | undefined }): React.JSX.Element | null {
    if (params.entry?.state !== 'downloading') {
      return null
    }
    const pct = Math.round(params.entry.progress * 100)

    return (
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-mid-gray/25 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-logo-primary to-accent transition-[width] duration-150"
            style={{ width: `${String(pct)}%` }}
          />
        </div>
        <span className="tabular-nums text-xs text-text/60 w-9 text-right">{pct}%</span>
      </div>
    )
  }

  function getErrorLine(params: { entry: VoiceDownload | undefined }): React.JSX.Element | null {
    if (params.entry?.state !== 'error') {
      return null
    }

    return <p className="mt-2 text-xs text-red-500">Download failed — try again.</p>
  }

  function getDownloadIcon(params: { isBusy: boolean }): React.JSX.Element {
    if (params.isBusy) {
      return <RefreshCw size={13} className="animate-spin" />
    }

    return <Download size={13} />
  }

  function getCreateButtonIcon(params: { isBusy: boolean }): React.JSX.Element {
    if (params.isBusy) {
      return <RefreshCw size={14} className="animate-spin" />
    }

    return <Mic size={14} />
  }

  function getEngineButtonLabel(params: { isBusy: boolean }): string {
    if (params.isBusy) {
      return 'Installing…'
    }

    return `Install engine (${ENGINE_SIZE_LABEL})`
  }

  function getFrontendDownloadLabel(params: { isBusy: boolean }): string {
    if (params.isBusy) {
      return 'Downloading…'
    }

    return `Download frontend (${FRONTEND_SIZE_LABEL})`
  }

  function getModelDownloadLabel(params: { isBusy: boolean; variant: CosyvoiceModelVariant }): string {
    if (params.isBusy) {
      return 'Downloading…'
    }

    return `Download · ${formatSingleton().formatBytes(params.variant.sizeBytes)}`
  }

  function getCreateButtonLabel(params: { isBusy: boolean }): string {
    if (params.isBusy) {
      return 'Creating…'
    }

    return 'Choose audio & create'
  }
}
