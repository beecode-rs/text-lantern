import { globalShortcut } from 'electron'
import { ttsService } from './tts'
import { settingsService } from './settings'
import type { Lang } from '../shared/types'

function registerAll(): void {
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
}

function unregisterAll(): void {
  globalShortcut.unregisterAll()
}

export const shortcutsService = {
  registerAll,
  unregisterAll
}
