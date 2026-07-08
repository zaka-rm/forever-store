import { useLocation } from 'react-router-dom'
import { SectionReveal, RevealItem } from '@/components/ui/SectionReveal'
import { usePageMeta } from '@/lib/usePageMeta'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { WHATSAPP_NUMBER, NOTIFICATION_EMAIL } from '@/lib/constants'

interface Section {
  title: string
  body: string[]
}
interface Doc {
  title: string
  intro: string
  updated: string
  contactTitle: string
  contactLine: (wa: string, email: string) => string
  sections: Section[]
}

const PRIVACY_FR: Doc = {
  title: 'Politique de confidentialité',
  intro: "Votre confiance compte. Cette page explique simplement quelles données nous collectons, pourquoi, et vos droits.",
  updated: 'Dernière mise à jour',
  contactTitle: 'Nous contacter',
  contactLine: (wa, email) => `WhatsApp : ${wa} · Email : ${email}`,
  sections: [
    { title: '1. Quelles données collectons-nous ?', body: [
      "Lors d'une commande : votre nom, téléphone, adresse de livraison, ville, et éventuellement votre email et vos instructions de livraison.",
      "Lors d'un message, d'un avis, d'une inscription à la newsletter ou au programme de fidélité : les informations que vous saisissez.",
      "Nous ne collectons aucune donnée bancaire : le paiement s'effectue en espèces à la livraison.",
    ] },
    { title: '2. Pourquoi ces données ?', body: [
      'Uniquement pour préparer et livrer vos commandes, vous contacter (téléphone/WhatsApp) pour la confirmation et le suivi, et améliorer notre service.',
      "Avec votre accord, votre email peut servir à vous envoyer des offres. Vous pouvez vous désinscrire à tout moment.",
    ] },
    { title: '3. Qui a accès à vos données ?', body: [
      "Uniquement le vendeur et, pour la livraison, le transporteur. Vos données ne sont jamais vendues ni partagées à des fins publicitaires.",
      "Les données sont hébergées de façon sécurisée et protégées par des règles d'accès strictes.",
    ] },
    { title: '4. Mesure d\'audience', body: [
      "Le site peut utiliser des outils de mesure (Google Analytics, Meta Pixel, Microsoft Clarity) pour améliorer l'expérience. Ils ne reçoivent jamais vos coordonnées de livraison.",
    ] },
    { title: '5. Vos droits', body: [
      "Vous pouvez consulter, corriger ou supprimer vos données à tout moment : contactez-nous par WhatsApp ou email. Nous répondons sous 72 heures.",
    ] },
  ],
}

const PRIVACY_AR: Doc = {
  title: 'سياسة الخصوصية',
  intro: 'ثقتكم تهمّنا. تشرح هذه الصفحة ببساطة ما هي البيانات التي نجمعها، ولماذا، وما هي حقوقكم.',
  updated: 'آخر تحديث',
  contactTitle: 'تواصلوا معنا',
  contactLine: (wa, email) => `واتساب: ${wa} · البريد الإلكتروني: ${email}`,
  sections: [
    { title: '1. ما هي البيانات التي نجمعها؟', body: [
      'عند الطلب: اسمكم، هاتفكم، عنوان التوصيل، المدينة، وربما بريدكم الإلكتروني وتعليمات التوصيل.',
      'عند إرسال رسالة أو تقييم أو الاشتراك في النشرة أو برنامج الولاء: المعلومات التي تدخلونها.',
      'لا نجمع أي بيانات بنكية: يتم الدفع نقداً عند الاستلام.',
    ] },
    { title: '2. لماذا هذه البيانات؟', body: [
      'فقط لتحضير طلباتكم وتوصيلها، والتواصل معكم (هاتف/واتساب) للتأكيد والمتابعة، ولتحسين خدمتنا.',
      'بموافقتكم، قد يُستخدم بريدكم لإرسال العروض. يمكنكم إلغاء الاشتراك في أي وقت.',
    ] },
    { title: '3. من يطّلع على بياناتكم؟', body: [
      'فقط البائع، وشركة التوصيل من أجل الشحن. لا تُباع بياناتكم ولا تُشارَك لأغراض إعلانية.',
      'تُستضاف البيانات بشكل آمن وتحميها قواعد وصول صارمة.',
    ] },
    { title: '4. قياس الجمهور', body: [
      'قد يستخدم الموقع أدوات قياس (Google Analytics وMeta Pixel وMicrosoft Clarity) لتحسين التجربة. لا تصلها أبداً معلومات التوصيل الخاصة بكم.',
    ] },
    { title: '5. حقوقكم', body: [
      'يمكنكم الاطلاع على بياناتكم أو تصحيحها أو حذفها في أي وقت: تواصلوا معنا عبر واتساب أو البريد. نردّ خلال 72 ساعة.',
    ] },
  ],
}

const TERMS_FR: Doc = {
  title: 'Conditions générales de vente',
  intro: "Les règles simples et claires qui s'appliquent à toute commande passée sur ce site.",
  updated: 'Dernière mise à jour',
  contactTitle: 'Nous contacter',
  contactLine: (wa, email) => `WhatsApp : ${wa} · Email : ${email}`,
  sections: [
    { title: '1. Le vendeur', body: [
      "Ce site est édité par un Distributeur Indépendant agréé Forever Living Products, basé au Maroc. Il ne s'agit pas du site officiel de Forever Living Products International.",
      'Tous les produits vendus sont des produits Forever Living Products officiels et authentiques.',
    ] },
    { title: '2. Prix et paiement', body: [
      'Les prix sont affichés en dirhams marocains (DH), toutes taxes comprises.',
      "Le paiement s'effectue en espèces à la livraison. Vous vérifiez votre colis avant de payer.",
    ] },
    { title: '3. Commande et confirmation', body: [
      'Après votre commande, nous vous contactons par téléphone ou WhatsApp pour la confirmer. Une commande non confirmée sous 24 h peut être annulée automatiquement.',
      'Vous pouvez suivre votre commande à tout moment sur la page « Suivi de commande ».',
    ] },
    { title: '4. Livraison', body: [
      "Livraison partout au Maroc. Délai indicatif : 2 à 5 jours ouvrables après confirmation, selon la ville.",
      "La livraison est offerte à partir de 500 DH d'achat ; en dessous, des frais s'appliquent selon la ville.",
    ] },
    { title: '5. Retours et garantie', body: [
      "Satisfait ou remboursé : 30 jours pour retourner un produit non ouvert. Contactez-nous d'abord par WhatsApp.",
      "Produit reçu endommagé ou erroné : signalez-le sous 48 h avec une photo — nous remplaçons ou remboursons sans frais.",
    ] },
    { title: '6. Santé — avertissement important', body: [
      "Les compléments alimentaires ne remplacent pas une alimentation équilibrée ni un traitement médical. Toute personne sous traitement doit demander l'avis de son médecin. Tenir hors de portée des enfants.",
    ] },
    { title: '7. Contact', body: [
      'Pour toute question ou réclamation : WhatsApp ou email. Nous répondons généralement sous 24 h.',
    ] },
  ],
}

const TERMS_AR: Doc = {
  title: 'الشروط العامة للبيع',
  intro: 'القواعد البسيطة والواضحة التي تنطبق على كل طلب يتم عبر هذا الموقع.',
  updated: 'آخر تحديث',
  contactTitle: 'تواصلوا معنا',
  contactLine: (wa, email) => `واتساب: ${wa} · البريد الإلكتروني: ${email}`,
  sections: [
    { title: '1. البائع', body: [
      'يُدار هذا الموقع من طرف موزّع مستقل معتمد لمنتجات Forever Living Products، مقرّه بالمغرب. وهو ليس الموقع الرسمي لشركة Forever Living Products International.',
      'جميع المنتجات المباعة أصلية ورسمية من Forever Living Products.',
    ] },
    { title: '2. الأسعار والدفع', body: [
      'تُعرض الأسعار بالدرهم المغربي (DH)، شاملةً جميع الرسوم.',
      'يتم الدفع نقداً عند الاستلام. تتحققون من طردكم قبل الدفع.',
    ] },
    { title: '3. الطلب والتأكيد', body: [
      'بعد طلبكم، نتواصل معكم عبر الهاتف أو واتساب لتأكيده. الطلب غير المؤكَّد خلال 24 ساعة قد يُلغى تلقائياً.',
      'يمكنكم تتبّع طلبكم في أي وقت عبر صفحة « تتبع الطلب ».',
    ] },
    { title: '4. التوصيل', body: [
      'التوصيل إلى جميع أنحاء المغرب. المدة التقريبية: من 2 إلى 5 أيام عمل بعد التأكيد، حسب المدينة.',
      'التوصيل مجاني ابتداءً من 500 درهم؛ أقل من ذلك تُطبَّق رسوم حسب المدينة.',
    ] },
    { title: '5. الإرجاع والضمان', body: [
      'راضٍ أو مسترجَع: 30 يوماً لإرجاع منتج غير مفتوح. تواصلوا معنا أولاً عبر واتساب.',
      'منتج وصل تالفاً أو خاطئاً: أبلغونا خلال 48 ساعة مع صورة — نستبدله أو نعيد المبلغ دون رسوم.',
    ] },
    { title: '6. الصحة — تنبيه مهم', body: [
      'المكمّلات الغذائية لا تحل محل نظام غذائي متوازن أو علاج طبي. على من يخضع لعلاج استشارة طبيبه. يُحفظ بعيداً عن متناول الأطفال.',
    ] },
    { title: '7. التواصل', body: [
      'لأي سؤال أو شكوى: واتساب أو البريد الإلكتروني. نردّ عادةً خلال 24 ساعة.',
    ] },
  ],
}

export default function Legal() {
  const { pathname } = useLocation()
  const { locale } = useLanguage()
  const isTerms = pathname.includes('conditions')
  const ar = locale === 'ar'
  const doc = isTerms ? (ar ? TERMS_AR : TERMS_FR) : ar ? PRIVACY_AR : PRIVACY_FR
  usePageMeta(doc.title, doc.intro)

  return (
    <div className="pb-24 pt-32 sm:pt-40">
      <SectionReveal immediate className="container-px mx-auto max-w-3xl">
        <RevealItem className="mb-10">
          <h1 className="text-balance font-display text-4xl text-ink sm:text-5xl">{doc.title}</h1>
          <p className="mt-4 text-sm leading-relaxed text-ink/60">{doc.intro}</p>
          <p className="mt-2 text-xs text-ink/40">
            {doc.updated} : {new Date().toLocaleDateString(ar ? 'ar' : 'fr-FR')}
          </p>
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
            <h2 className="mb-2 font-display text-lg font-bold text-ink">{doc.contactTitle}</h2>
            <p className="text-sm text-ink/70">{doc.contactLine(WHATSAPP_NUMBER, NOTIFICATION_EMAIL)}</p>
          </section>
        </RevealItem>
      </SectionReveal>
    </div>
  )
}
