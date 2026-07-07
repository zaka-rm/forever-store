import { NavLink } from 'react-router-dom'
import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { NewsletterForm } from '@/components/ui/NewsletterForm'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export function Footer() {
  const { t } = useLanguage()
  const f = t.footer

  const columns = [
    {
      title: f.columns.shop.title,
      links: [
        { label: f.columns.shop.all, to: '/shop' },
        { label: f.columns.shop.bestsellers, to: '/shop' },
        { label: f.columns.shop.new, to: '/shop' },
      ],
    },
    {
      title: f.columns.company.title,
      links: [
        { label: f.columns.company.story, to: '/about' },
        { label: t.nav.blog, to: '/blog' },
        { label: t.nav.loyalty, to: '/fidelite' },
        { label: t.nav.becomeDistributor, to: '/devenir-distributeur' },
        { label: f.columns.company.contact, to: '/contact' },
      ],
    },
    {
      title: f.columns.help.title,
      links: [
        { label: f.columns.help.track, to: '/suivi' },
        { label: f.columns.help.shipping, to: '/contact' },
        { label: f.columns.help.faq, to: '/faq' },
      ],
    },
  ]

  return (
    <footer className="border-t border-ink/10 bg-cream-dark">
      <SectionReveal className="container-px mx-auto max-w-7xl py-16 sm:py-20">
        <RevealItem className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          <div className="col-span-2">
            <NavLink to="/" className="font-display text-3xl font-semibold text-sage-700">
              Naturaloé
            </NavLink>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink/60">{f.description}</p>
            <div className="mt-6 flex gap-3">
              {['IG', 'TT', 'PI'].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 text-xs text-ink/70 transition-colors hover:border-ink hover:text-ink"
                >
                  {s}
                </a>
              ))}
            </div>
            <div className="mt-8 max-w-xs">
              <NewsletterForm />
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <p className="mb-4 text-xs font-medium uppercase tracking-wider text-ink/40">
                {col.title}
              </p>
              <ul className="flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <NavLink to={link.to} className="text-sm text-ink/70 hover:text-ink">
                      {link.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </RevealItem>

        <RevealItem className="mt-12 max-w-3xl border-t border-ink/10 pt-8 text-[11px] leading-relaxed text-ink/40">
          <p>{f.legal}</p>
        </RevealItem>

        <RevealItem className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-ink/10 pt-8 text-xs text-ink/40 sm:flex-row">
          <p>© {new Date().getFullYear()} {f.copyright}</p>
          <div className="flex gap-6">
            <NavLink to="/confidentialite" className="hover:text-ink/70">
              {f.privacy}
            </NavLink>
            <NavLink to="/conditions" className="hover:text-ink/70">
              {f.terms}
            </NavLink>
          </div>
        </RevealItem>
      </SectionReveal>
    </footer>
  )
}
