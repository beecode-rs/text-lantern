export function DownloadRow({
  name,
  progress
}: {
  name: string
  progress: number
}): React.JSX.Element {
  const pct = Math.round(progress * 100)
  return (
    <div className="px-4 py-3 border border-logo-primary/40 rounded-xl bg-logo-primary/5">
      <div className="flex items-center justify-between text-sm">
        <span className="truncate selectable">{name}</span>
        <span className="tabular-nums text-text/60">{pct}%</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-mid-gray/25 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-logo-primary to-accent transition-[width] duration-150"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
