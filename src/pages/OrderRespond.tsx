import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { usePageMeta } from '@/lib/usePageMeta'
import { supabase } from '@/lib/supabaseClient'
import { orderStatusLabel } from '@/lib/orderStatus'

type Result = 'loading' | 'confirmed' | 'cancelled' | 'invalid' | 'other'

const STRINGS = {
  fr: {
    loading: 'Traitement en cours…',
    confirmedTitle: 'Commande confirmée',
    confirmedMsg: 'Merci ! Votre commande est confirmée. Nous la préparons et vous tiendrons informé de son avancement.',
    cancelledTitle: 'Commande annulée',
    cancelledMsg: 'Votre commande a bien été annulée. Pour toute question, n’hésitez pas à nous contacter.',
    invalidTitle: 'Lien invalide',
    invalidMsg: 'Ce lien n’est plus valide ou la commande est introuvable.',
    otherTitle: 'Commande déjà traitée',
    otherMsg: 'Cette commande est déjà en cours de traitement. Statut actuel :',
    track: 'Suivre ma commande',
    shop: 'Retour à la boutique',
  },
  ar: {
    loading: 'جارٍ المعالجة…',
    confirmedTitle: 'تم تأكيد الطلب',
    confirmedMsg: 'شكراً لك! تم تأكيد طلبك. سنقوم بتحضيره وإبقائك على اطلاع بمستجداته.',
    cancelledTitle: 'تم إلغاء الطلب',
    cancelledMsg: 'تم إلغاء طلبك بنجاح. لأي استفسار، لا تتردد في التواصل معنا.',
    invalidTitle: 'رابط غير صالح',
    invalidMsg: 'هذا الرابط لم يعد صالحاً أو الطلب غير موجود.',
    otherTitle: 'الطلب قيد المعالجة',
    otherMsg: 'هذا الطلب قيد المعالجة بالفعل. الحالة الحالية:',
    track: 'تتبع طلبي',
    shop: 'العودة إلى المتجر',
  },
}

export default function OrderRespond() {
  const { locale } = useLanguage()
  const s = STRINGS[locale === 'ar' ? 'ar' : 'fr']
  usePageMeta('Commande', 'Confirmation de votre commande Forever Living Products.')

  const [result, setResult] = useState<Result>('loading')
  const [statusLabel, setStatusLabel] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    const token = params.get('token')
    const action = params.get('a')

    if (!ref || !token || !action) {
      setResult('invalid')
      return
    }

    ;(async () => {
      const { data, error } = await supabase.rpc('respond_order', {
        p_ref: ref,
        p_token: token,
        p_action: action,
      })
      if (error || !data || data === 'invalid') {
        setResult('invalid')
      } else if (data === 'confirmed') {
        setResult('confirmed')
      } else if (data === 'cancelled') {
        setResult('cancelled')
      } else {
        setStatusLabel(orderStatusLabel(String(data), locale))
        setResult('other')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ok = result === 'confirmed'
  const config = {
    loading: { title: '', msg: s.loading, color: '#8a8578' },
    confirmed: { title: s.confirmedTitle, msg: s.confirmedMsg, color: '#4F5A41' },
    cancelled: { title: s.cancelledTitle, msg: s.cancelledMsg, color: '#993c1d' },
    invalid: { title: s.invalidTitle, msg: s.invalidMsg, color: '#993c1d' },
    other: { title: s.otherTitle, msg: `${s.otherMsg} ${statusLabel}`, color: '#4F5A41' },
  }[result]

  return (
    <div className="flex min-h-[80vh] items-center justify-center pb-24 pt-32 sm:pt-40">
      <div className="container-px mx-auto max-w-lg text-center">
        {result !== 'loading' && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 16 }}
            className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full"
            style={{ background: ok ? '#e6ede0' : '#f7ece2' }}
          >
            <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke={config.color} strokeWidth="2">
              {ok ? (
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </motion.div>
        )}

        <h1 className="text-balance font-display text-4xl text-ink sm:text-5xl">{config.title}</h1>
        <p className="mx-auto mt-5 max-w-md text-sm text-ink/60">{config.msg}</p>

        {result !== 'loading' && (
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button to="/suivi" variant="primary">{s.track}</Button>
            <Button to="/shop" variant="secondary">{s.shop}</Button>
          </div>
        )}
      </div>
    </div>
  )
}
