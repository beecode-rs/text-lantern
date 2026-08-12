import { useSettingsStore } from '@src/renderer/src/store/settings'
import { useModelsStore } from '@src/renderer/src/store/models'
import { SettingsGroup, Row } from '@src/renderer/src/components/ui/SettingsGroup'
import { Toggle } from '@src/renderer/src/components/ui/Toggle'
import { Slider } from '@src/renderer/src/components/ui/Slider'

function VoiceSelect({
  value,
  voices,
  onChange
}: {
  value: string
  voices: string[]
  onChange: (v: string) => void
}): React.JSX.Element {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="max-w-[220px] truncate px-2 py-1.5 text-sm rounded-lg border border-mid-gray/40 bg-mid-gray/10 hover:bg-mid-gray/20 transition-colors"
    >
      {voices.includes(value) ? null : (
        <option value={value}>{value} (missing)</option>
      )}
      {voices.map((v) => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
    </select>
  )
}

export function GeneralSettings(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)
  const voices = useModelsStore((s) => s.voices)

  if (!settings) {
    return <></>
  }

  const srVoices = voices.filter((v) => v.lang === 'sr' || v.lang === 'other').map((v) => v.name)
  const enVoices = voices.filter((v) => v.lang === 'en' || v.lang === 'other').map((v) => v.name)

  const rateLabel = (r: number): string => {
    if (r > 1.15) return 'Slower'
    if (r < 0.9) return 'Faster'
    return 'Normal'
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-semibold">General</h1>
        <p className="text-sm text-text/55 mt-1">Voices, speech speed, and text cleaning.</p>
      </header>

      <SettingsGroup title="Voices" description="Default voice used for each language.">
        <Row title="Serbian voice">
          <VoiceSelect
            value={settings.voiceSr}
            voices={srVoices}
            onChange={(v) => update({ voiceSr: v })}
          />
        </Row>
        <Row title="English voice">
          <VoiceSelect
            value={settings.voiceEn}
            voices={enVoices}
            onChange={(v) => update({ voiceEn: v })}
          />
        </Row>
      </SettingsGroup>

      <SettingsGroup title="Speech" description="Length-scale maps to Piper's playback speed.">
        <Row title="Speed" description={`${settings.rate.toFixed(2)}× · ${rateLabel(settings.rate)}`}>
          <Slider
            value={settings.rate}
            min={0.6}
            max={1.6}
            step={0.05}
            onChange={(v) => update({ rate: v })}
            format={(v) => `${v.toFixed(2)}×`}
          />
        </Row>
      </SettingsGroup>

      <SettingsGroup title="Text cleaning" description="Applied before speaking.">
        <Row title="Clean text" description="Strip URLs, markdown, code, citations and brackets.">
          <Toggle
            checked={settings.cleanText}
            onChange={(v) => update({ cleanText: v })}
            ariaLabel="Clean text"
          />
        </Row>
        <Row title="Strip bracketed content" description="Delete the text inside ( ) [ ] { } entirely.">
          <Toggle
            checked={settings.stripBrackets}
            onChange={(v) => update({ stripBrackets: v })}
            ariaLabel="Strip brackets"
          />
        </Row>
        <Row title="Character cap" description="Maximum characters spoken (0 = unlimited).">
          <input
            type="number"
            min={0}
            value={settings.maxChars}
            onChange={(e) => update({ maxChars: Number(e.target.value) || 0 })}
            className="w-24 px-2 py-1 text-sm rounded-lg border border-mid-gray/40 bg-mid-gray/10 text-right"
          />
        </Row>
      </SettingsGroup>

      <SettingsGroup title="Window">
        <Row title="Start hidden" description="Keep the window hidden until opened from the tray.">
          <Toggle
            checked={settings.startHidden}
            onChange={(v) => update({ startHidden: v })}
            ariaLabel="Start hidden"
          />
        </Row>
        <Row title="Show tray icon" description="Show the menu-bar icon.">
          <Toggle
            checked={settings.showTray}
            onChange={(v) => update({ showTray: v })}
            ariaLabel="Show tray"
          />
        </Row>
      </SettingsGroup>
    </div>
  )
}
