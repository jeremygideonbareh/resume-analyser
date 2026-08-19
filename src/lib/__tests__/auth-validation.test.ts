import { describe, expect, it } from 'vitest'
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirm,
} from '@/lib/auth-validation'

describe('validateEmail', () => {
  it('accepts a normal email', () => {
    expect(validateEmail('me@example.com')).toBeNull()
  })

  it('rejects an empty value', () => {
    expect(validateEmail('')).toMatch(/enter your email/i)
    expect(validateEmail('   ')).toMatch(/enter your email/i)
  })

  it('rejects a malformed email', () => {
    expect(validateEmail('not-an-email')).toMatch(/valid email/i)
    expect(validateEmail('a@b')).toMatch(/valid email/i)
  })

  it('trims surrounding whitespace', () => {
    expect(validateEmail('  me@example.com  ')).toBeNull()
  })
})

describe('validatePassword', () => {
  it('accepts a password of 8+ characters', () => {
    expect(validatePassword('secret123')).toBeNull()
  })

  it('rejects an empty password', () => {
    expect(validatePassword('')).toMatch(/enter a password/i)
  })

  it('rejects a password shorter than 8 characters', () => {
    expect(validatePassword('short7')).toMatch(/at least 8 characters/i)
  })
})

describe('validatePasswordConfirm', () => {
  it('accepts a matching confirmation', () => {
    expect(validatePasswordConfirm('secret123', 'secret123')).toBeNull()
  })

  it('rejects an empty confirmation', () => {
    expect(validatePasswordConfirm('secret123', '')).toMatch(/re-enter/i)
  })

  it('rejects a mismatched confirmation', () => {
    expect(validatePasswordConfirm('secret123', 'secret124')).toMatch(
      /don't match/i,
    )
  })
})