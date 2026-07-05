import { Hero } from '@/components/sections/Hero'
import { TrustStrip } from '@/components/sections/TrustStrip'
import { Bestsellers } from '@/components/sections/Bestsellers'
import { NewArrivals } from '@/components/sections/NewArrivals'
import { BrandStory } from '@/components/sections/BrandStory'
import { OversizedType } from '@/components/ui/OversizedType'
import { IngredientSpotlight } from '@/components/sections/IngredientSpotlight'
import { RoutineCTA } from '@/components/sections/RoutineCTA'
import { Testimonials } from '@/components/sections/Testimonials'
import { FAQ } from '@/components/sections/FAQ'
import { Newsletter } from '@/components/sections/Newsletter'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { usePageMeta } from '@/lib/usePageMeta'

export default function Home() {
  const { t } = useLanguage()
  usePageMeta(
    "Bien-être par l'Aloe Vera",
    "Distributeur Indépendant Forever Living Products — nutrition, beauté, fitness et produits de la ruche à base d'Aloe Vera.",
  )

  return (
    <>
      <Hero />
      <TrustStrip />
      <Bestsellers />
      <NewArrivals />
      <OversizedType text={t.home.oversizedType} className="py-6 sm:py-10" />
      <BrandStory />
      <IngredientSpotlight />
      <RoutineCTA />
      <Testimonials />
      <FAQ />
      <Newsletter />
    </>
  )
}
