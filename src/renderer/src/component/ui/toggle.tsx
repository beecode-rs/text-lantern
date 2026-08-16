export function Toggle({
  checked,
  onChange,
  ariaLabel
}: {
  checked: boolean
  onChange: (v: boolean) => void
  ariaLabel?: string
}): React.JSX.Element {
  const trackBaseClassName = 'relative h-6 w-10 shrink-0 rounded-full transition-colors'
  const trackClassName = getTrackClassName({ baseClassName: trackBaseClassName, checked })
  const knobBaseClassName =
    'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform'
  const knobClassName = getKnobClassName({ baseClassName: knobBaseClassName, checked })

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => {
        onChange(!checked)
      }}
      className={trackClassName}
    >
      <span className={knobClassName} />
    </button>
  )

  function getTrackClassName(params: { baseClassName: string; checked: boolean }): string {
    if (params.checked) {
      return `${params.baseClassName} bg-logo-primary`
    }
    return `${params.baseClassName} bg-mid-gray/40`
  }

  function getKnobClassName(params: { baseClassName: string; checked: boolean }): string {
    if (params.checked) {
      return `${params.baseClassName} translate-x-4`
    }
    return `${params.baseClassName} translate-x-0`
  }
}
