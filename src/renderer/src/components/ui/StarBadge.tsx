import type { ReactNode } from 'react'
import { Star } from 'lucide-react'

export function StarBadge({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-logo-primary">
      <Star size={11} />
      {children}
    </span>
  )
}
