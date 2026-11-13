import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  ChevronDown,
  Columns2,
  Copy,
  Loader2,
  RefreshCw,
  Rows2,
  SpellCheck,
  Square,
  Undo2,
  Volume2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { api } from '#src/renderer/src/api'
import { DiffText, type DiffTextMode } from '#src/renderer/src/component/ui/diff-text'
import { formatSingleton } from '#src/renderer/src/lib/format'
import { useTheme } from '#src/renderer/src/lib/use-theme'
import { useGrammarStore } from '#src/renderer/src/store/grammar'
import { useSettingsStore } from '#src/renderer/src/store/settings'
import { languageCatalogSingleton } from '#src/shared/language/language-catalog'
import {
  GrammarCheckState,
  type GrammarIssue,
  type Lang,
  LlmProvider,
  TtsState,
  type TtsStatus,
} from '#src/shared/types'

const COPY_FEEDBACK_MS = 1500

const DIFF_MODE_STORAGE_KEY = 'text-lantern.grammar.diffMode'

const ISSUE_HIGHLIGHT_SCROLL_MARGIN_PX = 8

const UNKNOWN_LABEL = '-'

type CorrectedTextRange = { end: number; start: number }

type CorrectedTextMark = { end: number; isIgnored: boolean; start: number }

type CorrectedTextSegment = {
  end: number
  hasHighlight: boolean
  start: number
  underline: 'active' | 'ignored' | 'none'
}

export function GrammarReviewPage(): React.JSX.Element {
  const status = useGrammarStore((s) => s.status)
  const result = useGrammarStore((s) => s.result)
  const init = useGrammarStore((s) => s.init)
  const recheck = useGrammarStore((s) => s.recheck)
  const setIssueIgnored = useGrammarStore((s) => s.setIssueIgnored)
  const settings = useSettingsStore((s) => s.settings)
  const loadSettings = useSettingsStore((s) => s.load)
  const replaceSettings = useSettingsStore((s) => s.replace)
  const [isCopied, setIsCopied] = useState(false)
  const [draftCorrectedText, setDraftCorrectedText] = useState<string | null>(null)
  const [diffMode, setDiffMode] = useState<DiffTextMode>(() => {
    const storedMode = window.localStorage.getItem(DIFF_MODE_STORAGE_KEY)
    if (storedMode === 'split') {
      return 'split'
    }

    return 'unified'
  })
  const [expandedIssueIndexes, setExpandedIssueIndexes] = useState<Set<number>>(() => new Set())
  const [hoveredIssueIndex, setHoveredIssueIndex] = useState<number | null>(null)
  const [isTextEdited, setIsTextEdited] = useState(false)
  const [isReadRequested, setIsReadRequested] = useState(false)
  const [ttsStatus, setTtsStatus] = useState<TtsStatus>({ state: TtsState.IDLE })
  const correctedTextAreaRef = useRef<HTMLTextAreaElement | null>(null)
  const correctedTextBackdropRef = useRef<HTMLDivElement | null>(null)
  const issueHighlightRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    init()
    void loadSettings()

    const offSettings = api.onSettingsChanged(replaceSettings)
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        window.close()
      }
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      offSettings()
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [init, loadSettings, replaceSettings])

  useTheme(settings?.theme)

  useEffect(() => {
    setDraftCorrectedText(null)
    setIsTextEdited(false)
    setIsReadRequested(false)
  }, [result])

  useEffect(() => {
    // A fresh check replaces the issue list, so collapsed/expanded state must not survive it.
    // Toggling ignore/undo also swaps `result`, but keeps issue order, so it must not collapse cards.
    if (status.state === GrammarCheckState.CHECKING) {
      setExpandedIssueIndexes(new Set())
      setHoveredIssueIndex(null)
    }
  }, [status.state])

  useEffect(() => {
    let isPushReceived = false
    const offTtsStatus = api.onTtsStatus((status) => {
      isPushReceived = true
      setTtsStatus(status)
      if (status.state === TtsState.IDLE) {
        setIsReadRequested(false)
      }
    })
    void api.getTtsStatus().then((status) => {
      if (!isPushReceived) {
        setTtsStatus(status)
      }
    })

    return () => {
      offTtsStatus()
    }
  }, [])

  const correctedText = getCorrectedText()

  useEffect(() => {
    const el = correctedTextAreaRef.current
    if (el === null) {
      return
    }
    el.style.height = 'auto'
    el.style.height = `${String(el.scrollHeight)}px`
  }, [correctedText])

  useEffect(() => {
    revealHoveredIssueInCorrectedText()
  }, [hoveredIssueIndex, correctedText])

  return (
    <div className="h-screen flex flex-col bg-background text-text">
      <div className="flex-1 overflow-y-auto px-4 py-3.5 flex flex-col gap-3.5">
        <header className="flex items-center gap-2.5">
          <SpellCheck size={16} className="shrink-0 text-logo-primary" />
          <div className="min-w-0">
            <h1 className="text-sm font-semibold leading-tight">Grammar check</h1>
            <p className="text-xs text-text/55 truncate">
              {getLanguageLabel()} · {getProviderModelLine()}
            </p>
          </div>
        </header>
        {getBody()}
      </div>
      {getCorrectedTextFooter()}
    </div>
  )

  function getCorrectedText(): string {
    if (status.state !== GrammarCheckState.DONE) {
      return ''
    }

    return draftCorrectedText ?? status.result.correctedText
  }

  function getBody(): React.JSX.Element {
    switch (status.state) {
      case GrammarCheckState.IDLE: {
        return (
          <div className="rounded-xl border border-mid-gray/30 bg-mid-gray/5 p-4">
            <p className="text-sm text-text/70">{getIdleHintText()}</p>
          </div>
        )
      }
      case GrammarCheckState.GRABBING: {
        return getSpinnerRow({ label: 'Reading selection…' })
      }
      case GrammarCheckState.CHECKING: {
        return getSpinnerRow({ label: getCheckingLabel() })
      }
      case GrammarCheckState.ERROR: {
        return (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={17} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0 flex flex-col gap-3">
                <p className="text-sm leading-relaxed break-words selectable">{status.error}</p>
                <button
                  type="button"
                  onClick={() => {
                    void recheck()
                  }}
                  className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 text-sm font-medium rounded-lg border border-mid-gray/40 bg-mid-gray/10 hover:bg-mid-gray/20 transition-colors"
                >
                  <RefreshCw size={14} />
                  Try again
                </button>
              </div>
            </div>
          </div>
        )
      }
      case GrammarCheckState.DONE: {
        return getIssuesSection({ issues: status.result.issues })
      }
    }
  }

  function getIssuesSection(params: { issues: GrammarIssue[] }): React.JSX.Element {
    if (params.issues.length === 0) {
      return (
        <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-4 flex items-center gap-2.5">
          <CheckCircle2 size={16} className="text-green-700 dark:text-green-400 shrink-0" />
          <p className="text-sm">No issues found.</p>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[11px] font-medium uppercase tracking-wide text-text/50">
            Issues ({params.issues.length})
          </h2>
          {getDiffModeToggle()}
        </div>
        {params.issues.map((issue, index) => {
          return getIssueCard({ index, issue })
        })}
      </div>
    )
  }

  function getDiffModeToggle(): React.JSX.Element {
    return (
      <div className="flex items-center gap-0.5 rounded-lg border border-mid-gray/40 bg-mid-gray/10 p-0.5">
        <button
          type="button"
          aria-label="Show changes side by side"
          title="Side by side"
          onClick={() => {
            changeDiffMode({ mode: 'split' })
          }}
          className={getDiffModeButtonClass({ isActive: diffMode === 'split' })}
        >
          <Columns2 size={12} />
        </button>
        <button
          type="button"
          aria-label="Show changes unified"
          title="Unified"
          onClick={() => {
            changeDiffMode({ mode: 'unified' })
          }}
          className={getDiffModeButtonClass({ isActive: diffMode === 'unified' })}
        >
          <Rows2 size={12} />
        </button>
      </div>
    )
  }

  function changeDiffMode(params: { mode: DiffTextMode }): void {
    const { mode } = params
    window.localStorage.setItem(DIFF_MODE_STORAGE_KEY, mode)
    setDiffMode(mode)
  }

  function getDiffModeButtonClass(params: { isActive: boolean }): string {
    const base = 'p-1 rounded-md transition-colors'
    if (params.isActive) {
      return `${base} bg-logo-primary text-logo-stroke`
    }

    return `${base} text-text/60 hover:bg-mid-gray/20 hover:text-text`
  }

  function getIssueCard(params: { index: number; issue: GrammarIssue }): React.JSX.Element {
    const revertBlockReason = getRevertBlockReason({ issue: params.issue })
    const isExpanded = expandedIssueIndexes.has(params.index)

    return (
      <div
        key={params.index}
        className={getIssueCardClass({ isIgnored: params.issue.isIgnored })}
        onMouseEnter={() => {
          setHoveredIssueIndex(params.index)
        }}
        onMouseLeave={() => {
          setHoveredIssueIndex(null)
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 text-sm">
            <div className="selectable rounded-lg overflow-hidden">
              <DiffText mode={diffMode} newText={params.issue.suggestion} oldText={params.issue.original} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              aria-label={getIssueExpandButtonLabel({ isExpanded })}
              title={getIssueExpandButtonLabel({ isExpanded })}
              onClick={() => {
                toggleIssueExpanded({ index: params.index })
              }}
              className="inline-flex items-center justify-center p-1 rounded-lg border border-mid-gray/40 bg-mid-gray/10 text-text/60 hover:bg-mid-gray/20 hover:text-text transition-colors"
            >
              <ChevronDown size={14} className={getIssueExpandIconClass({ isExpanded })} />
            </button>
            <button
              type="button"
              disabled={revertBlockReason !== null}
              onClick={() => {
                void setIssueIgnored({ isIgnored: !params.issue.isIgnored, issueIndex: params.index })
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-mid-gray/40 bg-mid-gray/10 hover:bg-mid-gray/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {getIssueActionButtonIcon({ isIgnored: params.issue.isIgnored })}
              {getIssueActionButtonLabel({ isIgnored: params.issue.isIgnored })}
            </button>
          </div>
        </div>
        {getIssueExplanation({ isExpanded, issue: params.issue })}
        {getRevertBlockNote({ reason: revertBlockReason })}
      </div>
    )
  }

  function toggleIssueExpanded(params: { index: number }): void {
    setExpandedIssueIndexes((prev) => {
      const next = new Set(prev)
      if (next.has(params.index)) {
        next.delete(params.index)
      } else {
        next.add(params.index)
      }

      return next
    })
  }

  function getRevertBlockReason(params: { issue: GrammarIssue }): string | null {
    if (isTextEdited) {
      return 'Not reversible: the corrected text was edited manually. Check again to re-map the issues.'
    }
    if (params.issue.location === null) {
      return 'Not reversible: this change cannot be located in the corrected text.'
    }

    return null
  }

  function getRevertBlockNote(params: { reason: string | null }): React.JSX.Element | null {
    if (params.reason === null) {
      return null
    }

    return <p className="text-xs leading-relaxed text-text/50">{params.reason}</p>
  }

  function getIssueCurrentSpanText(params: { issue: GrammarIssue }): string {
    const { issue } = params
    if (issue.isIgnored) {
      return issue.original
    }

    return issue.suggestion
  }

  function getIssueRange(params: { issue: GrammarIssue }): CorrectedTextRange | null {
    const { issue } = params
    if (status.state !== GrammarCheckState.DONE || isTextEdited || issue.location === null) {
      return null
    }
    const spanText = getIssueCurrentSpanText({ issue })
    const start = issue.location
    if (status.result.correctedText.slice(start, start + spanText.length) !== spanText) {
      return null
    }

    return { end: start + spanText.length, start }
  }

  function getHoveredIssueHighlightRange(): CorrectedTextRange | null {
    if (hoveredIssueIndex === null || status.state !== GrammarCheckState.DONE) {
      return null
    }
    const issue = status.result.issues.at(hoveredIssueIndex)
    if (issue === undefined) {
      return null
    }

    return getIssueRange({ issue })
  }

  function getIssueMarks(): CorrectedTextMark[] {
    if (status.state !== GrammarCheckState.DONE || isTextEdited) {
      return []
    }

    return status.result.issues.reduce<CorrectedTextMark[]>((marks, issue) => {
      const range = getIssueRange({ issue })
      if (range === null) {
        return marks
      }

      return [...marks, { end: range.end, isIgnored: issue.isIgnored, start: range.start }]
    }, [])
  }

  function getIssueCardClass(params: { isIgnored: boolean }): string {
    if (params.isIgnored) {
      return 'rounded-xl border border-mid-gray/30 bg-mid-gray/5 p-3 flex flex-col gap-1.5 opacity-60'
    }

    return 'rounded-xl border border-mid-gray/30 bg-mid-gray/5 p-3 flex flex-col gap-1.5'
  }

  function getIssueActionButtonIcon(params: { isIgnored: boolean }): React.JSX.Element {
    if (params.isIgnored) {
      return <Undo2 size={12} />
    }

    return <Ban size={12} />
  }

  function getIssueActionButtonLabel(params: { isIgnored: boolean }): string {
    if (params.isIgnored) {
      return 'Undo'
    }

    return 'Ignore'
  }

  function getIssueExpandButtonLabel(params: { isExpanded: boolean }): string {
    if (params.isExpanded) {
      return 'Hide explanation'
    }

    return 'Show explanation'
  }

  function getIssueExpandIconClass(params: { isExpanded: boolean }): string {
    if (params.isExpanded) {
      return 'transition-transform'
    }

    return 'transition-transform rotate-180'
  }

  function getIssueExplanation(params: { isExpanded: boolean; issue: GrammarIssue }): React.JSX.Element | null {
    if (!params.isExpanded) {
      return null
    }

    return <p className="text-xs leading-relaxed break-words text-text/60">{params.issue.explanation}</p>
  }

  function getCorrectedTextFooter(): React.JSX.Element | null {
    if (status.state !== GrammarCheckState.DONE) {
      return null
    }

    return getCorrectedTextSection({ text: status.result.correctedText })
  }

  function getCorrectedTextSection(params: { text: string }): React.JSX.Element {
    const text = draftCorrectedText ?? params.text

    return (
      <div className="shrink-0 border-t border-mid-gray/30 bg-background px-4 py-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[11px] font-medium uppercase tracking-wide text-text/50">Corrected text</h2>
          <div className="flex items-center gap-1.5">
            {getReadButton({ text })}
            <button
              type="button"
              disabled={text.trim() === ''}
              onClick={() => {
                void recheck({ text })
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-mid-gray/40 bg-mid-gray/10 hover:bg-mid-gray/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <SpellCheck size={12} />
              Check again
            </button>
            <button
              type="button"
              onClick={() => {
                copyAndSignalCopied({ text })
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-mid-gray/40 bg-mid-gray/10 hover:bg-mid-gray/20 transition-colors"
            >
              {getCopyIcon()}
              {getCopyLabel()}
            </button>
          </div>
        </div>
        {getReadErrorNote()}
        <div className="relative rounded-lg bg-mid-gray/10">
          <div
            ref={correctedTextBackdropRef}
            aria-hidden="true"
            className="absolute inset-0 overflow-hidden rounded-lg border border-transparent px-2 py-1.5 font-mono text-sm leading-relaxed break-words whitespace-pre-wrap text-transparent pointer-events-none select-none [scrollbar-gutter:stable]"
          >
            {getCorrectedTextNodes()}
          </div>
          <textarea
            ref={correctedTextAreaRef}
            value={text}
            spellCheck={false}
            onChange={(e) => {
              setDraftCorrectedText(e.target.value)
              setIsTextEdited(true)
            }}
            onScroll={syncCorrectedTextScroll}
            className="relative block w-full min-h-[60px] max-h-[35vh] overflow-y-auto px-2 py-1.5 rounded-lg border border-mid-gray/40 bg-transparent text-sm leading-relaxed font-mono selectable focus:outline-none focus:ring-1 focus:ring-logo-primary resize-none [scrollbar-gutter:stable]"
          />
        </div>
      </div>
    )
  }

  function getCorrectedTextNodes(): React.ReactNode[] {
    const text = getCorrectedText()
    const segments = getCorrectedTextSegments({
      highlightRange: getHoveredIssueHighlightRange(),
      marks: getIssueMarks(),
      text,
    })

    return segments.map((segment) => {
      return getCorrectedTextSegmentNode({ segment, text })
    })
  }

  function getCorrectedTextSegments(params: {
    highlightRange: CorrectedTextRange | null
    marks: CorrectedTextMark[]
    text: string
  }): CorrectedTextSegment[] {
    const { highlightRange, marks, text } = params
    const bounds = getCorrectedTextBounds({ highlightRange, marks, text })

    return bounds.slice(1).map((end, index) => {
      const start = bounds[index]

      return {
        end,
        hasHighlight: isRangeCoveringSegment({ end, range: highlightRange, start }),
        start,
        underline: getSegmentUnderline({ end, marks, start }),
      }
    })
  }

  function getCorrectedTextBounds(params: {
    highlightRange: CorrectedTextRange | null
    marks: CorrectedTextMark[]
    text: string
  }): number[] {
    const { highlightRange, marks, text } = params
    const edges = [
      0,
      text.length,
      ...marks.flatMap((mark) => {
        return [mark.end, mark.start]
      }),
    ]
    if (highlightRange !== null) {
      edges.push(highlightRange.end, highlightRange.start)
    }

    return [...new Set(edges)].sort((a, b) => {
      return a - b
    })
  }

  function isRangeCoveringSegment(params: { end: number; range: CorrectedTextRange | null; start: number }): boolean {
    const { end, range, start } = params
    if (range === null) {
      return false
    }

    return range.start <= start && end <= range.end
  }

  function getSegmentUnderline(params: {
    end: number
    marks: CorrectedTextMark[]
    start: number
  }): CorrectedTextSegment['underline'] {
    const { end, marks, start } = params
    const coveringMarks = marks.filter((mark) => {
      return mark.start <= start && end <= mark.end
    })
    if (coveringMarks.length === 0) {
      return 'none'
    }
    const hasActiveMark = coveringMarks.some((mark) => {
      return !mark.isIgnored
    })
    if (hasActiveMark) {
      return 'active'
    }

    return 'ignored'
  }

  function getCorrectedTextSegmentNode(params: { segment: CorrectedTextSegment; text: string }): React.ReactNode {
    const { segment, text } = params
    const value = text.slice(segment.start, segment.end)
    if (segment.hasHighlight) {
      return (
        <mark key={segment.start} ref={issueHighlightRef} className={getCorrectedTextSegmentClass({ segment })}>
          {value}
        </mark>
      )
    }
    if (segment.underline === 'none') {
      return value
    }

    return (
      <span key={segment.start} className={getCorrectedTextSegmentClass({ segment })}>
        {value}
      </span>
    )
  }

  function getCorrectedTextSegmentClass(params: { segment: CorrectedTextSegment }): string {
    const { segment } = params
    const highlightClass = getSegmentHighlightClass({ segment })
    const underlineClass = getSegmentUnderlineClass({ segment })
    if (highlightClass === '') {
      return underlineClass
    }
    if (underlineClass === '') {
      return highlightClass
    }

    return `${highlightClass} ${underlineClass}`
  }

  function getSegmentHighlightClass(params: { segment: CorrectedTextSegment }): string {
    if (params.segment.hasHighlight) {
      return 'rounded-sm bg-logo-primary/35'
    }

    return ''
  }

  function getSegmentUnderlineClass(params: { segment: CorrectedTextSegment }): string {
    if (params.segment.underline === 'active') {
      return 'underline decoration-2 decoration-logo-primary/60 underline-offset-2'
    }
    if (params.segment.underline === 'ignored') {
      return 'underline decoration-2 decoration-mid-gray/50 underline-offset-2'
    }

    return ''
  }

  function syncCorrectedTextScroll(): void {
    const backdrop = correctedTextBackdropRef.current
    const textarea = correctedTextAreaRef.current
    if (backdrop === null || textarea === null) {
      return
    }
    backdrop.scrollTop = textarea.scrollTop
  }

  function revealHoveredIssueInCorrectedText(): void {
    const highlight = issueHighlightRef.current
    const textarea = correctedTextAreaRef.current
    if (highlight === null || textarea === null) {
      return
    }
    syncCorrectedTextScroll()
    const top = highlight.offsetTop
    const bottom = top + highlight.offsetHeight
    if (top < textarea.scrollTop) {
      textarea.scrollTop = top - ISSUE_HIGHLIGHT_SCROLL_MARGIN_PX
    } else if (bottom > textarea.scrollTop + textarea.clientHeight) {
      textarea.scrollTop = bottom + ISSUE_HIGHLIGHT_SCROLL_MARGIN_PX - textarea.clientHeight
    }
    syncCorrectedTextScroll()
  }

  function getReadButton(params: { text: string }): React.JSX.Element {
    if (isTtsBusy()) {
      return (
        <button
          type="button"
          onClick={() => {
            void api.stop()
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-mid-gray/40 bg-mid-gray/10 hover:bg-mid-gray/20 transition-colors"
        >
          <Square size={11} className="fill-current" />
          Stop
        </button>
      )
    }

    return (
      <button
        type="button"
        disabled={params.text.trim() === ''}
        onClick={() => {
          readCorrectedText({ text: params.text })
        }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-mid-gray/40 bg-mid-gray/10 hover:bg-mid-gray/20 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Volume2 size={12} />
        Read
      </button>
    )
  }

  function isTtsBusy(): boolean {
    return ttsStatus.state === TtsState.SYNTHESIZING || ttsStatus.state === TtsState.READING
  }

  function readCorrectedText(params: { text: string }): void {
    setIsReadRequested(true)
    void api.speak(getReadLang(), params.text, { shouldSkipHistory: true })
  }

  function getReadLang(): Lang {
    return result?.langCode ?? 'auto'
  }

  function getReadErrorNote(): React.JSX.Element | null {
    if (!isReadRequested || ttsStatus.state !== TtsState.ERROR) {
      return null
    }

    return <p className="text-xs leading-relaxed text-red-600 dark:text-red-400">{ttsStatus.error}</p>
  }

  function getSpinnerRow(params: { label: string }): React.JSX.Element {
    return (
      <div className="rounded-xl border border-mid-gray/30 bg-mid-gray/5 p-4 flex items-center gap-2.5 text-sm text-text/70">
        <Loader2 size={15} className="animate-spin shrink-0" />
        {params.label}
      </div>
    )
  }

  function getCheckingLabel(): string {
    if (status.state !== GrammarCheckState.CHECKING || status.model === '') {
      return 'Checking…'
    }

    return `Checking with ${status.model}…`
  }

  function getIdleHintText(): string {
    const shortcut = settings?.grammarShortcut ?? ''
    if (shortcut === '') {
      return 'Press the grammar shortcut with text selected to run a check.'
    }

    return `Press ${formatSingleton().formatAccelerator(shortcut)} with text selected to run a check.`
  }

  function getLanguageLabel(): string {
    if (result === null) {
      return UNKNOWN_LABEL
    }

    return languageCatalogSingleton().getDisplayName({ code: result.langCode })
  }

  function getProviderModelLine(): string {
    const model = getActiveModel()
    const providerLabel = getActiveProviderLabel()
    if (model === '' && providerLabel === '') {
      return UNKNOWN_LABEL
    }
    if (model === '') {
      return providerLabel
    }
    if (providerLabel === '') {
      return model
    }

    return `${providerLabel} · ${model}`
  }

  function getActiveModel(): string {
    if (status.state === GrammarCheckState.CHECKING) {
      return status.model
    }
    if (result !== null) {
      return result.model
    }

    return ''
  }

  function getActiveProviderLabel(): string {
    if (result === null) {
      return ''
    }

    return getProviderDisplayName({ provider: result.provider })
  }

  function getProviderDisplayName(params: { provider: LlmProvider }): string {
    switch (params.provider) {
      case LlmProvider.ANTHROPIC: {
        return 'Anthropic'
      }
      case LlmProvider.OLLAMA: {
        return 'Ollama'
      }
    }
  }

  function getCopyLabel(): string {
    if (isCopied) {
      return 'Copied'
    }

    return 'Copy'
  }

  function getCopyIcon(): React.JSX.Element {
    if (isCopied) {
      return <Check size={12} />
    }

    return <Copy size={12} />
  }

  function copyAndSignalCopied(params: { text: string }): void {
    void navigator.clipboard.writeText(params.text)
    setIsCopied(true)
    setTimeout(() => {
      setIsCopied(false)
    }, COPY_FEEDBACK_MS)
  }
}
