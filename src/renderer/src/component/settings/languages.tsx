import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { useEffect } from 'react'

import { Row } from '#src/renderer/src/component/ui/row'
import { SettingsGroup } from '#src/renderer/src/component/ui/settings-group'
import { ShortcutInput } from '#src/renderer/src/component/ui/shortcut-input'
import { StarBadge } from '#src/renderer/src/component/ui/star-badge'
import { useModelsStore } from '#src/renderer/src/store/models'
import { useSettingsStore } from '#src/renderer/src/store/settings'
import { languageCatalogSingleton } from '#src/shared/language/language-catalog'
import type { LanguageBinding, Settings } from '#src/shared/types'

const BINDING_GRID =
  'grid grid-cols-[minmax(130px,170px)_minmax(120px,190px)_minmax(150px,160px)_minmax(0,1fr)] items-center gap-2 px-4'

export function LanguagesSettings(): React.JSX.Element {
  const settings = useSettingsStore((s) => {
    return s.settings
  })
  const update = useSettingsStore((s) => {
    return s.update
  })
  const voices = useModelsStore((s) => {
    return s.voices
  })
  const load = useModelsStore((s) => {
    return s.load
  })

  useEffect(() => {
    void load()
  }, [load])

  if (!settings) {
    return <></>
  }

  const conflictCounts = [
    ...settings.languageBindings.map((b) => {
      return b.shortcut
    }),
    settings.autoShortcut,
    settings.stopShortcut,
  ]
    .filter((accel) => {
      return accel !== ''
    })
    .reduce<Record<string, number>>((acc, accel) => {
      acc[accel] = (acc[accel] ?? 0) + 1

      return acc
    }, {})

  const hasConflict = Object.values(conflictCounts).some((n) => {
    return n > 1
  })

  const hasConflictFor = (accel: string): boolean => {
    return accel !== '' && (conflictCounts[accel] ?? 0) > 1
  }

  const fallbackOptions = settings.languageBindings.map((binding) => {
    return {
      code: binding.langCode,
      name: languageCatalogSingleton().getDisplayName({ code: binding.langCode }),
    }
  })
  const isFallbackMissing =
    settings.fallbackLang !== '' &&
    !settings.languageBindings.some((binding) => {
      return binding.langCode === settings.fallbackLang
    })
  const isAutoDisabled = settings.languageBindings.length === 0

  const fallbackSelectValue = getFallbackSelectValue({ fallbackLang: settings.fallbackLang, isAutoDisabled })
  const fallbackSelectOptions = buildFallbackSelectOptions({
    fallbackLang: settings.fallbackLang,
    fallbackOptions,
    isAutoDisabled,
    isFallbackMissing,
  })

  const setBinding = (id: string, patch: Partial<LanguageBinding>): void => {
    void update({
      languageBindings: settings.languageBindings.map((b) => {
        return mergeBindingPatch({ binding: b, id, patch })
      }),
    })
  }

  const removeBinding = (id: string): void => {
    void update({
      languageBindings: settings.languageBindings.filter((b) => {
        return b.id !== id
      }),
    })
  }

  const addBinding = (): void => {
    const usedCodes = settings.languageBindings.map((b) => {
      return b.langCode
    })
    const langCode = pickUnusedLangCode({ usedCodes, voices })
    const voice = findVoiceForLangCode({ langCode, voices })
    const newBinding: LanguageBinding = {
      id: crypto.randomUUID(),
      langCode,
      shortcut: '',
      voice,
    }
    const patch: Partial<Settings> = { languageBindings: [...settings.languageBindings, newBinding] }
    if (settings.fallbackLang === '' && langCode !== '') {
      patch.fallbackLang = langCode
    }
    void update(patch)
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-semibold">Languages</h1>
        <p className="text-sm text-text/55 mt-1">Pair each language with a voice and a global shortcut.</p>
      </header>

      {hasConflict && (
        <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/40 rounded-lg px-3 py-2">
          <AlertTriangle size={16} />
          Two actions share a shortcut. Pick a different combination for each.
        </div>
      )}

      <SettingsGroup title="Language bindings">
        <div className="overflow-x-auto">
          <div className="min-w-[500px] divide-y divide-mid-gray/15">
            <div className={`${BINDING_GRID} py-2 text-[11px] font-medium uppercase tracking-wide text-text/50`}>
              <span>Language</span>
              <span>Voice</span>
              <span>Shortcut</span>
            </div>
            {settings.languageBindings.length === 0 && (
              <p className="px-4 py-6 text-sm text-text/50 text-center">
                No languages yet. Download a voice in <strong>Models</strong>, then add it here and record a shortcut.
              </p>
            )}
            {settings.languageBindings.map((binding) => {
              const usedByOthers = settings.languageBindings
                .filter((b) => {
                  return b.id !== binding.id
                })
                .map((b) => {
                  return b.langCode
                })
              const langOptions = languageCatalogSingleton()
                .list()
                .filter((l) => {
                  return !usedByOthers.includes(l.code)
                })
              const rowVoices = [...voices].sort((a, b) => {
                const aRank = langMatchRank({ lang: a.lang, langCode: binding.langCode })
                const bRank = langMatchRank({ lang: b.lang, langCode: binding.langCode })

                return aRank - bRank
              })
              const voiceMissing = !voices.some((v) => {
                return v.name === binding.voice
              })

              return (
                <div key={binding.id} className={`${BINDING_GRID} py-3`}>
                  <div className="relative">
                    {binding.langCode === settings.fallbackLang && (
                      <StarBadge className="absolute bottom-full left-0 mb-1">default</StarBadge>
                    )}
                    <select
                      value={binding.langCode}
                      onChange={(e) => {
                        setBinding(binding.id, { langCode: e.target.value })
                      }}
                      className="w-full min-w-0 truncate px-2 py-1.5 text-sm rounded-lg border border-mid-gray/40 bg-mid-gray/10 hover:bg-mid-gray/20 transition-colors"
                    >
                      {langOptions.map((l) => {
                        return (
                          <option key={l.code} value={l.code}>
                            {l.name}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                  <select
                    value={binding.voice}
                    onChange={(e) => {
                      setBinding(binding.id, { voice: e.target.value })
                    }}
                    className="w-full max-w-[190px] min-w-0 truncate px-2 py-1.5 text-sm rounded-lg border border-mid-gray/40 bg-mid-gray/10 hover:bg-mid-gray/20 transition-colors"
                  >
                    {voiceMissing && <option value={binding.voice}>{binding.voice} (missing)</option>}
                    {rowVoices.map((v) => {
                      return (
                        <option key={v.name} value={v.name}>
                          {v.name}
                        </option>
                      )
                    })}
                  </select>
                  <ShortcutInput
                    value={binding.shortcut}
                    hasConflict={hasConflictFor(binding.shortcut)}
                    onChange={(accel) => {
                      setBinding(binding.id, { shortcut: accel })
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      removeBinding(binding.id)
                    }}
                    title="Remove language"
                    className="justify-self-end p-1.5 rounded-md text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )
            })}
            <div className="px-4 py-3">
              <button
                type="button"
                onClick={addBinding}
                disabled={settings.languageBindings.length >= languageCatalogSingleton().list().length}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-mid-gray/10 hover:bg-mid-gray/25 transition-colors disabled:opacity-50"
              >
                <Plus size={14} />
                Add language
              </button>
            </div>
          </div>
        </div>
      </SettingsGroup>

      <SettingsGroup title="Other shortcuts">
        <Row title="Auto-detect" description="Read the selection; language detected from the text.">
          <ShortcutInput
            value={settings.autoShortcut}
            hasConflict={hasConflictFor(settings.autoShortcut)}
            disabled={isAutoDisabled}
            onChange={(accel) => {
              void update({ autoShortcut: accel })
            }}
          />
        </Row>
        <Row title="Default fallback language" description="Used when language detection fails.">
          <select
            value={fallbackSelectValue}
            disabled={isAutoDisabled}
            onChange={(e) => {
              void update({ fallbackLang: e.target.value })
            }}
            className="min-w-[150px] truncate px-2 py-1.5 text-sm rounded-lg border border-mid-gray/40 bg-mid-gray/10 hover:bg-mid-gray/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {fallbackSelectOptions}
          </select>
        </Row>
        <Row title="Stop" description="Stop reading immediately.">
          <ShortcutInput
            value={settings.stopShortcut}
            hasConflict={hasConflictFor(settings.stopShortcut)}
            onChange={(accel) => {
              void update({ stopShortcut: accel })
            }}
          />
        </Row>
      </SettingsGroup>

      <p className="text-xs text-text/50 leading-relaxed px-1">
        On macOS, reading the selection needs <strong>Automation</strong> permission (control of System Events) and may
        need <strong>Accessibility</strong> permission for Text Lantern (System Settings → Privacy &amp; Security),
        because it sends a Cmd+C to copy the selected text. Your clipboard is saved and restored around the grab.
      </p>
    </div>
  )

  function getFallbackSelectValue(params: { isAutoDisabled: boolean; fallbackLang: string }): string {
    if (params.isAutoDisabled) {
      return ''
    }

    return params.fallbackLang
  }

  function buildFallbackSelectOptions(params: {
    isAutoDisabled: boolean
    isFallbackMissing: boolean
    fallbackLang: string
    fallbackOptions: { code: string; name: string }[]
  }): React.JSX.Element {
    if (params.isAutoDisabled) {
      return <option value="">No languages</option>
    }

    return (
      <>
        {params.isFallbackMissing && (
          <option value={params.fallbackLang}>
            {languageCatalogSingleton().getDisplayName({ code: params.fallbackLang })} (missing)
          </option>
        )}
        {params.fallbackOptions.map((l) => {
          return (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          )
        })}
      </>
    )
  }

  function mergeBindingPatch(params: {
    binding: LanguageBinding
    id: string
    patch: Partial<LanguageBinding>
  }): LanguageBinding {
    if (params.binding.id !== params.id) {
      return params.binding
    }

    return { ...params.binding, ...params.patch }
  }

  function pickUnusedLangCode(params: { usedCodes: string[]; voices: { name: string; lang: string }[] }): string {
    const catalogCodes = new Set(
      languageCatalogSingleton()
        .list()
        .map((l) => {
          return l.code
        }),
    )
    const installedVoice = params.voices.find((v) => {
      return catalogCodes.has(v.lang) && !params.usedCodes.includes(v.lang)
    })
    if (installedVoice) {
      return installedVoice.lang
    }

    return (
      languageCatalogSingleton()
        .list()
        .find((l) => {
          return !params.usedCodes.includes(l.code)
        })?.code ?? ''
    )
  }

  function findVoiceForLangCode(params: { voices: { name: string; lang: string }[]; langCode: string }): string {
    const matched = params.voices.find((v) => {
      return v.lang === params.langCode
    })
    if (matched) {
      return matched.name
    }

    return params.voices[0]?.name ?? ''
  }

  function langMatchRank(params: { lang: string; langCode: string }): number {
    if (params.lang === params.langCode) {
      return 0
    }

    return 1
  }
}
