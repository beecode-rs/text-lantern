import { Download, FolderOpen, Info } from 'lucide-react'
import { useState } from 'react'

import { api } from '#src/renderer/src/api'
import { useModelsStore } from '#src/renderer/src/store/models'
import { voiceUrlParser } from '#src/shared/voice/voice-url'

export function DownloadTabManual(): React.JSX.Element {
  const { downloadFromUrl } = useModelsStore()

  const [url, setUrl] = useState('')

  const trimmedUrl = url.trim()
  const parsedUrl = voiceUrlParser.parse({ url: trimmedUrl })
  const isSubmittable = parsedUrl !== null
  const shouldShowInvalidHint = trimmedUrl.length > 0 && !isSubmittable

  const submit = (): void => {
    if (!isSubmittable) {
      return
    }
    void downloadFromUrl(trimmedUrl)
    setUrl('')
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="text-sm text-text/55 flex flex-col gap-1.5">
        <p>Download a voice from any Hugging Face repository:</p>
        <ol className="list-decimal list-inside flex flex-col gap-1 pl-1">
          <li>
            Open a Piper voice repository in your browser, e.g. <span className="selectable">rhasspy/piper-voices</span>
            .
          </li>
          <li>
            Find the voice's <code className="text-xs">.onnx</code> file and copy its link (right-click → Copy link
            address).
          </li>
          <li>
            Paste the link below — the required <code className="text-xs">.onnx.json</code> config file is downloaded
            automatically next to it.
          </li>
        </ol>
      </div>

      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              submit()
            }
          }}
          placeholder="https://huggingface.co/…/resolve/main/…/voice.onnx"
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-mid-gray/40 bg-mid-gray/10 placeholder:text-text/40 focus:outline-none focus:ring-1 focus:ring-logo-primary"
        />
        <button
          type="button"
          disabled={!isSubmittable}
          onClick={submit}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-logo-primary text-logo-stroke disabled:opacity-50"
        >
          <Download size={14} /> Download
        </button>
      </div>

      {shouldShowInvalidHint && (
        <p className="text-xs text-red-500">
          That link doesn't point to a voice file — it must end with <code>.onnx</code> or <code>.onnx.json</code>.
        </p>
      )}

      <div className="rounded-xl border border-mid-gray/30 bg-mid-gray/5 p-4">
        <div className="flex items-start gap-3">
          <Info size={18} className="text-text/40 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0 flex flex-col gap-2.5">
            <p className="text-sm font-medium">Downloading by hand</p>
            <p className="text-xs leading-relaxed text-text/60">
              A voice is a pair of files sharing one base name: <code className="text-xs">.onnx</code> (the model) and{' '}
              <code className="text-xs">.onnx.json</code> (its config). You can download both from any Hugging Face
              repository in your browser, then place them in the app's <span className="selectable">models/</span>{' '}
              folder — the voice appears under Models as soon as you return to the app.
            </p>
            <button
              type="button"
              onClick={() => {
                void api.openModelsFolder()
              }}
              className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-mid-gray/40 hover:bg-mid-gray/10"
            >
              <FolderOpen size={13} /> Open models folder
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
