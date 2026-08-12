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
    const { shortcuts } = settingsService.get()
    ;(Object.keys(shortcuts) as (keyof typeof shortcuts)[]).forEach((key) => {
      const accel = shortcuts[key]
      if (!accel) {
        return
      }
      const registered = globalShortcut.register(accel, () => {
        if (key === 'stop') {
          void ttsService.stop()
          return
        }
        void ttsService.speak({ lang: key as Lang, settings: settingsService.get() })
      })
      if (!registered) {
        console.warn(
          `[shortcuts] could not register “${key}” = ${accel} (conflict with another app?)`
        )
      }
    })
  },

  unregisterAll(): void {
    _unregisterGlobalShortcutsIfAppReady()
  }
}
