import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Lenis from 'lenis'
import { Toaster } from 'sonner'
// One grotesque carries the whole system — display and body are the same
// family separated by weight, not by typeface. The variable wght axis means
// 400→800 costs one file instead of five.
import '@fontsource-variable/archivo/wght.css'
// Real italics, not a synthesised oblique. The hero leans on one italic word
// for contrast, and a browser-skewed upright reads as a mistake at display
// size — the letterforms keep their upright proportions while leaning.
import '@fontsource-variable/archivo/wght-italic.css'
// Instrument Serif, self-hosted. The hero spec asked for it via a Google
// Fonts <link>, which font-src 'self' data: blocks in production — it would
// have silently fallen back to a system serif on the live site only.
import '@fontsource/instrument-serif/400.css'
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