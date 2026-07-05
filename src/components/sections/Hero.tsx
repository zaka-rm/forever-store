import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { ProductImage } from '@/components/ui/ProductImage'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 + i * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  }),
}

export function Hero() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [0, 120])
  const { t } = useLanguage()
  const hero = t.home.hero

  return (
    <section ref={ref} className="relative overflow-x-clip pb-20 pt-32 sm:pt-40">
      <div className="container-px mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-8">
        <div>
          <motion.p
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mb-5 text-xs font-medium uppercase tracking-[0.2em] text-sage-600"
          >
            {hero.eyebrow}
          </motion.p>

          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="text-balance font-display text-5xl leading-[1.05] text-ink sm:text-6xl lg:text-[4.5rem]"
          >
            {hero.titleLine1}
            <br />
            <span className="font-extrabold text-sage-600">{hero.titleAccent}</span>
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mt-6 max-w-md text-base leading-relaxed text-ink/65"
          >
            {hero.body}
          </motion.p>

          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <Button to="/shop" variant="primary">
              {hero.ctaShop}
            </Button>
            <Button to="/about" variant="secondary">
              {hero.ctaStory}
            </Button>
          </motion.div>

          <motion.div
            custom={4}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-ink/60"
          >
            <div>
              <span className="font-display text-lg font-bold text-sage-600">+160</span> {hero.statPays}
            </div>
            <div>
              <span className="font-display text-lg font-bold text-sage-600">9,5M</span> {hero.statDistributeurs}
            </div>
            <div>
              <span className="font-display text-lg font-bold text-sage-600">1978</span> {hero.statAnnee}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <motion.div style={{ y }} className="relative aspect-[4/5] overflow-hidden rounded-5xl bg-stone shadow-soft">
            <ProductImage src="/products/page-01.jpg" alt="Famille profitant du bien-être au quotidien" eager />
          </motion.div>

          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -left-6 top-10 hidden rounded-2xl bg-cream px-5 py-4 shadow-card sm:block"
          >
            <p className="text-2xl font-display font-bold text-sage-600">250+</p>
            <p className="text-xs text-ink/60">{hero.statComposants}</p>
          </motion.div>

          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            className="absolute -bottom-6 -right-4 hidden rounded-2xl bg-cream px-5 py-4 shadow-card sm:block"
          >
            <p className="text-2xl font-display font-bold text-clay-500">ISO 9001</p>
            <p className="text-xs text-ink/60">{hero.statIso}</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
