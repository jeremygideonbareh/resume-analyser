/**
 * Inline sign-in validation (authwave).
 *
 * Each validator returns an error string, or `null` when the value is valid.
 * Phone validation was removed with the phone-OTP flow — email + password only.
 */

/** Returns an error message, or `null` when the email looks usable. */
export function validateEmail(email: string): string | null {
  const value = email.trim()
  if (!value) return 'Enter your email address.'
  // Deliberately permissive — the real gate is Supabase's auth call. We only
  // catch obvious typos so the user isn't round-tripped through a failed send.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
    return 'That doesn\'t look like a valid email address.'
  }
  return null
}

/** Returns an error message, or `null` when the password is usable. */
export function validatePassword(password: string): string | null {
  if (!password) return 'Enter a password.'
  if (password.length < 8) {
    return 'Password must be at least 8 characters.'
  }
  return null
}

/** Returns an error message, or `null` when the confirmation matches. */
export function validatePasswordConfirm(
  password: string,
  confirm: string,
): string | null {
  if (!confirm) return 'Re-enter your password.'
  if (password !== confirm) return 'Passwords don\'t match.'
  return null
}