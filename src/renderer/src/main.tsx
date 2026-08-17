import App from '@src/renderer/src/app'
import { createRoot } from 'react-dom/client'
import '@src/renderer/src/style/theme.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root container #root not found')
}

createRoot(container).render(<App />)
