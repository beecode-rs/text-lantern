import { singletonPattern } from '@beecode/msh-util/singleton/pattern'
import { EventEmitter } from 'node:events'

import { settingsDalSingleton } from '#src/main/dal/settings-dal'
import { llmProviderRegistrySingleton } from '#src/main/lib/llm/llm-provider-registry'
import { Selection } from '#src/main/lib/selection'
import { constant } from '#src/main/util/constants'
import { langUtil } from '#src/main/util/lang-util'
import { grammarResponseParser } from '#src/shared/grammar/grammar-response'
import { buildGrammarSystemPrompt } from '#src/shared/grammar/prompt-default'
import {
  type GrammarCheckResult,
  GrammarCheckState,
  type GrammarCheckStatus,
  type GrammarIssue,
  type Settings,
} from '#src/shared/types'

export class GrammarService {
  readonly events: EventEmitter

  protected _lastResult: GrammarCheckResult | null = null

  protected _lastStatus: GrammarCheckStatus = { state: GrammarCheckState.IDLE }

  protected _lastText: string | null = null

  protected _runGeneration = 0

  constructor() {
    this.events = new EventEmitter()
    this.events.setMaxListeners(50)
  }

  async checkSelection(): Promise<void> {
    const runGeneration = ++this._runGeneration
    const settings = settingsDalSingleton().get()
    if (!this._hasSelectedModel({ settings })) {
      this._emitNoModelError()

      return
    }
    this._emitStatus({ state: GrammarCheckState.GRABBING })
    const text = await this._grabSelection({ runGeneration })
    if (text === null) {
      return
    }
    this._lastText = text
    void this._runCheck({ settings, text })
  }

  recheck(params: { text?: string }): void {
    ++this._runGeneration
    const text = params.text ?? this._lastText
    if (text === null) {
      this._emitError({ error: 'Nothing to check yet. Press the grammar shortcut with text selected.' })

      return
    }
    if (text.trim() === '') {
      this._emitError({ error: 'The text is empty. Edit the corrected text before checking again.' })

      return
    }
    const settings = settingsDalSingleton().get()
    if (!this._hasSelectedModel({ settings })) {
      this._emitNoModelError()

      return
    }
    this._lastText = text
    void this._runCheck({ settings, text })
  }

  getLastResult(): GrammarCheckResult | null {
    return this._lastResult
  }

  getStatus(): GrammarCheckStatus {
    return this._lastStatus
  }

  setIssueIgnored(params: { isIgnored: boolean; issueIndex: number }): GrammarCheckResult | null {
    const { isIgnored, issueIndex } = params
    const result = this._lastResult
    if (result === null) {
      return null
    }
    const issues = result.issues
    if (issueIndex < 0 || issueIndex >= issues.length) {
      return result
    }
    const issue = issues[issueIndex]
    if (issue.isIgnored === isIgnored) {
      return result
    }
    const expected = this._expectedSpan({ isIgnored, issue })
    const isReversible =
      issue.location !== null &&
      this._matchesAtLocation({ expected, location: issue.location, text: result.correctedText })
    if (!isReversible) {
      if (issue.location === null) {
        return result
      }

      return this._markIssueUnrevertable({ issueIndex, result })
    }

    return this._applyIssueSwap({ isIgnored, issueIndex, result })
  }

  protected async _grabSelection(params: { runGeneration: number }): Promise<string | null> {
    try {
      const text = await new Selection().grab()
      if (this._runGeneration !== params.runGeneration) {
        return null
      }
      if (text === '') {
        this._emitError({ error: 'No selected text found.' })

        return null
      }

      return text
    } catch (error) {
      if (this._runGeneration === params.runGeneration) {
        this._emitError({ error: this._errorMessage(error) })
      }

      return null
    }
  }

  protected async _runCheck(params: { settings: Settings; text: string }): Promise<void> {
    const { settings, text } = params
    const runGeneration = this._runGeneration
    try {
      const cappedText = this._capTextToMaxLength({ text })
      const langCode = this._resolveLangCode({ text: cappedText })
      const system = buildGrammarSystemPrompt({
        langCode,
        shouldFixSerbianDiacritics: settings.shouldFixSerbianDiacritics,
        userPromptOverride: this._resolvePromptOverride({ langCode, settings }),
      })
      this._emitStatus({ model: settings.grammarLlmModel, state: GrammarCheckState.CHECKING })
      const provider = llmProviderRegistrySingleton().providerFor({ provider: settings.grammarLlmProvider })
      const raw = await provider.complete({ model: settings.grammarLlmModel, system, user: cappedText })
      if (this._runGeneration !== runGeneration) {
        return
      }
      const parsed = grammarResponseParser.parse({ raw })
      this._lastResult = {
        correctedText: parsed.correctedText,
        issues: this._sortIssuesByLocation({
          issues: this._locateIssues({
            correctedText: parsed.correctedText,
            inputText: cappedText,
            issues: parsed.issues,
          }),
        }),
        langCode: this._resolveResultLangCode({ detectedLangCode: langCode, parsedLangCode: parsed.langCode }),
        model: settings.grammarLlmModel,
        provider: settings.grammarLlmProvider,
      }
      this._emitStatus({ result: this._lastResult, state: GrammarCheckState.DONE })
    } catch (error) {
      if (this._runGeneration !== runGeneration) {
        return
      }
      this._emitError({ error: this._errorMessage(error) })
    }
  }

  protected _emitStatus(status: GrammarCheckStatus): void {
    this._lastStatus = status
    this.events.emit('status', status)
  }

  protected _emitError(params: { error: string }): void {
    this._emitStatus({ error: params.error, state: GrammarCheckState.ERROR })
  }

  protected _emitNoModelError(): void {
    this._emitError({ error: 'No LLM model selected. Open Settings → General → Grammar.' })
  }

  protected _capTextToMaxLength(params: { text: string }): string {
    const maxTextChars = constant().grammar.maxTextChars
    if (params.text.length > maxTextChars) {
      return params.text.slice(0, maxTextChars)
    }

    return params.text
  }

  protected _resolveLangCode(params: { text: string }): string {
    const detected = langUtil.detectLang({ text: params.text })
    if (detected === 'sr') {
      return 'sr'
    }

    return 'en'
  }

  protected _resolvePromptOverride(params: { langCode: string; settings: Settings }): string {
    if (params.langCode === 'sr') {
      return params.settings.grammarPromptSr
    }

    return params.settings.grammarPromptEn
  }

  protected _resolveResultLangCode(params: { detectedLangCode: string; parsedLangCode: string }): string {
    if (params.parsedLangCode !== '') {
      return params.parsedLangCode
    }

    return params.detectedLangCode
  }

  protected _expectedSpan(params: { isIgnored: boolean; issue: GrammarIssue }): string {
    // Ignoring swaps the applied suggestion back to the original; undoing re-applies the suggestion.
    if (params.isIgnored) {
      return params.issue.suggestion
    }

    return params.issue.original
  }

  protected _replacementSpan(params: { isIgnored: boolean; issue: GrammarIssue }): string {
    if (params.isIgnored) {
      return params.issue.original
    }

    return params.issue.suggestion
  }

  protected _matchesAtLocation(params: { expected: string; location: number; text: string }): boolean {
    return params.text.slice(params.location, params.location + params.expected.length) === params.expected
  }

  protected _markIssueUnrevertable(params: { issueIndex: number; result: GrammarCheckResult }): GrammarCheckResult {
    const updated: GrammarCheckResult = {
      ...params.result,
      issues: params.result.issues.map((current, index) => {
        if (index !== params.issueIndex || current.location === null) {
          return current
        }

        return { ...current, location: null }
      }),
    }
    this._lastResult = updated
    this._emitStatus({ result: updated, state: GrammarCheckState.DONE })

    return updated
  }

  protected _applyIssueSwap(params: {
    isIgnored: boolean
    issueIndex: number
    result: GrammarCheckResult
  }): GrammarCheckResult {
    const { isIgnored, issueIndex, result } = params
    const issue = result.issues[issueIndex]
    const location = issue.location!
    const expected = this._expectedSpan({ isIgnored, issue })
    const replacement = this._replacementSpan({ isIgnored, issue })
    const updated: GrammarCheckResult = {
      ...result,
      correctedText: this._replaceSpan({
        end: location + expected.length,
        replacement,
        start: location,
        text: result.correctedText,
      }),
      issues: result.issues.map((current, index) => {
        if (index === issueIndex) {
          return { ...current, isIgnored }
        }

        return {
          ...current,
          location: this._shiftLocation({
            by: replacement.length - expected.length,
            location: current.location,
            past: location,
          }),
        }
      }),
    }
    this._lastResult = updated
    this._emitStatus({ result: updated, state: GrammarCheckState.DONE })

    return updated
  }

  protected _shiftLocation(params: { by: number; location: number | null; past: number }): number | null {
    const { by, location, past } = params
    if (location === null || location <= past || by === 0) {
      return location
    }

    return location + by
  }

  protected _replaceSpan(params: { end: number; replacement: string; start: number; text: string }): string {
    return `${params.text.slice(0, params.start)}${params.replacement}${params.text.slice(params.end)}`
  }

  protected _locateIssues(params: {
    correctedText: string
    inputText: string
    issues: GrammarIssue[]
  }): GrammarIssue[] {
    // Prefer anchoring every issue's `original` in the input text: when the anchors reconstruct the
    // LLM's corrected text exactly, each issue's corrected-text offset is derived from the diff
    // itself, which disambiguates repeated substrings (e.g. which of two sentence dots became `?`).
    const anchored = this._anchorIssuesToInput(params)
    if (anchored !== null) {
      return anchored
    }

    return this._locateIssuesBySuggestion({ correctedText: params.correctedText, issues: params.issues })
  }

  protected _sortIssuesByLocation(params: { issues: GrammarIssue[] }): GrammarIssue[] {
    const { issues } = params

    return [...issues].sort((a, b) => {
      return this._compareIssueLocations({ left: a, right: b })
    })
  }

  protected _compareIssueLocations(params: { left: GrammarIssue; right: GrammarIssue }): number {
    const { left, right } = params
    if (left.location !== null && right.location !== null) {
      return left.location - right.location
    }
    if (left.location === null && right.location === null) {
      return 0
    }
    if (left.location === null) {
      return 1
    }

    return -1
  }

  protected _anchorIssuesToInput(params: {
    correctedText: string
    inputText: string
    issues: GrammarIssue[]
  }): GrammarIssue[] | null {
    const located = this._searchAnchors({
      built: '',
      correctedText: params.correctedText,
      inputFrom: 0,
      inputText: params.inputText,
      issues: params.issues,
      located: [],
      usedSpans: [],
    })
    if (located === null) {
      return null
    }

    return params.issues.map((issue, index) => {
      return { ...issue, location: located[index] ?? null }
    })
  }

  protected _searchAnchors(params: {
    built: string
    correctedText: string
    inputFrom: number
    inputText: string
    issues: GrammarIssue[]
    located: number[]
    usedSpans: { end: number; start: number }[]
  }): number[] | null {
    const { built, correctedText, inputFrom, inputText, issues, located, usedSpans } = params
    if (located.length === issues.length) {
      if (correctedText === `${built}${inputText.slice(inputFrom)}`) {
        return [...located]
      }

      return null
    }
    const issue = issues[located.length]
    const candidates = this._candidateInputLocations({
      from: inputFrom,
      inputText,
      original: issue.original,
      usedSpans,
    })
    const results = candidates.map((candidateStart) => {
      const prefix = `${built}${inputText.slice(inputFrom, candidateStart)}`
      const withSuggestion = `${prefix}${issue.suggestion}`
      if (!correctedText.startsWith(prefix) || !correctedText.startsWith(withSuggestion)) {
        return null
      }

      return this._searchAnchors({
        built: withSuggestion,
        correctedText,
        inputFrom: candidateStart + issue.original.length,
        inputText,
        issues,
        located: [...located, prefix.length],
        usedSpans: [...usedSpans, { end: candidateStart + issue.original.length, start: candidateStart }],
      })
    })

    return results.find((result) => result !== null) ?? null
  }

  protected _candidateInputLocations(params: {
    from: number
    inputText: string
    original: string
    usedSpans: { end: number; start: number }[]
  }): number[] {
    if (params.original === '') {
      return []
    }
    const index = params.inputText.indexOf(params.original, params.from)
    if (index < 0) {
      return []
    }
    const rest = this._candidateInputLocations({ ...params, from: index + 1 })
    const isOverlapping = params.usedSpans.some(({ end, start }) => {
      return index < end && index + params.original.length > start
    })
    if (isOverlapping) {
      return rest
    }

    return [index, ...rest]
  }

  protected _locateIssuesBySuggestion(params: { correctedText: string; issues: GrammarIssue[] }): GrammarIssue[] {
    const usedSpans: { end: number; start: number }[] = []

    return params.issues.map((issue) => {
      const location = this._findFreeLocation({ suggestion: issue.suggestion, text: params.correctedText, usedSpans })
      if (location !== null) {
        usedSpans.push({ end: location + issue.suggestion.length, start: location })
      }

      return { ...issue, location }
    })
  }

  protected _findFreeLocation(params: {
    from?: number
    suggestion: string
    text: string
    usedSpans: { end: number; start: number }[]
  }): number | null {
    const from = params.from ?? 0
    if (params.suggestion === '') {
      return null
    }
    const index = params.text.indexOf(params.suggestion, from)
    if (index < 0) {
      return null
    }
    const isOverlapping = params.usedSpans.some(({ end, start }) => {
      return index < end && index + params.suggestion.length > start
    })
    if (isOverlapping) {
      return this._findFreeLocation({ ...params, from: index + 1 })
    }

    return index
  }

  protected _hasSelectedModel(params: { settings: Settings }): boolean {
    return params.settings.grammarLlmModel !== ''
  }

  protected _errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }

    return String(error)
  }
}

export const grammarServiceSingleton = singletonPattern(() => new GrammarService())
