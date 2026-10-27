import { type UpdateAsset, type UpdateInstallType } from '#src/shared/types'

const DEB_INSTALL_CANCELLED_EXIT_CODE = 126

const DEB_INSTALL_UNAUTHORIZED_EXIT_CODE = 127

const INSTALL_TYPE_ASSET_SUFFIXES: Record<UpdateInstallType, string[]> = {
  appImage: ['.AppImage'],
  deb: ['.deb'],
  dev: ['.AppImage', '.deb'],
  dmg: ['.dmg'],
  exe: ['.exe'],
  unsupported: [],
}

const VERSION_PREFIX_PATTERN = /^v/

export const versionUtil = {
  isNewerVersion(params: { candidate: string; current: string }): boolean {
    const { candidate, current } = params
    const candidateNumbers = candidate
      .replace(VERSION_PREFIX_PATTERN, '')
      .split('.')
      .map((segment) => {
        return Number(segment)
      })
    const currentNumbers = current
      .replace(VERSION_PREFIX_PATTERN, '')
      .split('.')
      .map((segment) => {
        return Number(segment)
      })
    const segmentCount = Math.max(candidateNumbers.length, currentNumbers.length)
    const segmentDifferences = Array.from({ length: segmentCount }, (_segment, index) => {
      return (candidateNumbers[index] ?? 0) - (currentNumbers[index] ?? 0)
    })
    const firstDifference = segmentDifferences.find((difference) => {
      return difference !== 0
    })

    return firstDifference !== undefined && firstDifference > 0
  },

  normalizeVersion(params: { version: string }): string {
    const { version } = params

    return version.replace(VERSION_PREFIX_PATTERN, '')
  },

  selectUpdateAsset(params: { assets: UpdateAsset[]; installType: UpdateInstallType }): UpdateAsset | null {
    const { assets, installType } = params
    const preferredSuffixes = INSTALL_TYPE_ASSET_SUFFIXES[installType]
    const matchedAsset = preferredSuffixes
      .map((suffix) => {
        return assets.find((asset) => {
          return asset.name.endsWith(suffix)
        })
      })
      .find((asset) => {
        return asset !== undefined
      })

    return matchedAsset ?? null
  },

  toDebInstallOutcome(params: {
    exitCode: number | null
    isSpawnFailed: boolean
  }): 'fallback' | 'failed' | 'installed' {
    const { exitCode, isSpawnFailed } = params

    if (isSpawnFailed) {
      return 'fallback'
    }

    if (exitCode === 0) {
      return 'installed'
    }

    if (exitCode === DEB_INSTALL_CANCELLED_EXIT_CODE || exitCode === DEB_INSTALL_UNAUTHORIZED_EXIT_CODE) {
      return 'fallback'
    }

    return 'failed'
  },

  toInstallType(params: { appImagePath: string | null; isPackaged: boolean; platform: string }): UpdateInstallType {
    const { appImagePath, isPackaged, platform } = params

    if (platform === 'darwin') {
      return 'dmg'
    }

    if (platform === 'win32') {
      return 'exe'
    }

    if (platform !== 'linux') {
      return 'unsupported'
    }

    if (!isPackaged) {
      return 'dev'
    }

    if (appImagePath !== null) {
      return 'appImage'
    }

    return 'deb'
  },
}
