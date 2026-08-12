export function Slider({
  value,
  min,
  max,
  step,
  onChange,
  format
}: {
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format?: (v: number) => string
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-logo-primary w-44"
      />
      <span className="text-xs tabular-nums w-14 text-right text-text/70">
        {format ? format(value) : value}
      </span>
    </div>
  )
}
