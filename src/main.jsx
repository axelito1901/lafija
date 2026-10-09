import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/barlow/400.css'
import '@fontsource/barlow/500.css'
import '@fontsource/barlow/600.css'
import '@fontsource/barlow-semi-condensed/600.css'
import '@fontsource/barlow-semi-condensed/700.css'
import './index.css'
import './premium.css'
import App from './App'
import { LazyMotion } from 'motion/react'
import { StoreProvider } from './lib/store'
import { FeedbackProvider } from './ui/kit'
import { applyBig, applyTheme } from './lib/theme'
import { registerSW } from './lib/push'

applyTheme(localStorage.getItem('lafija-theme') || 'system')
applyBig(localStorage.getItem('lafija-big') === '1')
createRoot(document.getElementById('root')).render(
  <StrictMode><LazyMotion features={() => import('./ui/motionFeatures').then(m => m.default)}><FeedbackProvider><StoreProvider><App /></StoreProvider></FeedbackProvider></LazyMotion></StrictMode>
)
registerSW()
