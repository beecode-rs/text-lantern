import { app, globalShortcut } from 'electron'
import { ttsService } from '@src/main/business/service/tts-service'
import { settingsService } from '@src/main/business/service/settings-service'
import type { Lang } from '@src/shared/types'

function _unregisterGlobalShortcutsIfAppReady(): void {
  if (!app.isReady()) {
    return
  }
  globalShortcut.unregisterAll()
}

export const shortcutsService = {
  registerAll(): void {
    globalShortcut.unregisterAll()
    const settings = settingsService.get()
    settings.languageBindings.forEach((binding) => {
      if (!binding.shortcut) {
        return
      }
      const registered = globalShortcut.register(binding.shortcut, () => {
        void ttsService.speak({ lang: binding.langCode, settings: settingsService.get() })
      })
      if (!registered) {
        console.warn(
          `[shortcuts] could not register "${binding.shortcut}" (conflict with another app?)`
        )
      }
    })
    if (settings.autoShortcut) {
      const registered = globalShortcut.register(settings.autoShortcut, () => {
        void ttsService.speak({ lang: 'auto', settings: settingsService.get() })
      })
      if (!registered) {
        console.warn(
          `[shortcuts] could not register "auto" = ${settings.autoShortcut} (conflict with another app?)`
        )
      }
    }
    if (settings.stopShortcut) {
      const registered = globalShortcut.register(settings.stopShortcut, () => {
        void ttsService.stop()
      })
      if (!registered) {
        console.warn(
          `[shortcuts] could not register "stop" = ${settings.stopShortcut} (conflict with another app?)`
        )
      }
    }
  },

  unregisterAll(): void {
    _unregisterGlobalShortcutsIfAppReady()
  }
}
