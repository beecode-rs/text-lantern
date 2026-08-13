import { useEffect, useState } from 'react'
import { acceleratorService } from '@src/renderer/src/lib/accelerator'
import { formatService } from '@src/renderer/src/lib/format'

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
      const result = acceleratorService.fromKeyboardEvent(e)
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

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        setListening((v) => {
          return !v
        })
      }}
      onBlur={() => setListening(false)}
      className={`min-w-[150px] px-3 py-1.5 text-sm rounded-lg border transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed ${
        conflict
          ? 'border-red-500/70 bg-red-500/10'
          : listening
            ? 'border-logo-primary bg-logo-primary/10'
            : 'border-mid-gray/40 bg-mid-gray/10 hover:bg-mid-gray/20'
      }`}
    >
      {listening ? (
        <span className="text-logo-primary">Press a shortcut…</span>
      ) : (
        <span className={conflict ? 'text-red-600 dark:text-red-400' : ''}>
          {formatService.formatAccelerator(value) || 'Not set'}
        </span>
      )}
    </button>
  )
}
