import { singletonPattern } from '@beecode/msh-util/singleton/pattern'
import { ttsServiceSingleton } from '@src/main/business/service/tts-service'
import { settingsDalSingleton } from '@src/main/dal/settings-dal'
import { logger } from '@src/main/util/logger'
import { app, globalShortcut } from 'electron'

export class Shortcuts {
  registerAll(): void {
    globalShortcut.unregisterAll()
    const settings = settingsDalSingleton().get()
    settings.languageBindings.forEach((binding) => {
      if (!binding.shortcut) {
        return
      }
      this._registerShortcut({
        accel: binding.shortcut,
        action: () => {
          void ttsServiceSingleton().speak({ lang: binding.langCode, settings: settingsDalSingleton().get() })
        },
        label: `lang:${binding.langCode}`,
      })
    })
    if (settings.autoShortcut) {
      this._registerShortcut({
        accel: settings.autoShortcut,
        action: () => {
          void ttsServiceSingleton().speak({ lang: 'auto', settings: settingsDalSingleton().get() })
        },
        label: 'auto',
      })
    }
    if (settings.stopShortcut) {
      this._registerShortcut({
        accel: settings.stopShortcut,
        action: () => {
          void ttsServiceSingleton().stop()
        },
        label: 'stop',
      })
    }
  }

  unregisterAll(): void {
    this._unregisterGlobalShortcutsIfAppReady()
  }

  protected _unregisterGlobalShortcutsIfAppReady(): void {
    if (!app.isReady()) {
      return
    }
    globalShortcut.unregisterAll()
  }

  protected _registerShortcut(params: { accel: string; action: () => void; label: string }): void {
    try {
      const registered = globalShortcut.register(params.accel, params.action)
      if (registered) {
        return
      }
      logger().warn(`could not register "${params.label}" = ${params.accel} (conflict with another app?)`)
    } catch (err) {
      logger().warn(`skipped invalid "${params.label}" = ${params.accel}:`, err)
    }
  }
}

export const shortcutsSingleton = singletonPattern(() => new Shortcuts())
