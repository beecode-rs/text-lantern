import { RefreshCw, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'

import { api } from '#src/renderer/src/api'
import { ConfirmDialog } from '#src/renderer/src/component/ui/confirm-dialog'
import { Row } from '#src/renderer/src/component/ui/row'
import { SettingsGroup } from '#src/renderer/src/component/ui/settings-group'
import { platformSingleton } from '#src/renderer/src/lib/platform'
import { MacPermission, type MacPermissionResetResult } from '#src/shared/types'

type PermissionStatus = 'checking' | 'granted' | 'missing'

interface ResetOutcome {
  message: string
  success: boolean
}

const ALL_PERMISSIONS = [MacPermission.ACCESSIBILITY, MacPermission.AUTOMATION]

const PERMISSION_LABELS: Record<MacPermission, string> = {
  [MacPermission.ACCESSIBILITY]: 'Accessibility',
  [MacPermission.AUTOMATION]: 'Automation',
}

const buttonClassName =
  'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-mid-gray/40 bg-mid-gray/10 hover:bg-mid-gray/20 transition-colors disabled:opacity-60'

export function GeneralTabPermissions(): React.JSX.Element {
  const isMac = platformSingleton().isMac()
  const [statuses, setStatuses] = useState<Record<MacPermission, PermissionStatus>>({
    [MacPermission.ACCESSIBILITY]: 'checking',
    [MacPermission.AUTOMATION]: 'checking',
  })
  const [isConfirmVisible, setIsConfirmVisible] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [resetOutcome, setResetOutcome] = useState<ResetOutcome | null>(null)
  const [isDevBuild, setIsDevBuild] = useState(false)

  useEffect(() => {
    if (!isMac) {
      return
    }
    void checkPermissions()
    // Re-check when the user returns from System Settings, so a freshly granted
    // permission flips to green without clicking "Check again".
    const onFocus = (): void => {
      void checkPermissions()
    }
    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        void checkPermissions()
      }
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  if (!isMac) {
    return <></>
  }

  return (
    <>
      <SettingsGroup
        title="macOS permissions"
        description="Accessibility and Automation let Text Lantern copy the selected text. macOS ties these grants to the exact app binary, so after an update a switch can stay on in System Settings but no longer apply. Reset clears the old grants and asks for them again."
      >
        {isDevBuild && (
          <Row title="Development build" isStacked>
            <p className="text-xs text-text/55">
              When started with pnpm dev, macOS checks the terminal app that launched it (for example Ghostty or iTerm),
              not Electron. Grant Accessibility and Automation to that terminal, then restart pnpm dev.
            </p>
          </Row>
        )}

        <Row title="Status" description="Checked against the running app, not the System Settings toggles." isStacked>
          <div className="flex items-center gap-4">
            {ALL_PERMISSIONS.map((pane) => {
              return <PermissionBadge key={pane} pane={pane} status={statuses[pane]} />
            })}
            <button
              type="button"
              onClick={() => {
                void checkPermissions()
              }}
              aria-label="Check permissions again"
              className={buttonClassName}
            >
              <RefreshCw size={14} />
              Check again
            </button>
          </div>
        </Row>

        <Row
          title="Reset permissions"
          description="Clears the stored Accessibility and Automation grants and asks for them again. Approve the macOS prompts, or turn Text Lantern on in Privacy & Security → Accessibility."
        >
          <button
            type="button"
            disabled={isResetting || isDevBuild}
            onClick={() => {
              setIsConfirmVisible(true)
            }}
            className={buttonClassName}
          >
            <RotateCcw size={14} />
            {isResetting ? 'Resetting…' : 'Reset…'}
          </button>
        </Row>
      </SettingsGroup>

      {resetOutcome !== null && <p className={resolveOutcomeClassName(resetOutcome)}>{resetOutcome.message}</p>}

      {isConfirmVisible && (
        <ConfirmDialog
          title="Reset permissions?"
          message="This clears the Accessibility and Automation grants macOS stored for Text Lantern, then asks for them again. This cannot be undone."
          confirmLabel="Reset"
          onConfirm={() => {
            void resetPermissions()
          }}
          onCancel={() => {
            setIsConfirmVisible(false)
          }}
        />
      )}
    </>
  )

  async function checkPermissions(): Promise<void> {
    setStatuses({
      [MacPermission.ACCESSIBILITY]: 'checking',
      [MacPermission.AUTOMATION]: 'checking',
    })
    const { isDevBuild: isDev, missingMacPermissions: missing } = await api.checkMacPermissions()
    setIsDevBuild(isDev)
    setStatuses({
      [MacPermission.ACCESSIBILITY]: missing.includes(MacPermission.ACCESSIBILITY) ? 'missing' : 'granted',
      [MacPermission.AUTOMATION]: missing.includes(MacPermission.AUTOMATION) ? 'missing' : 'granted',
    })
  }

  async function resetPermissions(): Promise<void> {
    setIsConfirmVisible(false)
    setIsResetting(true)
    const result = await api.resetMacPermissions()
    setIsResetting(false)
    setResetOutcome({
      message: resolveResetMessage(result),
      success: result.success,
    })
    if (result.success) {
      await checkPermissions()
    }
  }
}

function resolveResetMessage(result: MacPermissionResetResult): string {
  if (result.success) {
    return 'Old grants cleared. Approve the macOS prompts, then come back here; the status updates on its own.'
  }

  return result.errorMessage ?? 'Reset failed.'
}

function resolveOutcomeClassName(outcome: ResetOutcome): string {
  if (outcome.success) {
    return 'text-xs text-text/70 px-1'
  }

  return 'text-xs text-red-500 px-1'
}

function PermissionBadge({ pane, status }: { pane: MacPermission; status: PermissionStatus }): React.JSX.Element {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-text/70"
      aria-label={`${PERMISSION_LABELS[pane]} ${status}`}
    >
      <span className={resolveDotClassName({ status })} />
      {PERMISSION_LABELS[pane]}
    </span>
  )
}

function resolveDotClassName(params: { status: PermissionStatus }): string {
  const base = 'h-2 w-2 rounded-full'
  switch (params.status) {
    case 'checking': {
      return `${base} bg-text/30 animate-pulse`
    }
    case 'granted': {
      return `${base} bg-emerald-500`
    }
    case 'missing': {
      return `${base} bg-red-500`
    }
    default: {
      return `${base} bg-text/30`
    }
  }
}
