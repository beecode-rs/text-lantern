import { Row } from '#src/renderer/src/component/ui/row'
import { SettingsGroup } from '#src/renderer/src/component/ui/settings-group'
import { SettingsPage } from '#src/renderer/src/component/ui/settings-page'
import { Toggle } from '#src/renderer/src/component/ui/toggle'
import { useSettingsStore } from '#src/renderer/src/store/settings'

export function ExperimentalSettings(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)

  if (!settings) {
    return <></>
  }

  return (
    <SettingsPage>
      <header>
        <h1 className="text-xl font-semibold">Experimental</h1>
        <p className="text-sm text-text/55 mt-1">
          Features still being tested. They may be unstable or change without notice.
        </p>
      </header>

      <SettingsGroup title="Experimental features" description="Off by default. Turn on only what you want to try.">
        <Row
          title="CosyVoice voice cloning"
          description="Show the CosyVoice provider and its cloned voices in Models. Speech synthesis is much slower than other providers, but it lets you clone a voice from an audio sample."
        >
          <Toggle
            checked={settings.isCosyvoiceEnabled}
            onChange={(v) => {
              void update({ isCosyvoiceEnabled: v })
            }}
            ariaLabel="CosyVoice voice cloning"
          />
        </Row>
      </SettingsGroup>
    </SettingsPage>
  )
}
