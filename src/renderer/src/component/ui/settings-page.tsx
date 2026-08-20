import type { ReactNode } from 'react'

export function SettingsPage({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className="w-full min-w-[670px] flex flex-col gap-5">{children}</div>
}
