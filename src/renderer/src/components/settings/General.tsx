import { useSettingsStore } from '@src/renderer/src/store/settings'
import { SettingsGroup, Row } from '@src/renderer/src/components/ui/SettingsGroup'
import { Toggle } from '@src/renderer/src/components/ui/Toggle'
import { Slider } from '@src/renderer/src/components/ui/Slider'

export function GeneralSettings(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)

  if (!settings) {
    return <></>
  }

  const rateLabel = (r: number): string => {
    if (r > 1.001) return 'Faster'
    if (r < 0.999) return 'Slower'
    return 'Normal'
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-semibold">General</h1>
        <p className="text-sm text-text/55 mt-1">Speech speed and text cleaning.</p>
      </header>

      <SettingsGroup title="Speech" description="Higher reads faster. 1.0× is normal speed.">
        <Row title="Speed" description={`${settings.rate.toFixed(2)}× · ${rateLabel(settings.rate)}`}>
          <Slider
            value={settings.rate}
            min={0.5}
            max={3}
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
      </SettingsGroup>
    </div>
  )
}
