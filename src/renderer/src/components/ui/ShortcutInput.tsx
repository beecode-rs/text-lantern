import { useEffect, useState } from 'react'
import { formatService } from '@src/renderer/src/lib/format'

function eventToAccelerator(e: KeyboardEvent): { accel: string } | { cancel: true } | null {
  if (e.key === 'Escape') {
    return { cancel: true }
  }
  if (['Meta', 'Control', 'Alt', 'Shift', 'Fn'].includes(e.key)) {
    return null
  }
  const parts: string[] = []
  if (e.metaKey || e.ctrlKey) {
    parts.push('CommandOrControl')
  }
  if (e.altKey) {
    parts.push('Alt')
  }
  if (e.shiftKey) {
    parts.push('Shift')
  }
  if (parts.length === 0) {
    return null
  }
  let key = e.key
  if (e.key === ' ') {
    key = 'Space'
  }
  if (key.length === 1) {
    key = key.toUpperCase()
  }
  parts.push(key)
  e.preventDefault()
  e.stopPropagation()
  return { accel: parts.join('+') }
}

export function ShortcutInput({
  value,
  onChange,
  conflict
}: {
  value: string
  onChange: (accel: string) => void
  conflict?: boolean
}): React.JSX.Element {
  const [listening, setListening] = useState(false)

  useEffect(() => {
    if (!listening) {
      return
    }
    const onKey = (e: KeyboardEvent): void => {
      const result = eventToAccelerator(e)
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
      onClick={() => setListening((v) => !v)}
      onBlur={() => setListening(false)}
      className={`min-w-[150px] px-3 py-1.5 text-sm rounded-lg border transition-colors text-left ${
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
