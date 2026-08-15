/**
 * Inline sign-in validation (Todo 2.3).
 *
 * NOTE: the original plan referenced this file as pre-existing demo design
 * ("KEEP, still used for inline UX"). It was never committed to this repo, so
 * it is created fresh with the same contract: each validator returns an error
 * string, or `null` when the value is valid.
 */

/** Returns an error message, or `null` when the email looks usable. */
export function validateEmail(email: string): string | null {
  const value = email.trim()
  if (!value) return 'Enter your email address.'
  // Deliberately permissive — the real gate is Supabase's OTP send. We only
  // catch obvious typos so the user isn't round-tripped through a failed send.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
    return 'That doesn\'t look like a valid email address.'
  }
  return null
}

/**
 * Returns an error message, or `null` when the phone looks usable.
 * Supabase phone auth requires E.164 (+441234567890). We accept the common
 * human formats (+44 7911 123456, 07911 123456 for UK) and normalize later.
 */
export function validatePhone(phone: string): string | null {
  const value = phone.trim()
  if (!value) return 'Enter your phone number.'
  const digits = value.replace(/[^\d+]/g, '')
  if (!/^\+?\d{7,15}$/.test(digits)) {
    return 'Enter a valid phone number, e.g. +44 7911 123456.'
  }
  if (digits.startsWith('+') && digits.length < 9) {
    return 'Enter a valid phone number, e.g. +44 7911 123456.'
  }
  return null
}
