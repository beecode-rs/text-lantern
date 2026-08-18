import { useEffect, useState } from 'react'

import { acceleratorSingleton } from '#src/renderer/src/lib/accelerator'
import { formatSingleton } from '#src/renderer/src/lib/format'

export function ShortcutInput({
  value,
  onChange,
  hasConflict,
  disabled,
}: {
  value: string
  onChange: (accel: string) => void
  hasConflict?: boolean
  disabled?: boolean
}): React.JSX.Element {
  const [isListening, setIsListening] = useState(false)

  useEffect(() => {
    if (!isListening) {
      return
    }
    const onKey = (e: KeyboardEvent): void => {
      const result = acceleratorSingleton().fromKeyboardEvent(e)
      if (!result) {
        return
      }
      if ('cancel' in result) {
        setIsListening(false)

        return
      }
      onChange(result.accel)
      setIsListening(false)
    }
    window.addEventListener('keydown', onKey, true)

    return () => {
      window.removeEventListener('keydown', onKey, true)
    }
  }, [isListening, onChange])

  const baseClassName =
    'min-w-[150px] px-3 py-1.5 text-sm rounded-lg border transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed'
  const buttonClassName = getButtonClassName({ baseClassName, hasConflict, isListening })
  const formatted = formatSingleton().formatAccelerator(value)

  let content: React.JSX.Element
  if (isListening) {
    content = <span className="text-logo-primary">Press a shortcut…</span>
  } else if (hasConflict) {
    content = <span className="text-red-600 dark:text-red-400">{formatted || 'Not set'}</span>
  } else {
    content = <span>{formatted || 'Not set'}</span>
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        setIsListening((v) => {
          return !v
        })
      }}
      onBlur={() => {
        setIsListening(false)
      }}
      className={buttonClassName}
    >
      {content}
    </button>
  )

  function getButtonClassName(params: { baseClassName: string; hasConflict?: boolean; isListening: boolean }): string {
    if (params.hasConflict) {
      return `${params.baseClassName} border-red-500/70 bg-red-500/10`
    }
    if (params.isListening) {
      return `${params.baseClassName} border-logo-primary bg-logo-primary/10`
    }

    return `${params.baseClassName} border-mid-gray/40 bg-mid-gray/10 hover:bg-mid-gray/20`
  }
}
