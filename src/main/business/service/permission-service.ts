import { singletonPattern } from '@beecode/msh-util/singleton/pattern'
import { app, systemPreferences } from 'electron'
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

import { Selection } from '#src/main/lib/selection'
import { constant } from '#src/main/util/constants'
import { logger } from '#src/main/util/logger'
import { type MacPermissionReport, type MacPermissionResetResult } from '#src/shared/types'

const BUNDLE_ID_PATTERN = /<key>CFBundleIdentifier<\/key>\s*<string>([^<]+)<\/string>/

export class PermissionService {
  async checkMacPermissions(): Promise<MacPermissionReport> {
    const missingMacPermissions = await new Selection().checkMissingPermissions()

    return { isDevBuild: !app.isPackaged, missingMacPermissions }
  }

  async requestMacPermissionsOnLaunch(): Promise<void> {
    if (process.platform !== 'darwin') {
      return
    }
    if (app.isPackaged && !systemPreferences.isTrustedAccessibilityClient(false)) {
      await this._clearStaleTccGrant({ service: constant().macPermissions.accessibilityTccService })
    }
    this._requestMacPermissions()
  }

  async resetMacPermissions(): Promise<MacPermissionResetResult> {
    if (process.platform !== 'darwin') {
      return { errorMessage: 'Permissions can only be reset on macOS.', success: false }
    }
    if (!app.isPackaged) {
      return {
        errorMessage: 'In a dev build macOS checks the terminal that started pnpm dev. Grant the permissions there.',
        success: false,
      }
    }

    const { accessibilityTccService, automationTccService } = constant().macPermissions
    const tccServices = [accessibilityTccService, automationTccService]
    const results = await Promise.allSettled(
      tccServices.map((service) => {
        return this._resetTccService({ bundleId: this._resolveBundleId(), service })
      }),
    )
    const failures = tccServices.filter((_service, index) => {
      return results[index].status === 'rejected'
    })
    if (failures.length > 0) {
      logger().error(`Failed to reset macOS permissions: ${failures.join(', ')}`)

      return { errorMessage: `macOS could not reset: ${failures.join(', ')}.`, success: false }
    }

    this._requestMacPermissions()

    return { errorMessage: null, success: true }
  }

  protected _requestMacPermissions(): void {
    systemPreferences.isTrustedAccessibilityClient(true)
    void new Selection().warmUp().catch(() => {
      return undefined
    })
  }

  protected async _clearStaleTccGrant(params: { service: string }): Promise<void> {
    const { service } = params
    try {
      await this._resetTccService({ bundleId: this._resolveBundleId(), service })
    } catch (error) {
      logger().warn(`Could not clear the stale ${service} grant:`, error)
    }
  }

  protected _resetTccService(params: { bundleId: string; service: string }): Promise<void> {
    const { bundleId, service } = params

    return new Promise((resolve, reject) => {
      execFile('/usr/bin/tccutil', ['reset', service, bundleId], (err, _stdout, stderr) => {
        if (err) {
          reject(new Error(stderr || err.message))

          return
        }
        resolve()
      })
    })
  }

  protected _resolveBundleId(): string {
    return this._readBundleIdFromPlist() ?? constant().macPermissions.fallbackBundleId
  }

  protected _readBundleIdFromPlist(): string | undefined {
    const plistPath = path.join(path.dirname(process.execPath), '..', 'Info.plist')
    try {
      const content = fs.readFileSync(plistPath, 'utf8')

      return BUNDLE_ID_PATTERN.exec(content)?.[1]
    } catch {
      return undefined
    }
  }
}

export const permissionServiceSingleton = singletonPattern(() => {
  return new PermissionService()
})
