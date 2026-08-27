/**
 * Line-anchored resume issue scanner. Deterministic, no LLM.
 *
 * Returns a list of `ResumeIssue` with 1-based line numbers and absolute
 * character offsets into the source text so the ReportView can render an
 * annotated resume preview with severity-coloured highlights.
 *
 * Pure module — free of React/DOM so it is trivially unit-testable.
 */
import { SKILLS } from './skills-lexicon'

export type IssueSeverity = 'critical' | 'warning' | 'info'

export type IssueCategory =
  | 'contacts'
  | 'grammar'
  | 'verbs'
  | 'buzzwords'
  | 'consistency'
  | 'length'
  | 'placeholder'
  | 'spelling'
  | 'quantification'

export interface ResumeIssue {
  /** 1-based line number in the source text. */
  line: number
  /** Absolute character index (into the full source) of the match start. */
  start: number
  /** Absolute character index of the match end (exclusive). */
  end: number
  severity: IssueSeverity
  category: IssueCategory
  message: string
  suggestion: string
  /** The exact text matched (for highlight tooltips). */
  original: string
}

const WEAK_VERBS: Array<[RegExp, string]> = [
  [/\bresponsible\s+for\b/gi, 'Replace "responsible for" with a strong action verb (e.g. "led", "built").'],
  [/\bworked\s+on\b/gi, 'Replace "worked on" with the concrete outcome you delivered.'],
  [/\bduties\s+include[sd]?\b/gi, 'Prefer outcome-focused bullets over a duties list.'],
  [/\bassist(?:ed|s|ing)?\s+with\b/gi, 'Name your own contribution instead of "assisted with".'],
  [/\bhandled\b/gi, 'Use a more specific verb that conveys the scope of your work.'],
  [/\bdeal(?:t|ing)?\s+with\b/gi, 'Replace "dealt with" with a stronger action verb.'],
]

const BUZZWORDS: Array<[RegExp, string]> = [
  [/\bteam\s+player\b/gi, 'Show teamwork through a concrete example instead of the phrase.'],
  [/\bhard\s+worker\b/gi, 'Let the results speak — drop the self-praise cliché.'],
  [/\bself[- ]motivated\b/gi, 'Demonstrate motivation with an outcome, not a label.'],
  [/\bgo[- ]getter\b/gi, 'Replace the cliché with a measurable achievement.'],
  [/\bthink(?:ing)?\s+outside\s+(?:the\s+)?box\b/gi, 'Show innovation through a specific example.'],
  [/\bdetail[- ]oriented\b/gi, 'Replace with a concrete quality-checked deliverable.'],
  [/\bpeople\s+person\b/gi, 'Replace with evidence of collaboration or leadership.'],
  [/\bresults[- ]driven\b/gi, 'Show the results instead of claiming them.'],
  [/\bproactive\b/gi, 'Replace with the specific initiative you took.'],
]

const PLACEHOLDER: Array<[RegExp, string, string]> = [
  [/\blorem\s+ipsum\b/gi, 'Remove placeholder filler text.', 'Placeholder text'],
  [/\b(?:your\s+)?name\b/gi, 'Make sure your real name is filled in.', 'Placeholder text'],
  [/\b\[insert[^\]]*\]/gi, 'Fill in or remove this bracketed placeholder.', 'Placeholder text'],
  [/\b(?:xxx|tbd|todo)\b/gi, 'Replace this placeholder with real content.', 'Placeholder text'],
  [/\b(?:sample|mock|dummy)\s+resume\b/gi, 'Replace the sample resume text.', 'Placeholder text'],
]

const DATE_FORMATS: Array<[RegExp, string]> = [
  [/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}\b/i, 'mon yyyy'],
  [/\b\d{1,2}\s*\/\s*(?:19|20)\d{2}\b/, 'm/yyyy'],
  [/\b(?:19|20)\d{2}\s*\/\s*\d{1,2}\b/, 'yyyy/m'],
  [/\b(?:present|current|now)\b/i, 'word'],
]

// Near-miss skills we flag so the user notices a typo, without a full spell
// checker. Levenshtein distance ≤ 1 against the lexicon.
const NEAR_MISS_WORDS = new Set([
  'python', 'javascript', 'typescript', 'react', 'java', 'sql', 'html',
  'css', 'node', 'docker', 'kubernetes', 'postgres', 'mongodb', 'aws',
  'git', 'linux', 'c++', 'excel', 'figma', 'flutter', 'django', 'flask',
  'graphql', 'redis', 'kafka', 'tensorflow', 'pytorch', 'r',
])

const BULLET_START_RE = /^\s*[•\-*▪]\s+([a-z])/
const OVERLONG_BULLET_CHARS = 220
const REPEATED_PUNCT_RE = /([.,!?;:])\s*\1{1,}/g
const REPEATED_WORD_RE = /\b([a-z]{3,})\s+\1\b/gi

export function scanResumeIssues(text: string): ResumeIssue[] {
  const issues: ResumeIssue[] = []
  const lines = text.split(/\r?\n/)

  let lineStart = 0
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const trimmed = raw.trim()
    const line = i + 1
    const startOf = (rel: number) => lineStart + rel

    // --- weak verbs ---
    for (const [re, suggestion] of WEAK_VERBS) {
      let m: RegExpExecArray | null
      const g = new RegExp(re.source, re.flags + (re.flags.includes('g') ? '' : 'g'))
      while ((m = g.exec(raw)) !== null) {
        issues.push({
          line,
          start: startOf(m.index),
          end: startOf(m.index + m[0].length),
          severity: 'warning',
          category: 'verbs',
          message: `Weak action verb "${m[0].trim()}"`,
          suggestion,
          original: m[0],
        })
      }
    }

    // --- buzzwords ---
    for (const [re, suggestion] of BUZZWORDS) {
      let m: RegExpExecArray | null
      const g = new RegExp(re.source, re.flags + (re.flags.includes('g') ? '' : 'g'))
      while ((m = g.exec(raw)) !== null) {
        issues.push({
          line,
          start: startOf(m.index),
          end: startOf(m.index + m[0].length),
          severity: 'info',
          category: 'buzzwords',
          message: `Buzzword "${m[0].trim()}"`,
          suggestion,
          original: m[0],
        })
      }
    }

    // --- placeholders ---
    for (const [re, suggestion, message] of PLACEHOLDER) {
      let m: RegExpExecArray | null
      const g = new RegExp(re.source, re.flags + (re.flags.includes('g') ? '' : 'g'))
      while ((m = g.exec(raw)) !== null) {
        issues.push({
          line,
          start: startOf(m.index),
          end: startOf(m.index + m[0].length),
          severity: 'critical',
          category: 'placeholder',
          message,
          suggestion,
          original: m[0],
        })
      }
    }

    // --- repeated punctuation (single match per line) ---
    const punct = raw.match(REPEATED_PUNCT_RE)
    if (punct) {
      const first = REPEATED_PUNCT_RE.exec(raw)
      REPEATED_PUNCT_RE.lastIndex = 0
      if (first) {
        issues.push({
          line,
          start: startOf(first.index),
          end: startOf(first.index + first[0].length),
          severity: 'warning',
          category: 'grammar',
          message: 'Repeated punctuation',
          suggestion:
            'Remove the doubled punctuation mark (e.g. ".." or ",,").',
          original: first[0],
        })
      }
    }

    // --- repeated word (e.g. "the the") ---
    const dup = raw.match(REPEATED_WORD_RE)
    if (dup) {
      const first = REPEATED_WORD_RE.exec(raw)
      REPEATED_WORD_RE.lastIndex = 0
      if (first) {
        issues.push({
          line,
          start: startOf(first.index),
          end: startOf(first.index + first[0].length),
          severity: 'info',
          category: 'grammar',
          message: `Repeated word "${first[1].toLowerCase()}"`,
          suggestion: `Remove the duplicated word "${first[1].toLowerCase()}".`,
          original: first[0],
        })
      }
    }

    // --- inconsistent date formats on the same line ---
    const foundFormats = new Set<string>()
    for (const [df, label] of DATE_FORMATS) {
      if (df.test(raw)) {
        foundFormats.add(label)
        df.lastIndex = 0
      }
    }
    if (foundFormats.size > 1) {
      issues.push({
        line,
        start: lineStart,
        end: lineStart + raw.length,
        severity: 'warning',
        category: 'consistency',
        message: 'Inconsistent date formats on this line',
        suggestion:
          'Use a single date format throughout (e.g. "Jul 2021 – Present").',
        original: trimmed,
      })
    }

    // --- overlong bullet ---
    if (/^\s*[•\-*▪]\s+/.test(raw) && raw.length > OVERLONG_BULLET_CHARS) {
      issues.push({
        line,
        start: lineStart,
        end: lineStart + raw.length,
        severity: 'warning',
        category: 'length',
        message: 'Bullet is very long',
        suggestion:
          'Split long bullets into 1-2 lines; keep each under ~200 characters.',
        original: trimmed,
      })
    }

    // --- bullet starts lowercase ---
    const bulletLower = raw.match(BULLET_START_RE)
    if (bulletLower) {
      const at = raw.indexOf(bulletLower[1])
      issues.push({
        line,
        start: startOf(at),
        end: startOf(at + 1),
        severity: 'info',
        category: 'grammar',
        message: 'Bullet starts with a lowercase letter',
        suggestion: 'Capitalize the first word of the bullet.',
        original: bulletLower[1],
      })
    }

    // --- near-miss skill typo ---
    const words = raw.split(/[^A-Za-z0-9+#.]+/)
    for (const w of words) {
      const low = w.toLowerCase()
      if (low.length < 3 || SKILLS.has(low)) continue
      const target = SKILL_TYPOS.get(low)
      if (!target) continue
      const at = raw.toLowerCase().indexOf(low)
      issues.push({
        line,
        start: startOf(at),
        end: startOf(at + w.length),
        severity: 'warning',
        category: 'spelling',
        message: `Possible typo "${w}" for a skill`,
        suggestion: `Did you mean "${target}"?`,
        original: w,
      })
      break
    }

    lineStart += raw.length + 1 // +1 for the newline
  }

  // Deduplicate exact duplicates (same start/end/category).
  const seen = new Set<string>()
  return issues.filter((issue) => {
    const key = `${issue.start}:${issue.end}:${issue.category}:${issue.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// Map of plausible typo variants -> closest lexicon skill. Built once at
// module load from a curated skill set, keeping only variants that are not
// themselves known skills and not common English words (to avoid false hits
// like "got" → git). This keeps typo detection deterministic and near-zero noise.
const SKILL_TYPOS: Map<string, string> = new Map()

// Common English words that happen to be edit-distance-1 from a skill — never
// treat these as typos.
const COMMON_ENGLISH = new Set([
  'got', 'get', 'grit', 'git', 'fat', 'pat', 'sat', 'cat', 'eat', 'set',
  'sit', 'put', 'cut', 'hit', 'pit', 'bit', 'fit', 'node', 'none', 'java',
  'test', 'west', 'rest', 'best', 'nest', 'pest', 'vest', 'been', 'beam',
  'bean', 'read', 'lead', 'load', 'road', 'toad', 'goat', 'coat', 'boat',
  'form', 'born', 'corn', 'core', 'corm', 'dorm', 'love', 'live', 'like',
  'time', 'tide', 'tire', 'fire', 'hire', 'wire', 'core', 'more', 'sore',
  'tore', 'lone', 'bone', 'cone', 'gone', 'home', 'some', 'dome', 'fame',
  'game', 'same', 'name', 'came', 'lame', 'tame', 'wake', 'make', 'cake',
  'take', 'lake', 'rake', 'sake', 'bake', 'care', 'dare', 'fare', 'hare',
  'mare', 'pare', 'ware', 'area', 'data', 'rate', 'date', 'late', 'gate',
  'hate', 'mate', 'fate', 'gain', 'rain', 'main', 'pain', 'vain', 'vane',
  'wane', 'lane', 'line', 'mine', 'fine', 'pine', 'wine', 'dine', 'nine',
  'sign', 'khan', 'plan', 'span', 'clan', 'scan', 'bran', 'gran', 'vran',
  'role', 'pole', 'sole', 'code', 'node', 'mode', 'rode', 'lode', 'pian',
  'plan', 'red', 'reel', 'real', 'deal', 'meal', 'seal', 'veal', 'peal',
  'heal', 'weal', 'feal', 'leap', 'heap', 'reap', 'cheap', 'peak', 'beak',
])

function generateTypoVariants(word: string): Set<string> {
  const variants = new Set<string>()
  const chars = 'abcdefghijklmnopqrstuvwxyz'
  // 1. deletion
  for (let i = 0; i < word.length; i++) {
    variants.add(word.slice(0, i) + word.slice(i + 1))
  }
  // 2. insertion
  for (let i = 0; i <= word.length; i++) {
    for (const c of chars) {
      variants.add(word.slice(0, i) + c + word.slice(i))
    }
  }
  // 3. substitution
  for (let i = 0; i < word.length; i++) {
    for (const c of chars) {
      variants.add(word.slice(0, i) + c + word.slice(i + 1))
    }
  }
  // 4. transposition
  for (let i = 0; i < word.length - 1; i++) {
    const charsArr = word.split('')
    ;[charsArr[i], charsArr[i + 1]] = [charsArr[i + 1], charsArr[i]]
    variants.add(charsArr.join(''))
  }
  return variants
}

for (const skill of NEAR_MISS_WORDS) {
  const variants = generateTypoVariants(skill)
  for (const variant of variants) {
    if (variant.length < 3) continue
    if (SKILLS.has(variant)) continue // it's a real skill, not a typo
    if (variant === skill) continue
    if (COMMON_ENGLISH.has(variant)) continue
    if (SKILL_TYPOS.has(variant)) continue // first skill wins on collisions
    SKILL_TYPOS.set(variant, skill)
  }
}
