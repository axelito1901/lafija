import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/barlow/400.css'
import '@fontsource/barlow/500.css'
import '@fontsource/barlow/600.css'
import '@fontsource/barlow-semi-condensed/600.css'
import '@fontsource/barlow-semi-condensed/700.css'
import './index.css'
import App from './App'
import { StoreProvider } from './lib/store'
import { FeedbackProvider } from './ui/kit'
import { applyBig, applyTheme } from './lib/theme'
import { registerSW } from './lib/push'

applyTheme(localStorage.getItem('lafija-theme') || 'system')
applyBig(localStorage.getItem('lafija-big') === '1')
createRoot(document.getElementById('root')).render(
  <StrictMode><FeedbackProvider><StoreProvider><App /></StoreProvider></FeedbackProvider></StrictMode>
)
registerSW()
