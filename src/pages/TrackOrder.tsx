import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { usePageMeta } from '@/lib/usePageMeta'
import { supabase } from '@/lib/supabaseClient'
import { ORDER_FLOW, orderStatusLabel, type OrderStatus } from '@/lib/orderStatus'
import { formatPrice } from '@/lib/format'

interface TrackedOrder {
  order_ref: string
  status: string
  created_at: string
  total: number
}

const STRINGS = {
  fr: {
    eyebrow: 'Suivi de commande',
    title: 'Suivez votre ',
    titleAccent: 'commande',
    subtitle: 'Entrez votre numéro de commande et le téléphone (ou l’email) utilisé lors de l’achat.',
    refLabel: 'Numéro de commande',
    contactLabel: 'Téléphone ou email',
    contactPlaceholder: '06XXXXXXXX ou vous@email.com',
    submit: 'Suivre ma commande',
    searching: 'Recherche…',
    notFound: 'Aucune commande trouvée. Vérifiez le numéro et le téléphone (ou email) utilisés lors de la commande.',
    orderedOn: 'Commandée le',
    total: 'Total',
    cancelled: 'Cette commande a été annulée. Contactez-nous pour toute question.',
  },
  ar: {
    eyebrow: 'تتبع الطلب',
    title: 'تتبع ',
    titleAccent: 'طلبك',
    subtitle: 'أدخل رقم طلبك ورقم الهاتف (أو البريد الإلكتروني) المستخدم عند الشراء.',
    refLabel: 'رقم الطلب',
    contactLabel: 'الهاتف أو البريد الإلكتروني',
    contactPlaceholder: '06XXXXXXXX أو you@email.com',
    submit: 'تتبع طلبي',
    searching: 'جارٍ البحث…',
    notFound: 'لم يتم العثور على أي طلب. تحقق من الرقم والهاتف (أو البريد) المستخدمين عند الطلب.',
    orderedOn: 'تم الطلب في',
    total: 'المجموع',
    cancelled: 'تم إلغاء هذا الطلب. يرجى التواصل معنا لأي استفسار.',
  },
}

export default function TrackOrder() {
  const { locale } = useLanguage()
  const s = STRINGS[locale === 'ar' ? 'ar' : 'fr']
  usePageMeta('Suivi de commande', 'Suivez l’état de votre commande Forever Living Products.')

  // The confirmation page and WhatsApp messages link here with ?ref=FLXXXXXXXX
  // so the customer only has to type their phone number.
  const [params] = useSearchParams()
  const [ref, setRef] = useState(params.get('ref') ?? '')
  const [contact, setContact] = useState('')
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const [notFound, setNotFound] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setNotFound(false)
    setOrder(null)

    // Phone OR email lookup (track_order_v2). If that function isn't installed
    // yet (20_track-by-phone.sql), fall back to the original email-only lookup.
    let { data, error } = await supabase.rpc('track_order_v2', {
      p_ref: ref.trim(),
      p_contact: contact.trim(),
    })
    if (error) {
      ;({ data } = await supabase.rpc('track_order', {
        p_ref: ref.trim(),
        p_email: contact.trim(),
      }))
    }

    setLoading(false)
    if (data && data.length > 0) {
      setOrder(data[0] as TrackedOrder)
    } else {
      setNotFound(true)
    }
  }

  const currentIndex = order ? ORDER_FLOW.indexOf(order.status as OrderStatus) : -1
  const isCancelled = order?.status === 'cancelled'

  return (
    <div className="pb-24 pt-32 sm:pt-40">
      <SectionReveal immediate className="container-px mx-auto max-w-xl">
        <RevealItem className="mb-10 text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-sage-600">{s.eyebrow}</p>
          <h1 className="text-balance font-display text-4xl text-ink sm:text-5xl">
            {s.title}<span className="font-extrabold text-sage-600">{s.titleAccent}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm text-ink/60">{s.subtitle}</p>
        </RevealItem>

        <RevealItem>
          <form onSubmit={handleSubmit} className="rounded-4xl border border-ink/10 bg-cream-dark p-6 sm:p-8">
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/40">{s.refLabel}</label>
                <input
                  required
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                  placeholder="FL12345678"
                  className="w-full rounded-2xl border border-ink/15 bg-cream px-4 py-3 text-sm text-ink outline-none focus:border-ink/40"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink/40">{s.contactLabel}</label>
                <input
                  required
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder={s.contactPlaceholder}
                  className="w-full rounded-2xl border border-ink/15 bg-cream px-4 py-3 text-sm text-ink outline-none focus:border-ink/40"
                />
              </div>
              <Button type="submit" variant="primary" magnetic={false} disabled={loading} className="mt-2">
                {loading ? s.searching : s.submit}
              </Button>
            </div>
          </form>
        </RevealItem>

        {notFound && (
          <RevealItem>
            <p className="mt-6 rounded-2xl bg-clay-500/10 px-4 py-3 text-center text-sm text-clay-600">{s.notFound}</p>
          </RevealItem>
        )}

        {order && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-8 rounded-4xl border border-ink/10 bg-cream-dark p-6 sm:p-8"
          >
            <div className="mb-6 flex items-center justify-between border-b border-ink/10 pb-4">
              <div>
                <p className="font-display text-lg font-bold text-ink">#{order.order_ref}</p>
                <p className="text-xs text-ink/45">
                  {s.orderedOn} {new Date(order.created_at).toLocaleDateString(locale === 'ar' ? 'ar' : 'fr-FR')}
                </p>
              </div>
              <p className="font-display text-lg font-bold text-ink">{formatPrice(Number(order.total))}</p>
            </div>

            {isCancelled ? (
              <p className="rounded-2xl bg-clay-500/10 px-4 py-3 text-sm text-clay-600">{s.cancelled}</p>
            ) : (
              <ol className="flex flex-col gap-0">
                {ORDER_FLOW.map((step, i) => {
                  const done = i <= currentIndex
                  const current = i === currentIndex
                  return (
                    <li key={step} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <span
                          className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                            done ? 'bg-sage-600 text-cream' : 'bg-stone text-ink/30'
                          }`}
                        >
                          {done ? '✓' : i + 1}
                        </span>
                        {i < ORDER_FLOW.length - 1 && (
                          <span className={`h-8 w-0.5 ${i < currentIndex ? 'bg-sage-600' : 'bg-ink/10'}`} />
                        )}
                      </div>
                      <span className={`pt-1 text-sm ${current ? 'font-semibold text-ink' : done ? 'text-ink/70' : 'text-ink/40'}`}>
                        {orderStatusLabel(step, locale)}
                      </span>
                    </li>
                  )
                })}
              </ol>
            )}
          </motion.div>
        )}
      </SectionReveal>
    </div>
  )
}
