import { useSettingsStore } from '@src/renderer/src/store/settings'
import { SettingsGroup, Row } from '@src/renderer/src/components/ui/SettingsGroup'
import { ShortcutInput } from '@src/renderer/src/components/ui/ShortcutInput'
import { formatService } from '@src/renderer/src/lib/format'
import { AlertTriangle } from 'lucide-react'
import type { Shortcuts } from '@src/shared/types'

type Key = keyof Shortcuts

const ORDER: { key: Key; description: string }[] = [
  { key: 'auto', description: 'Read the selection; language detected from the text.' },
  { key: 'sr', description: 'Read the selection with the Serbian voice.' },
  { key: 'en', description: 'Read the selection with the English voice.' },
  { key: 'stop', description: 'Stop reading immediately.' }
]

export function ShortcutsSettings(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)

  if (!settings) {
    return <></>
  }
  const sc = settings.shortcuts

  const counts = ORDER.reduce<Record<string, number>>((acc, { key }) => {
    const accel = sc[key]
    if (accel) {
      acc[accel] = (acc[accel] ?? 0) + 1
    }
    return acc
  }, {})
  const hasConflict = Object.values(counts).some((n) => n > 1)

  const setShortcut = (key: Key, accel: string): void => {
    update({ shortcuts: { ...sc, [key]: accel } })
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-semibold">Shortcuts</h1>
        <p className="text-sm text-text/55 mt-1">Global hotkeys — one per language, plus stop.</p>
      </header>

      {hasConflict && (
        <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/40 rounded-lg px-3 py-2">
          <AlertTriangle size={16} />
          Two actions share a shortcut. Pick a different combination for each.
        </div>
      )}

      <SettingsGroup title="Global shortcuts">
        {ORDER.map(({ key, description }) => (
          <Row key={key} title={formatService.prettyLang(key)} description={description}>
            <ShortcutInput
              value={sc[key]}
              conflict={!!sc[key] && counts[sc[key]] > 1}
              onChange={(accel) => setShortcut(key, accel)}
            />
          </Row>
        ))}
      </SettingsGroup>

      <p className="text-xs text-text/50 leading-relaxed px-1">
        On macOS, reading the selection needs <strong>Accessibility</strong> permission for TTS Reader
        (System Settings → Privacy &amp; Security → Accessibility), because it sends a Cmd+C to copy the
        selected text. Your clipboard is saved and restored around the grab.
      </p>
    </div>
  )
}
