import { useLocation } from 'react-router-dom'
import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { usePageMeta } from '@/lib/usePageMeta'
import { WHATSAPP_NUMBER, NOTIFICATION_EMAIL } from '@/lib/constants'

interface Section {
  title: string
  body: string[]
}

const PRIVACY: { title: string; intro: string; sections: Section[] } = {
  title: 'Politique de confidentialité',
  intro:
    "Votre confiance compte. Cette page explique simplement quelles données nous collectons, pourquoi, et vos droits.",
  sections: [
    {
      title: '1. Quelles données collectons-nous ?',
      body: [
        "Lors d'une commande : votre nom, téléphone, adresse de livraison, ville, et éventuellement votre email et vos instructions de livraison.",
        "Lors d'un message de contact, d'un avis, d'une inscription à la newsletter ou au programme de fidélité : les informations que vous saisissez dans le formulaire.",
        "Nous ne collectons aucune donnée bancaire : le paiement s'effectue en espèces à la livraison.",
      ],
    },
    {
      title: '2. Pourquoi ces données ?',
      body: [
        'Uniquement pour préparer et livrer vos commandes, vous contacter (téléphone/WhatsApp) pour la confirmation et le suivi, et améliorer notre service.',
        "Avec votre accord, votre email peut servir à vous envoyer des offres (newsletter). Vous pouvez vous désinscrire à tout moment.",
      ],
    },
    {
      title: '3. Qui a accès à vos données ?',
      body: [
        'Uniquement le vendeur (Distributeur Indépendant) et, pour la livraison, le transporteur. Vos données ne sont jamais vendues ni partagées à des fins publicitaires.',
        'Les données sont hébergées de façon sécurisée (Supabase) et protégées par des règles d\'accès strictes.',
      ],
    },
    {
      title: '4. Mesure d\'audience',
      body: [
        "Le site peut utiliser des outils de mesure (ex. Google Analytics, Meta Pixel, Microsoft Clarity) pour comprendre l'utilisation du site et améliorer l'expérience. Ces outils ne reçoivent jamais vos coordonnées de livraison.",
      ],
    },
    {
      title: '5. Vos droits',
      body: [
        "Vous pouvez demander à consulter, corriger ou supprimer vos données à tout moment : contactez-nous par WhatsApp ou par email (coordonnées ci-dessous). Nous répondons sous 72 heures.",
      ],
    },
  ],
}

const TERMS: { title: string; intro: string; sections: Section[] } = {
  title: 'Conditions générales de vente',
  intro:
    "Les règles simples et claires qui s'appliquent à toute commande passée sur ce site.",
  sections: [
    {
      title: '1. Le vendeur',
      body: [
        "Ce site est édité par un Distributeur Indépendant agréé Forever Living Products, basé au Maroc. Il ne s'agit pas du site officiel de Forever Living Products International.",
        'Tous les produits vendus sont des produits Forever Living Products officiels et authentiques.',
      ],
    },
    {
      title: '2. Prix et paiement',
      body: [
        'Les prix sont affichés en dirhams marocains (DH), toutes taxes comprises.',
        "Le paiement s'effectue en espèces à la livraison (contre remboursement). Vous vérifiez votre colis avant de payer. Le paiement par carte, s'il est proposé, est traité par un prestataire sécurisé.",
      ],
    },
    {
      title: '3. Commande et confirmation',
      body: [
        'Après votre commande, nous vous contactons par téléphone ou WhatsApp pour la confirmer. Une commande non confirmée sous 24 h peut être annulée automatiquement.',
        "Vous pouvez suivre votre commande à tout moment sur la page « Suivi de commande » avec votre numéro de commande.",
      ],
    },
    {
      title: '4. Livraison',
      body: [
        "Livraison partout au Maroc. Délai indicatif : 2 à 5 jours ouvrables après confirmation, selon la ville.",
        'La livraison est offerte à partir de 500 DH d\'achat ; en dessous, des frais s\'appliquent selon la ville (affichés au moment de la commande).',
      ],
    },
    {
      title: '5. Retours et garantie',
      body: [
        "Satisfait ou remboursé : vous disposez de 30 jours pour retourner un produit non ouvert et non entamé. Contactez-nous d'abord par WhatsApp pour organiser le retour.",
        "Produit reçu endommagé ou erroné : signalez-le sous 48 h avec une photo — nous remplaçons ou remboursons sans frais.",
      ],
    },
    {
      title: '6. Santé — avertissement important',
      body: [
        "Les compléments alimentaires ne remplacent pas une alimentation équilibrée ni un traitement médical. Toute personne sous traitement doit demander l'avis de son médecin avant consommation. Tenir hors de portée des enfants.",
      ],
    },
    {
      title: '7. Contact',
      body: [
        'Pour toute question, réclamation ou demande : WhatsApp ou email (coordonnées ci-dessous). Nous répondons dans les meilleurs délais, généralement sous 24 h.',
      ],
    },
  ],
}

export default function Legal() {
  const { pathname } = useLocation()
  const doc = pathname.includes('conditions') ? TERMS : PRIVACY
  usePageMeta(doc.title, doc.intro)

  return (
    <div className="pb-24 pt-32 sm:pt-40">
      <SectionReveal immediate className="container-px mx-auto max-w-3xl">
        <RevealItem className="mb-10">
          <h1 className="text-balance font-display text-4xl text-ink sm:text-5xl">{doc.title}</h1>
          <p className="mt-4 text-sm leading-relaxed text-ink/60">{doc.intro}</p>
          <p className="mt-2 text-xs text-ink/40">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
        </RevealItem>

        <RevealItem className="flex flex-col gap-8">
          {doc.sections.map((s) => (
            <section key={s.title}>
              <h2 className="mb-3 font-display text-xl font-bold text-ink">{s.title}</h2>
              <div className="flex flex-col gap-2.5">
                {s.body.map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed text-ink/70">{p}</p>
                ))}
              </div>
            </section>
          ))}

          <section className="rounded-3xl bg-cream-dark p-6">
            <h2 className="mb-2 font-display text-lg font-bold text-ink">Nous contacter</h2>
            <p className="text-sm text-ink/70">
              WhatsApp : {WHATSAPP_NUMBER} · Email : {NOTIFICATION_EMAIL}
            </p>
          </section>
        </RevealItem>
      </SectionReveal>
    </div>
  )
}
