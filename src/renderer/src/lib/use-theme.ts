import { useEffect } from 'react'

import type { ThemePreference } from '#src/shared/types'

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

export function useTheme(theme: ThemePreference | undefined): void {
  useEffect(() => {
    if (theme === undefined) {
      return
    }

    const applyDarkTheme = (isDark: boolean): void => {
      document.documentElement.classList.toggle('dark', isDark)
    }

    const systemPrefersDark = window.matchMedia(DARK_MEDIA_QUERY)

    const syncTheme = (): void => {
      if (theme === 'dark') {
        applyDarkTheme(true)

        return
      }
      if (theme === 'light') {
        applyDarkTheme(false)

        return
      }
      applyDarkTheme(systemPrefersDark.matches)
    }

    syncTheme()

    if (theme !== 'system') {
      return
    }

    systemPrefersDark.addEventListener('change', syncTheme)

    return () => {
      systemPrefersDark.removeEventListener('change', syncTheme)
    }
  }, [theme])
}
