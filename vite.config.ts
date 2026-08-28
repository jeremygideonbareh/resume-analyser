/// <reference types="vitest/config" />
import path from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * CSP meta tag (Todo 5.2) â€” injected ONLY into the production build.
 * Dev is exempt: Vite's react-refresh preamble and HMR websocket would be
 * blocked by a strict policy, so the meta is applied at build time via
 * transformIndexHtml instead of being hardcoded in index.html.
 *
 * connect-src is derived from VITE_SUPABASE_URL at build time so the
 * production build can reach the Supabase auth/rest API (F3 finding
 * 2026-08-18: static `connect-src 'self'` blocked all Supabase calls).
 */
function cspMetaPlugin(): Plugin {
  let supabaseOrigin = ''
  return {
    name: 'inject-csp-meta',
    apply: 'build',
    configResolved(config) {
      const env = loadEnv(config.mode, config.root, '')
      const supabaseUrl = env.VITE_SUPABASE_URL
      supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : ''
    },
    transformIndexHtml(html) {
      const connectSrc = `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ''}`
      const csp = `<meta
        http-equiv="Content-Security-Policy"
        content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: https://res.cloudinary.com; media-src 'self' https://res.cloudinary.com; worker-src 'self' blob:; ${connectSrc}"
      />`
      return html.replace('</head>', `${csp}\n  </head>`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the app under /resume-analyser/ â€” assets must be
  // base-prefixed or they 404 on the deployed site (Todo 4.3, 2026-08-19).
  base: process.env.VERCEL ? '/' : '/resume-analyser/',
  plugins: [react(), tailwindcss(), cspMetaPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.ts'],
  },
})