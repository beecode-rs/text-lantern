import { app, globalShortcut } from 'electron'
import { ttsService } from '@src/main/tts'
import { settingsService } from '@src/main/settings'
import type { Lang } from '@src/shared/types'

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
    // globalShortcut cannot be used before the app is ready. The before-quit /
    // will-quit handlers can fire early (e.g. a second instance failing to get
    // the single-instance lock calls app.quit() during module load), so guard
    // against that — nothing was registered before ready anyway.
    if (!app.isReady()) return
    globalShortcut.unregisterAll()
  }
}
