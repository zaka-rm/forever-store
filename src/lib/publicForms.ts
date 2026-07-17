import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^\+?[\d\s().-]{7,20}$/

export class PublicFormConfigurationError extends Error {
  constructor() {
    super('Public form storage is not configured.')
    this.name = 'PublicFormConfigurationError'
  }
}

export function requirePublicFormStorage(): void {
  if (!isSupabaseConfigured) throw new PublicFormConfigurationError()
}

export function isPublicFormConfigurationError(error: unknown): boolean {
  return error instanceof PublicFormConfigurationError
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim())
}

export function isValidPhoneOrEmail(value: string): boolean {
  const normalized = value.trim()
  return isValidEmail(normalized) || isValidPhone(normalized)
}

export function isValidPhone(value: string): boolean {
  return PHONE_PATTERN.test(value.trim())
}

/** Store a public newsletter sign-up. Existing addresses remain a successful no-op for visitors. */
export async function subscribeToNewsletter(rawEmail: string): Promise<void> {
  requirePublicFormStorage()
  const email = rawEmail.trim().toLowerCase()
  if (!isValidEmail(email)) throw new TypeError('A valid email address is required.')

  const { error } = await supabase.from('subscribers').insert({ email })
  if (error && error.code !== '23505' && !error.message.toLowerCase().includes('duplicate')) {
    throw error
  }
}
