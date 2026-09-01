export function Slider({
  value,
  min,
  max,
  step,
  onChange,
  format,
  disabled,
}: {
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format?: (v: number) => string
  disabled?: boolean
}): React.JSX.Element {
  const display = formatValue({ format, value })
  const containerClassName = getContainerClassName({ isDisabled: disabled })

  return (
    <div className={containerClassName}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(Number(e.target.value))
        }}
        className="accent-logo-primary w-44 disabled:cursor-not-allowed"
      />
      <span className="text-xs tabular-nums w-14 text-right text-text/70">{display}</span>
    </div>
  )

  function getContainerClassName(params: { isDisabled?: boolean }): string {
    if (params.isDisabled) {
      return 'flex items-center gap-3 opacity-50'
    }

    return 'flex items-center gap-3'
  }

  function formatValue(params: { value: number; format?: (v: number) => string }): string {
    if (params.format) {
      return params.format(params.value)
    }

    return String(params.value)
  }
}
