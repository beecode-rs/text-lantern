import { app, globalShortcut } from 'electron'
import { ttsService } from '@src/main/business/service/tts-service'
import { settingsService } from '@src/main/business/service/settings-service'

function _unregisterGlobalShortcutsIfAppReady(): void {
  if (!app.isReady()) {
    return
  }
  globalShortcut.unregisterAll()
}

function _registerShortcut(params: { accel: string; action: () => void; label: string }): void {
  try {
    const registered = globalShortcut.register(params.accel, params.action)
    if (registered) {
      return
    }
    console.warn(
      `[shortcuts] could not register "${params.label}" = ${params.accel} (conflict with another app?)`
    )
  } catch (err) {
    console.warn(`[shortcuts] skipped invalid "${params.label}" = ${params.accel}:`, err)
  }
}

export const shortcutsService = {
  registerAll(): void {
    globalShortcut.unregisterAll()
    const settings = settingsService.get()
    settings.languageBindings.forEach((binding) => {
      if (!binding.shortcut) {
        return
      }
      _registerShortcut({
        accel: binding.shortcut,
        label: `lang:${binding.langCode}`,
        action: () => {
          void ttsService.speak({ lang: binding.langCode, settings: settingsService.get() })
        }
      })
    })
    if (settings.autoShortcut) {
      _registerShortcut({
        accel: settings.autoShortcut,
        label: 'auto',
        action: () => {
          void ttsService.speak({ lang: 'auto', settings: settingsService.get() })
        }
      })
    }
    if (settings.stopShortcut) {
      _registerShortcut({
        accel: settings.stopShortcut,
        label: 'stop',
        action: () => {
          void ttsService.stop()
        }
      })
    }
  },

  unregisterAll(): void {
    _unregisterGlobalShortcutsIfAppReady()
  }
}
