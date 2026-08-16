import { useEffect, useState } from 'react'
import { acceleratorSingleton } from '@src/renderer/src/lib/accelerator'
import { formatSingleton } from '@src/renderer/src/lib/format'

export function ShortcutInput({
  value,
  onChange,
  conflict,
  disabled
}: {
  value: string
  onChange: (accel: string) => void
  conflict?: boolean
  disabled?: boolean
}): React.JSX.Element {
  const [listening, setListening] = useState(false)

  useEffect(() => {
    if (!listening) {
      return
    }
    const onKey = (e: KeyboardEvent): void => {
      const result = acceleratorSingleton().fromKeyboardEvent(e)
      if (!result) {
        return
      }
      if ('cancel' in result) {
        setListening(false)
        return
      }
      onChange(result.accel)
      setListening(false)
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
    }
  }, [listening, onChange])

  const baseClassName =
    'min-w-[150px] px-3 py-1.5 text-sm rounded-lg border transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed'
  const buttonClassName = getButtonClassName({ baseClassName, conflict, listening })
  const formatted = formatSingleton().formatAccelerator(value)

  let content: React.JSX.Element
  if (listening) {
    content = <span className="text-logo-primary">Press a shortcut…</span>
  } else if (conflict) {
    content = <span className="text-red-600 dark:text-red-400">{formatted || 'Not set'}</span>
  } else {
    content = <span>{formatted || 'Not set'}</span>
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        setListening((v) => {
          return !v
        })
      }}
      onBlur={() => {
        setListening(false)
      }}
      className={buttonClassName}
    >
      {content}
    </button>
  )

  function getButtonClassName(params: {
    baseClassName: string
    conflict?: boolean
    listening: boolean
  }): string {
    if (params.conflict) {
      return `${params.baseClassName} border-red-500/70 bg-red-500/10`
    }
    if (params.listening) {
      return `${params.baseClassName} border-logo-primary bg-logo-primary/10`
    }
    return `${params.baseClassName} border-mid-gray/40 bg-mid-gray/10 hover:bg-mid-gray/20`
  }
}
