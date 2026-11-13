import { Eye, EyeOff, RefreshCw, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'

import { api } from '#src/renderer/src/api'
import { Row } from '#src/renderer/src/component/ui/row'
import { Select, type SelectOption } from '#src/renderer/src/component/ui/select'
import { SettingsGroup } from '#src/renderer/src/component/ui/settings-group'
import { ShortcutInput } from '#src/renderer/src/component/ui/shortcut-input'
import { Toggle } from '#src/renderer/src/component/ui/toggle'
import { useSettingsStore } from '#src/renderer/src/store/settings'
import { ANTHROPIC_DEFAULT_BASE_URL, OLLAMA_DEFAULT_BASE_URL } from '#src/shared/grammar/llm-defaults'
import { DEFAULT_GRAMMAR_PROMPT_EN, DEFAULT_GRAMMAR_PROMPT_SR } from '#src/shared/grammar/prompt-default'
import { type LlmModel, LlmProvider, type Settings } from '#src/shared/types'

const PROVIDER_OPTIONS: SelectOption<LlmProvider>[] = [
  { label: 'Anthropic', value: LlmProvider.ANTHROPIC },
  { label: 'Ollama', value: LlmProvider.OLLAMA },
]

const INPUT_CLASS_NAME =
  'px-3 py-1.5 text-sm rounded-lg border border-mid-gray/40 bg-mid-gray/10 placeholder:text-text/40 focus:outline-none focus:ring-1 focus:ring-logo-primary'

export function GeneralTabGrammar(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)
  const [models, setModels] = useState<LlmModel[]>([])
  const [isModelsLoading, setIsModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false)

  useEffect(() => {
    void refreshModels()
  }, [])

  if (!settings) {
    return <></>
  }

  const conflictCounts = [
    ...settings.languageBindings.map((b) => {
      return b.shortcut
    }),
    settings.autoShortcut,
    settings.stopShortcut,
    settings.grammarShortcut,
  ]
    .filter((accel) => {
      return accel !== ''
    })
    .reduce<Record<string, number>>((acc, accel) => {
      acc[accel] = (acc[accel] ?? 0) + 1

      return acc
    }, {})

  const hasConflictFor = (accel: string): boolean => {
    return accel !== '' && (conflictCounts[accel] ?? 0) > 1
  }

  return (
    <>
      <SettingsGroup title="Shortcut" description="Grab the selected text and review the corrections in a popup.">
        <Row title="Check selection shortcut" description="Opens the grammar popup with the checked selection.">
          <ShortcutInput
            value={settings.grammarShortcut}
            hasConflict={hasConflictFor(settings.grammarShortcut)}
            onChange={(accel) => {
              void update({ grammarShortcut: accel })
            }}
          />
        </Row>
      </SettingsGroup>

      <SettingsGroup
        title="Language model"
        description="Grammar checks run through a large language model you configure."
      >
        <Row title="Provider" description="Anthropic needs an API key; Ollama runs on your machine.">
          <Select
            value={settings.grammarLlmProvider}
            options={PROVIDER_OPTIONS}
            onChange={(v) => {
              void update({ grammarLlmProvider: v })
            }}
            ariaLabel="Grammar provider"
          />
        </Row>
        <Row title="API URL" description="Leave empty to use the provider default.">
          <input
            type="text"
            value={settings.grammarLlmBaseUrl}
            placeholder={getBaseUrlPlaceholder({ provider: settings.grammarLlmProvider })}
            onChange={(e) => {
              void update({ grammarLlmBaseUrl: e.target.value })
            }}
            className={`w-64 ${INPUT_CLASS_NAME}`}
          />
        </Row>
        <Row title="API key" description="Stored locally in settings.json. Ollama usually needs none.">
          <div className="flex items-center gap-1.5">
            <input
              type={getApiKeyInputType({ isVisible: isApiKeyVisible })}
              value={settings.grammarLlmApiKey}
              onChange={(e) => {
                void update({ grammarLlmApiKey: e.target.value })
              }}
              className={`w-56 ${INPUT_CLASS_NAME}`}
            />
            <button
              type="button"
              title={getApiKeyToggleTitle({ isVisible: isApiKeyVisible })}
              onClick={() => {
                setIsApiKeyVisible((v) => {
                  return !v
                })
              }}
              className="p-1.5 rounded-md text-text/60 hover:text-text hover:bg-mid-gray/20 transition-colors"
            >
              {getApiKeyToggleIcon({ isVisible: isApiKeyVisible })}
            </button>
          </div>
        </Row>
        <Row
          title="Model"
          description="Used for every check. Refresh after changing the provider, URL or key."
          isStacked
        >
          <div className="flex flex-col gap-2">
            {modelsError !== null && (
              <p className="text-xs text-amber-700 dark:text-amber-400 break-words">{modelsError}</p>
            )}
            <div className="flex items-center gap-2">
              {getModelControl({ settings })}
              <button
                type="button"
                disabled={isModelsLoading}
                title="Refresh model list"
                onClick={() => {
                  void refreshModels()
                }}
                className="p-1.5 rounded-md text-text/60 hover:text-text hover:bg-mid-gray/20 transition-colors disabled:cursor-not-allowed"
              >
                {getRefreshIcon({ isModelsLoading })}
              </button>
            </div>
          </div>
        </Row>
      </SettingsGroup>

      <SettingsGroup title="Serbian diacritics">
        <Row
          title="Fix Serbian diacritics (Milos → Miloš)"
          description="When off, ASCII spellings (s/c/z/dj) are kept and not flagged."
        >
          <Toggle
            checked={settings.shouldFixSerbianDiacritics}
            onChange={(v) => {
              void update({ shouldFixSerbianDiacritics: v })
            }}
            ariaLabel="Fix Serbian diacritics"
          />
        </Row>
      </SettingsGroup>

      <SettingsGroup
        title="Prompts"
        description="Leave empty to use the built-in prompt. Your prompt fully replaces the built-in one; the Serbian
        diacritics setting is always appended for Serbian."
      >
        {getPromptRow({
          label: 'English system prompt',
          onChange: (value) => {
            void update({ grammarPromptEn: value })
          },
          onReset: () => {
            void update({ grammarPromptEn: '' })
          },
          placeholder: DEFAULT_GRAMMAR_PROMPT_EN,
          value: settings.grammarPromptEn,
        })}
        {getPromptRow({
          label: 'Serbian system prompt',
          onChange: (value) => {
            void update({ grammarPromptSr: value })
          },
          onReset: () => {
            void update({ grammarPromptSr: '' })
          },
          placeholder: DEFAULT_GRAMMAR_PROMPT_SR,
          value: settings.grammarPromptSr,
        })}
      </SettingsGroup>
    </>
  )

  async function refreshModels(): Promise<void> {
    setIsModelsLoading(true)
    setModelsError(null)
    try {
      const fetched = await api.listGrammarModels()
      setModels(fetched)
    } catch (err) {
      setModels([])
      setModelsError(String(err))
    }
    setIsModelsLoading(false)
  }

  function getModelControl(params: { settings: Settings }): React.JSX.Element {
    if (modelsError !== null) {
      return (
        <input
          type="text"
          value={params.settings.grammarLlmModel}
          placeholder="Type a model id, e.g. claude-sonnet-4-5"
          onChange={(e) => {
            void update({ grammarLlmModel: e.target.value })
          }}
          className={`w-64 ${INPUT_CLASS_NAME}`}
        />
      )
    }

    return (
      <Select
        value={params.settings.grammarLlmModel}
        options={getModelOptions({ models, value: params.settings.grammarLlmModel })}
        onChange={(v) => {
          void update({ grammarLlmModel: v })
        }}
        ariaLabel="Grammar model"
      />
    )
  }

  function getModelOptions(params: { models: LlmModel[]; value: string }): SelectOption<string>[] {
    const options = params.models.map((model) => {
      return { label: model.name, value: model.id }
    })
    if (params.value === '') {
      return [{ label: 'Select a model…', value: '' }, ...options]
    }
    const isValueListed = params.models.some((model) => {
      return model.id === params.value
    })
    if (isValueListed) {
      return options
    }

    return [{ label: `${params.value} (not listed)`, value: params.value }, ...options]
  }

  function getPromptRow(params: {
    label: string
    onChange: (value: string) => void
    onReset: () => void
    placeholder: string
    value: string
  }): React.JSX.Element {
    return (
      <Row title={params.label} isStacked>
        <div className="flex flex-col gap-2">
          <textarea
            value={params.value}
            placeholder={params.placeholder}
            rows={6}
            onChange={(e) => {
              params.onChange(e.target.value)
            }}
            className="px-3 py-2 text-xs leading-relaxed font-mono rounded-lg border border-mid-gray/40 bg-mid-gray/10 placeholder:text-text/40 focus:outline-none focus:ring-1 focus:ring-logo-primary resize-y"
          />
          <button
            type="button"
            onClick={params.onReset}
            className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 text-xs font-medium rounded-lg border border-mid-gray/40 bg-mid-gray/10 hover:bg-mid-gray/20 transition-colors"
          >
            <RotateCcw size={12} />
            Reset to default
          </button>
        </div>
      </Row>
    )
  }

  function getBaseUrlPlaceholder(params: { provider: LlmProvider }): string {
    switch (params.provider) {
      case LlmProvider.ANTHROPIC: {
        return ANTHROPIC_DEFAULT_BASE_URL
      }
      case LlmProvider.OLLAMA: {
        return OLLAMA_DEFAULT_BASE_URL
      }
    }
  }

  function getApiKeyInputType(params: { isVisible: boolean }): string {
    if (params.isVisible) {
      return 'text'
    }

    return 'password'
  }

  function getApiKeyToggleTitle(params: { isVisible: boolean }): string {
    if (params.isVisible) {
      return 'Hide API key'
    }

    return 'Show API key'
  }

  function getApiKeyToggleIcon(params: { isVisible: boolean }): React.JSX.Element {
    if (params.isVisible) {
      return <EyeOff size={14} />
    }

    return <Eye size={14} />
  }

  function getRefreshIcon(params: { isModelsLoading: boolean }): React.JSX.Element {
    if (params.isModelsLoading) {
      return <RefreshCw size={13} className="animate-spin" />
    }

    return <RefreshCw size={13} />
  }
}
