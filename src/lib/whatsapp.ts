import { WHATSAPP_NUMBER } from '@/lib/constants'

// Moroccan numbers are usually written "06…"; wa.me needs the international form
// "2126…". Falls back to the raw digits for numbers already in another format.
export function toWhatsAppNumber(phone: string | null): string {
  const digits = (phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('212')) return digits
  if (digits.startsWith('0')) return '212' + digits.slice(1)
  return digits
}

/** The distributor's WhatsApp number in international form, for customer orders. */
export const DISTRIBUTOR_WHATSAPP = toWhatsAppNumber(WHATSAPP_NUMBER)

/** Builds a wa.me link to a number with a pre-written message. */
export function waLink(number: string, message: string): string {
  const base = number ? `https://wa.me/${number}` : 'https://wa.me/'
  return `${base}?text=${encodeURIComponent(message)}`
}
