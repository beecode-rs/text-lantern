import { KokoroPage } from '#src/renderer/src/component/settings/kokoro-page'
import { PiperPage } from '#src/renderer/src/component/settings/piper-page'
import { TtsProvider } from '#src/shared/types'

export interface ProviderPageProps {
  downloadingIds: string[]
  installedIds: Set<string>
}

export interface ProviderPage {
  component: (props: ProviderPageProps) => React.JSX.Element
}

export const PROVIDER_PAGES: Record<TtsProvider, ProviderPage> = {
  [TtsProvider.PIPER]: { component: PiperPage },
  [TtsProvider.KOKORO]: { component: KokoroPage },
}
