export interface SelectOption<Value extends string> {
  value: Value
  label: string
}

export function Select<Value extends string>({
  value,
  options,
  onChange,
  ariaLabel
}: {
  value: Value
  options: SelectOption<Value>[]
  onChange: (value: Value) => void
  ariaLabel?: string
}): React.JSX.Element {
  return (
    <select
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => {
        onChange(e.target.value as Value)
      }}
      className="px-2 py-1 text-sm rounded-lg border border-mid-gray/40 bg-mid-gray/10"
    >
      {options.map((option) => {
        return (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        )
      })}
    </select>
  )
}
