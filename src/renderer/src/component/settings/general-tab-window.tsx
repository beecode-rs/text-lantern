import { Row } from '#src/renderer/src/component/ui/row'
import { Select, type SelectOption } from '#src/renderer/src/component/ui/select'
import { SettingsGroup } from '#src/renderer/src/component/ui/settings-group'
import { Toggle } from '#src/renderer/src/component/ui/toggle'
import { useSettingsStore } from '#src/renderer/src/store/settings'
import type { ThemePreference } from '#src/shared/types'

const THEME_OPTIONS: SelectOption<ThemePreference>[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
]

export function GeneralTabWindow(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)

  if (!settings) {
    return <></>
  }

  return (
    <>
      <SettingsGroup title="Appearance" description="System follows your macOS appearance.">
        <Row title="Theme" description="Choose how Text Lantern looks.">
          <Select
            value={settings.theme}
            options={THEME_OPTIONS}
            onChange={(v) => {
              void update({ theme: v })
            }}
            ariaLabel="Theme"
          />
        </Row>
      </SettingsGroup>

      <SettingsGroup title="Window">
        <Row title="Start hidden" description="Keep the window hidden until opened from the tray.">
          <Toggle
            checked={settings.shouldStartHidden}
            onChange={(v) => {
              void update({ shouldStartHidden: v })
            }}
            ariaLabel="Start hidden"
          />
        </Row>
        <Row title="Close to tray" description="When off, closing the window quits the app.">
          <Toggle
            checked={settings.shouldCloseToTray}
            onChange={(v) => {
              void update({ shouldCloseToTray: v })
            }}
            ariaLabel="Close to tray"
          />
        </Row>
        <Row
          title="Experimental features"
          description="Show the Experimental section with features still being tested."
        >
          <Toggle
            checked={settings.isExperimentalFeaturesEnabled}
            onChange={(v) => {
              void update({ isExperimentalFeaturesEnabled: v })
            }}
            ariaLabel="Experimental features"
          />
        </Row>
      </SettingsGroup>
    </>
  )
}
