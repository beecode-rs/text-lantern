import type { ReactNode } from 'react'
import { Star } from 'lucide-react'

export function StarBadge({
  children,
  className
}: {
  children: ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-logo-primary ${className ?? ''}`}
    >
      <Star size={11} />
      {children}
    </span>
  )
}
