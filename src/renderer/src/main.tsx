import { createRoot } from 'react-dom/client'

import App from '#src/renderer/src/app'
import { GrammarReviewPage } from '#src/renderer/src/component/grammar/grammar-review-page'
import '#src/renderer/src/style/theme.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root container #root not found')
}

const root = createRoot(container)

const renderRoute = (): void => {
  if (window.location.hash === '#grammar') {
    root.render(<GrammarReviewPage />)

    return
  }

  root.render(<App />)
}

renderRoute()
window.addEventListener('hashchange', renderRoute)
