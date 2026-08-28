import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Lenis from 'lenis'
import { Toaster } from 'sonner'
// One grotesque carries the whole system — display and body are the same
// family separated by weight, not by typeface. The variable wght axis means
// 400→800 costs one file instead of five.
import '@fontsource-variable/archivo/wght.css'
// Mono is reserved for real data (scores, tokens, keyword lists), never for
// decorative labels.
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './index.css'
import App from './App.tsx'

// Smooth scrolling (lenis) — repo convention (kiki-rental-app, crumbs)
const lenis = new Lenis({
  smoothWheel: true,
  lerp: 0.1,
})

function raf(time: number) {
  lenis.raf(time)
  requestAnimationFrame(raf)
}
requestAnimationFrame(raf)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: { fontFamily: '"Archivo Variable", system-ui, sans-serif' },
      }}
    />
  </StrictMode>,
)