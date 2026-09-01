import { Volume2 } from 'lucide-react'
import { useRef } from 'react'

import { Row } from '#src/renderer/src/component/ui/row'
import { SettingsGroup } from '#src/renderer/src/component/ui/settings-group'
import { Slider } from '#src/renderer/src/component/ui/slider'
import { Toggle } from '#src/renderer/src/component/ui/toggle'
import { WaitingBeeper } from '#src/renderer/src/lib/waiting-beeper'
import { useSettingsStore } from '#src/renderer/src/store/settings'

export function GeneralTabSpeech(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings)
  const beeperRef = useRef<WaitingBeeper | null>(null)
  beeperRef.current ??= new WaitingBeeper()
  const update = useSettingsStore((s) => s.update)

  if (!settings) {
    return <></>
  }

  return (
    <>
      <SettingsGroup title="Speech" description="Higher reads faster. 1.0× is normal speed.">
        <Row title="Speed" description={getSpeedDescription({ rate: settings.rate })}>
          <Slider
            value={settings.rate}
            min={0.5}
            max={3}
            step={0.05}
            onChange={(v) => {
              void update({ rate: v })
            }}
            format={(v) => {
              return `${v.toFixed(2)}×`
            }}
          />
        </Row>
        <Row
          title="Start delay"
          description="A short pause before speaking begins, so Bluetooth headphones have time to wake up and don't cut off the first word."
        >
          <Slider
            value={settings.playbackStartDelayMs}
            min={0}
            max={2000}
            step={50}
            onChange={(v) => {
              void update({ playbackStartDelayMs: v })
            }}
            format={(v) => {
              return `${Math.round(v).toString()} ms`
            }}
          />
        </Row>
      </SettingsGroup>

      <SettingsGroup
        title="Audio feedback"
        description="A soft repeating tone while the voice model is loading, so you know the app is working."
      >
        <Row title="Loading bleep" description="Plays only when loading takes longer than a second.">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                beeperRef.current?.preview()
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-mid-gray/40 bg-mid-gray/10 hover:bg-mid-gray/20 transition-colors"
            >
              <Volume2 size={13} />
              Preview
            </button>
            <Toggle
              checked={settings.shouldBleepWhileLoadingModel}
              onChange={(v) => {
                void update({ shouldBleepWhileLoadingModel: v })
              }}
              ariaLabel="Loading bleep"
            />
          </div>
        </Row>
      </SettingsGroup>

      <SettingsGroup title="Text cleaning" description="Applied before speaking.">
        <Row title="Clean text" description="Strip URLs, markdown, code, citations and brackets.">
          <Toggle
            checked={settings.shouldCleanText}
            onChange={(v) => {
              void update({ shouldCleanText: v })
            }}
            ariaLabel="Clean text"
          />
        </Row>
        <Row title="Strip bracketed content" description="Delete the text inside ( ) [ ] { } entirely.">
          <Toggle
            checked={settings.shouldStripBrackets}
            onChange={(v) => {
              void update({ shouldStripBrackets: v })
            }}
            ariaLabel="Strip brackets"
          />
        </Row>
        <Row title="Character cap" description="Maximum characters spoken (0 = unlimited).">
          <input
            type="number"
            min={0}
            value={settings.maxChars}
            onChange={(e) => {
              void update({ maxChars: Number(e.target.value) || 0 })
            }}
            className="w-24 px-2 py-1 text-sm rounded-lg border border-mid-gray/40 bg-mid-gray/10 text-right"
          />
        </Row>
      </SettingsGroup>
    </>
  )

  function getSpeedDescription(params: { rate: number }): string {
    if (params.rate > 1.001) {
      return `${params.rate.toFixed(2)}× · Faster`
    }
    if (params.rate < 0.999) {
      return `${params.rate.toFixed(2)}× · Slower`
    }

    return `${params.rate.toFixed(2)}× · Normal`
  }
}
