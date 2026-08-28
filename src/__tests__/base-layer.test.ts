import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Guards a cascade bug that is invisible in review and invisible in the
 * browser until a dark surface exists.
 *
 * Unlayered CSS wins over every layered rule regardless of specificity, and
 * Tailwind's utilities live in @layer utilities. So an unlayered
 * `h1,h2,h3 { color: … }` silently beats `text-white` on every heading in the
 * app no matter how many classes are stacked on it. That shipped the parse
 * band's own headline as near-black on dark indigo at 1.56:1.
 *
 * Element-selector base styles therefore have to stay inside @layer base.
 * These assertions are cheap and catch the regression at the source, which is
 * the only place it is legible — jsdom does not implement @layer, so no
 * render-level test can see it.
 */

// Comments are stripped first: the block is preceded by a comment explaining
// why it must stay layered, and that comment names "@layer base" itself —
// searching raw source finds the prose, not the at-rule.
const css = readFileSync(resolve(import.meta.dirname, '../index.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')

/** Character range of the first base-layer block, brace-matched. */
function baseLayerRange(source: string): [number, number] {
  const start = source.search(/@layer\s+base\s*\{/)
  if (start === -1) return [-1, -1]
  const open = source.indexOf('{', start)
  let depth = 0
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}') {
      depth--
      if (depth === 0) return [start, i]
    }
  }
  return [start, source.length]
}

describe('index.css cascade layers', () => {
  it('declares an @layer base block', () => {
    expect(css).toContain('@layer base')
    const [start, end] = baseLayerRange(css)
    expect(start).toBeGreaterThanOrEqual(0)
    expect(end).toBeGreaterThan(start)
  })

  it.each([
    ['h1,\n  h2,\n  h3', /h1,\s*h2,\s*h3\s*\{/],
    ['p', /\n\s{2}p\s*\{/],
    ['body', /\n\s{2}body\s*\{/],
  ])('keeps the %s base rule inside @layer base', (_label, pattern) => {
    const [start, end] = baseLayerRange(css)
    const match = pattern.exec(css)
    expect(match, 'base rule not found at all').not.toBeNull()
    const at = match!.index
    expect(
      at > start && at < end,
      'element base rule sits outside @layer base — it will override Tailwind ' +
        'utilities like text-white on every element it matches',
    ).toBe(true)
  })

  it('sets a colour on headings and paragraphs, so the guard has a subject', () => {
    // If these ever stop setting colour the test above becomes vacuous rather
    // than failing, so assert the risk still exists.
    const [start, end] = baseLayerRange(css)
    const base = css.slice(start, end)
    expect(base).toMatch(/h1,\s*h2,\s*h3\s*\{[^}]*color:/)
    expect(base).toMatch(/\bp\s*\{[^}]*color:/)
  })
})
