import { useEffect, useMemo, useState } from 'react'
import { Loader2, Save, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getSupabase } from '@/lib/supabase'
import { profileCompletenessScore } from '@/lib/readiness'
import type { StudentProfile } from '@/lib/placement-types'
import { cn } from '@/lib/utils'

type AppView = 'landing' | 'dashboard' | 'profile' | 'chat'

interface ProfileViewProps {
  /** Signed-in user id — the profile row is scoped to this via RLS. */
  userId?: string
  /** Switches the app view (e.g. to the chat or dashboard). */
  onNavigate?: (view: AppView) => void
}

const DEPARTMENTS = [
  'CSE',
  'IT',
  'ECE',
  'EEE',
  'Mechanical',
  'Civil',
  'Chemical',
  'Biotechnology',
  'Other',
] as const

const COMMON_LANGUAGES = [
  'C',
  'C++',
  'Java',
  'Python',
  'JavaScript',
  'TypeScript',
  'Go',
  'Rust',
  'SQL',
  'HTML/CSS',
] as const

interface FormState {
  full_name: string
  department: string
  semester: string
  cgpa: string
  backlogs: string
  skills: string
  certifications: string
  programming_languages: string[]
  portfolio_url: string
  github_url: string
  linkedin_url: string
  target_role: string
}

const EMPTY_FORM: FormState = {
  full_name: '',
  department: '',
  semester: '',
  cgpa: '',
  backlogs: '0',
  skills: '',
  certifications: '',
  programming_languages: [],
  portfolio_url: '',
  github_url: '',
  linkedin_url: '',
  target_role: '',
}

function isValidUrl(value: string): boolean {
  if (!value.trim()) return true
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function toForm(profile: StudentProfile): FormState {
  return {
    full_name: profile.full_name ?? '',
    department: profile.department ?? '',
    semester: profile.semester != null ? String(profile.semester) : '',
    cgpa: profile.cgpa != null ? String(profile.cgpa) : '',
    backlogs: String(profile.backlogs),
    skills: profile.skills.join(', '),
    certifications: profile.certifications.join(', '),
    programming_languages: profile.programming_languages,
    portfolio_url: profile.portfolio_url ?? '',
    github_url: profile.github_url ?? '',
    linkedin_url: profile.linkedin_url ?? '',
    target_role: profile.target_role ?? '',
  }
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * ProfileView — the student profile module (T2.1 + T2.2).
 *
 * Two-column form: personal details, skills, certifications, programming
 * languages, links, and target role. Loads the existing profile on mount,
 * saves via upsert, and shows a live completeness meter (D8) in the header.
 * All Supabase calls go through the anon-key client — RLS scopes the row to
 * the signed-in user.
 */
export function ProfileView({ userId, onNavigate = () => {} }: ProfileViewProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setLoadError(false)
      try {
        const supabase = getSupabase()
        const { data, error } = await supabase
          .from('student_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()
        if (cancelled) return
        if (error) throw error
        if (data) {
          const row = data as unknown as StudentProfile
          // Postgres numeric columns arrive as strings — convert to numbers.
          setForm(
            toForm({
              ...row,
              cgpa: row.cgpa != null ? Number(row.cgpa) : null,
              semester: row.semester != null ? Number(row.semester) : null,
            }),
          )
        }
      } catch {
        if (!cancelled) setLoadError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [userId])

  const completeness = useMemo(() => {
    const profile: StudentProfile = {
      id: '',
      created_at: '',
      user_id: userId ?? '',
      full_name: form.full_name || null,
      department: form.department || null,
      semester: form.semester ? Number(form.semester) : null,
      cgpa: form.cgpa ? Number(form.cgpa) : null,
      backlogs: Number(form.backlogs) || 0,
      skills: splitList(form.skills),
      certifications: splitList(form.certifications),
      programming_languages: form.programming_languages,
      portfolio_url: form.portfolio_url || null,
      github_url: form.github_url || null,
      linkedin_url: form.linkedin_url || null,
      target_role: form.target_role || null,
      updated_at: '',
    }
    return profileCompletenessScore(profile)
  }, [form, userId])

  const set = (field: keyof FormState, value: string | string[]) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const toggleLanguage = (lang: string) => {
    setForm((prev) => ({
      ...prev,
      programming_languages: prev.programming_languages.includes(lang)
        ? prev.programming_languages.filter((l) => l !== lang)
        : [...prev.programming_languages, lang],
    }))
  }

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {}
    if (form.semester && (Number(form.semester) < 1 || Number(form.semester) > 8)) {
      next.semester = 'Semester must be between 1 and 8.'
    }
    if (form.cgpa && (Number(form.cgpa) < 0 || Number(form.cgpa) > 10)) {
      next.cgpa = 'CGPA must be between 0 and 10.'
    }
    if (form.backlogs && Number(form.backlogs) < 0) {
      next.backlogs = 'Backlogs cannot be negative.'
    }
    if (!isValidUrl(form.portfolio_url)) {
      next.portfolio_url = 'Portfolio URL must start with http:// or https://'
    }
    if (!isValidUrl(form.github_url)) {
      next.github_url = 'GitHub URL must start with http:// or https://'
    }
    if (!isValidUrl(form.linkedin_url)) {
      next.linkedin_url = 'LinkedIn URL must start with http:// or https://'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSave = async () => {
    if (!userId) return
    if (!validate()) return
    setSaving(true)
    try {
      const supabase = getSupabase()
      const { error } = await supabase.from('student_profiles').upsert({
        user_id: userId,
        full_name: form.full_name.trim() || null,
        department: form.department || null,
        semester: form.semester ? Number(form.semester) : null,
        cgpa: form.cgpa ? Number(form.cgpa) : null,
        backlogs: Number(form.backlogs) || 0,
        skills: splitList(form.skills),
        certifications: splitList(form.certifications),
        programming_languages: form.programming_languages,
        portfolio_url: form.portfolio_url.trim() || null,
        github_url: form.github_url.trim() || null,
        linkedin_url: form.linkedin_url.trim() || null,
        target_role: form.target_role.trim() || null,
        updated_at: new Date().toISOString(),
      })
      if (error) throw error
      toast.success('Profile saved')
    } catch {
      toast.error('Could not save your profile — try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!userId) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
          Profile
        </p>
        <h2 className="mt-2 max-w-md text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Sign in to manage your placement profile.
        </h2>
        <button
          type="button"
          onClick={() => onNavigate('landing')}
          className="mt-6 rounded-full border border-ink/15 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink/30 hover:bg-surface"
        >
          Back to home
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-ink-soft"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your profile…
        </p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
          Profile
        </p>
        <h2 className="mt-2 max-w-md text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Couldn’t load your profile.
        </h2>
        <p className="mt-4 max-w-md text-ink-soft">
          Something went wrong reading your profile. Try again in a moment.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 rounded-full border border-ink/15 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink/30 hover:bg-surface"
        >
          Reload
        </button>
      </div>
    )
  }

  const fieldError = (field: keyof FormState) =>
    errors[field] ? (
      <p role="alert" className="mt-1 text-xs text-danger">
        {errors[field]}
      </p>
    ) : null

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
            Profile
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Placement profile
          </h2>
          <p className="mt-2 max-w-md text-sm text-ink-soft">
            Your details power the eligibility chatbot and placement dashboard.
          </p>
        </div>
        <div className="w-full max-w-xs">
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
            <span>Profile completeness</span>
            <span className="text-ink">{completeness}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={completeness}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface"
          >
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${completeness}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Personal details */}
        <section
          aria-label="Personal details"
          className="rounded-2xl border border-ink/10 bg-paper p-6"
        >
          <h3 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
            <UserRound className="h-3.5 w-3.5 text-accent" />
            Personal details
          </h3>
          <div className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="profile-full-name"
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted"
              >
                Full name
              </label>
              <Input
                id="profile-full-name"
                value={form.full_name}
                onChange={(e) => set('full_name', e.target.value)}
                placeholder="Priya Sharma"
                className="mt-1.5 h-10"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="profile-department"
                  className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted"
                >
                  Department
                </label>
                <select
                  id="profile-department"
                  value={form.department}
                  onChange={(e) => set('department', e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border border-ink/15 bg-paper px-3 text-sm text-ink outline-none transition-colors focus:border-ink/40"
                >
                  <option value="">Select…</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="profile-semester"
                  className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted"
                >
                  Semester
                </label>
                <select
                  id="profile-semester"
                  value={form.semester}
                  onChange={(e) => set('semester', e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border border-ink/15 bg-paper px-3 text-sm text-ink outline-none transition-colors focus:border-ink/40"
                >
                  <option value="">Select…</option>
                  {Array.from({ length: 8 }, (_, i) => i + 1).map((s) => (
                    <option key={s} value={String(s)}>
                      Semester {s}
                    </option>
                  ))}
                </select>
                {fieldError('semester')}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="profile-cgpa"
                  className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted"
                >
                  CGPA (0–10)
                </label>
                <Input
                  id="profile-cgpa"
                  type="number"
                  min={0}
                  max={10}
                  step={0.01}
                  inputMode="decimal"
                  value={form.cgpa}
                  onChange={(e) => set('cgpa', e.target.value)}
                  placeholder="8.50"
                  className="mt-1.5 h-10"
                />
                {fieldError('cgpa')}
              </div>
              <div>
                <label
                  htmlFor="profile-backlogs"
                  className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted"
                >
                  Active backlogs
                </label>
                <Input
                  id="profile-backlogs"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={form.backlogs}
                  onChange={(e) => set('backlogs', e.target.value)}
                  className="mt-1.5 h-10"
                />
                {fieldError('backlogs')}
              </div>
            </div>
            <div>
              <label
                htmlFor="profile-target-role"
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted"
              >
                Target role
              </label>
              <Input
                id="profile-target-role"
                value={form.target_role}
                onChange={(e) => set('target_role', e.target.value)}
                placeholder="Software Engineer"
                className="mt-1.5 h-10"
              />
            </div>
          </div>
        </section>

        {/* Skills & certifications */}
        <section
          aria-label="Skills and certifications"
          className="rounded-2xl border border-ink/10 bg-paper p-6"
        >
          <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
            Skills & certifications
          </h3>
          <div className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="profile-skills"
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted"
              >
                Skills (comma-separated)
              </label>
              <Input
                id="profile-skills"
                value={form.skills}
                onChange={(e) => set('skills', e.target.value)}
                placeholder="python, java, sql, react"
                className="mt-1.5 h-10"
              />
              <p className="mt-1 text-xs text-ink-soft">
                {splitList(form.skills).length} skill(s) — 3+ boosts your
                completeness score.
              </p>
            </div>
            <div>
              <label
                htmlFor="profile-certifications"
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted"
              >
                Certifications (comma-separated)
              </label>
              <Input
                id="profile-certifications"
                value={form.certifications}
                onChange={(e) => set('certifications', e.target.value)}
                placeholder="AWS Cloud Practitioner, NPTEL Python"
                className="mt-1.5 h-10"
              />
            </div>
            <div>
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                Programming languages
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {COMMON_LANGUAGES.map((lang) => {
                  const active = form.programming_languages.includes(lang)
                  return (
                    <button
                      key={lang}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleLanguage(lang)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        active
                          ? 'border-accent bg-accent/10 text-ink'
                          : 'border-ink/15 text-ink-soft hover:border-ink/30',
                      )}
                    >
                      {lang}
                    </button>
                  )
                })}
              </div>
              <Input
                aria-label="Add a programming language"
                placeholder="Type a language and press Enter to add"
                className="mt-2 h-10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const value = (e.target as HTMLInputElement).value.trim()
                    if (value && !form.programming_languages.includes(value)) {
                      toggleLanguage(value)
                      ;(e.target as HTMLInputElement).value = ''
                    }
                  }
                }}
              />
            </div>
          </div>
        </section>

        {/* Links */}
        <section
          aria-label="Links"
          className="rounded-2xl border border-ink/10 bg-paper p-6 lg:col-span-2"
        >
          <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
            Links
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="profile-portfolio"
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted"
              >
                Portfolio URL
              </label>
              <Input
                id="profile-portfolio"
                type="url"
                value={form.portfolio_url}
                onChange={(e) => set('portfolio_url', e.target.value)}
                placeholder="https://your-portfolio.dev"
                className="mt-1.5 h-10"
              />
              {fieldError('portfolio_url')}
            </div>
            <div>
              <label
                htmlFor="profile-github"
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted"
              >
                GitHub URL
              </label>
              <Input
                id="profile-github"
                type="url"
                value={form.github_url}
                onChange={(e) => set('github_url', e.target.value)}
                placeholder="https://github.com/username"
                className="mt-1.5 h-10"
              />
              {fieldError('github_url')}
            </div>
            <div>
              <label
                htmlFor="profile-linkedin"
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted"
              >
                LinkedIn URL
              </label>
              <Input
                id="profile-linkedin"
                type="url"
                value={form.linkedin_url}
                onChange={(e) => set('linkedin_url', e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className="mt-1.5 h-10"
              />
              {fieldError('linkedin_url')}
            </div>
          </div>
        </section>
      </div>

      <div className="mt-8 flex items-center justify-end gap-3">
        <Button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="h-10 px-6"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save profile
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => onNavigate('dashboard')}
          className="h-10 px-6"
        >
          Back to dashboard
        </Button>
      </div>
    </div>
  )
}