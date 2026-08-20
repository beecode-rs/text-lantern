import { Info } from 'lucide-react'
import type { ReactNode } from 'react'

export function InfoTooltip({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <span className="relative inline-flex group align-middle">
      <Info size={14} className="text-text/40 cursor-help" tabIndex={0} />
      <span className="absolute left-1/2 top-full z-10 hidden w-64 -translate-x-1/2 pt-2 group-hover:block group-focus-within:block">
        <span className="absolute left-1/2 top-1 h-2 w-2 -translate-x-1/2 rotate-45 rounded-[2px] border-l border-t border-mid-gray/30 bg-background" />
        <span className="relative block rounded-lg border border-mid-gray/30 bg-background px-3 py-2.5 text-xs leading-relaxed text-text/80 shadow-lg">
          {children}
        </span>
      </span>
    </span>
  )
}
