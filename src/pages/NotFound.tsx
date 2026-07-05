import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { usePageMeta } from '@/lib/usePageMeta'

export default function NotFound() {
  const { locale } = useLanguage()
  const ar = locale === 'ar'
  usePageMeta(ar ? 'الصفحة غير موجودة' : 'Page introuvable')

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 pb-24 pt-32 text-center sm:pt-40">
      <p className="font-display text-7xl font-extrabold text-sage-200">404</p>
      <h1 className="mt-4 font-display text-3xl font-bold text-ink">
        {ar ? 'الصفحة غير موجودة' : 'Page introuvable'}
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink/60">
        {ar
          ? 'الرابط الذي تبحث عنه غير موجود أو تم نقله. اكتشف منتجاتنا بدلاً من ذلك:'
          : "La page que vous cherchez n'existe pas ou a été déplacée. Découvrez plutôt nos produits :"}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button to="/shop" variant="primary">
          {ar ? 'زيارة المتجر' : 'Voir la boutique'}
        </Button>
        <Button to="/" variant="secondary">
          {ar ? 'العودة إلى الرئيسية' : "Retour à l'accueil"}
        </Button>
      </div>
    </div>
  )
}
