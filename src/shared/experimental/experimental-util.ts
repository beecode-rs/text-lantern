import type { Settings } from '#src/shared/types'

export const experimentalUtil = {
  isCosyvoiceActive(params: { settings: Settings | null }): boolean {
    if (params.settings === null) {
      return false
    }

    return params.settings.isExperimentalFeaturesEnabled && params.settings.isCosyvoiceEnabled
  },
}
