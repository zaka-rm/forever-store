// The quiz is a problem → solution finder. Each "problem" points to a hero
// product (the recommended solution) plus complementary products, with a short
// bilingual explanation of WHY it helps. Slugs must exist in the catalogue.

export interface QuizProblem {
  id: string
  label: string
  labelAr: string
  heroSlug: string
  alsoSlugs: string[]
  why: string
  whyAr: string
}

export interface QuizArea {
  id: string
  label: string
  labelAr: string
  icon: 'droplet' | 'leaf' | 'pulse' | 'comb'
  problems: QuizProblem[]
}

export const quizAreas: QuizArea[] = [
  {
    id: 'skin',
    label: 'Ma peau',
    labelAr: 'بشرتي',
    icon: 'droplet',
    problems: [
      {
        id: 'dry',
        label: 'Sèche ou déshydratée',
        labelAr: 'جافة أو مفتقرة للترطيب',
        heroSlug: 'aloe-body-lotion',
        alsoSlugs: ['aloe-moisturizing-lotion', 'aloe-vera-gel-330ml'],
        why: "Riche en Aloe Vera, cette lotion nourrit intensément et retient l'hydratation. Associée à la pulpe à boire, elle hydrate votre peau de l'intérieur comme de l'extérieur.",
        whyAr: 'غنيّ بالألوة فيرا، يغذّي هذا اللوشن بعمق ويحافظ على الترطيب. ومع الهلام المخصّص للشرب، ترطّب بشرتك من الداخل والخارج معاً.',
      },
      {
        id: 'aging',
        label: 'Signes de l\'âge, rides',
        labelAr: 'علامات التقدّم في السن، التجاعيد',
        heroSlug: 'infinite-serum-raffermissant',
        alsoSlugs: ['infinite-creme-reparatrice', 'r3-factor'],
        why: "Le sérum raffermissant Infinite cible fermeté et rides grâce à des actifs concentrés. La crème réparatrice prolonge l'action pendant la nuit pour une peau visiblement repulpée.",
        whyAr: 'يستهدف سيروم Infinite المشدّ الثبات والتجاعيد بفضل مكوّنات مركّزة. ويمدّد الكريم المصلّح المفعول ليلاً لبشرة ممتلئة بوضوح.',
      },
      {
        id: 'sensitive',
        label: 'Sensible ou irritée',
        labelAr: 'حسّاسة أو متهيّجة',
        heroSlug: 'aloe-propolis-creme',
        alsoSlugs: ['aloe-first', 'aloe-vera-gel-330ml'],
        why: "La crème Aloe Propolis apaise et protège les peaux réactives grâce à l'Aloe Vera et à la propolis. L'Aloe First en brume calme instantanément les rougeurs.",
        whyAr: 'يهدّئ كريم Aloe Propolis البشرة الحسّاسة ويحميها بفضل الألوة فيرا والعكبر. ويهدّئ رذاذ Aloe First الاحمرار فوراً.',
      },
      {
        id: 'dull',
        label: 'Teint terne, imperfections',
        labelAr: 'بشرة باهتة، شوائب',
        heroSlug: 'sonya-gel-eclat',
        alsoSlugs: ['sonya-gel-nettoyant', 'infinite-soin-exfoliant'],
        why: "Le gel éclat Sonya ravive la luminosité du teint, tandis que le nettoyant purifie en douceur. Un gommage hebdomadaire affine le grain de peau.",
        whyAr: 'يعيد جل Sonya للإشراق نضارة البشرة، بينما ينقّي المنظّف بلطف. ويصقل تقشير أسبوعي ملمس البشرة.',
      },
    ],
  },
  {
    id: 'nutrition',
    label: 'Nutrition & vitalité',
    labelAr: 'التغذية والحيوية',
    icon: 'leaf',
    problems: [
      {
        id: 'energy',
        label: 'Fatigue, manque d\'énergie',
        labelAr: 'التعب، نقص الطاقة',
        heroSlug: 'forever-argi-plus',
        alsoSlugs: ['forever-bee-pollen', 'aloe-vera-gel-330ml'],
        why: "Forever Argi+ associe L-arginine et vitamines pour soutenir tonus et vitalité au quotidien. Le pollen d'abeille apporte un coup de fouet naturel.",
        whyAr: 'يجمع Forever Argi+ بين L-arginine والفيتامينات لدعم النشاط والحيوية يومياً. وتمنح حبوب اللقاح دفعة طبيعية.',
      },
      {
        id: 'digestion',
        label: 'Digestion, détox',
        labelAr: 'الهضم، التخلّص من السموم',
        heroSlug: 'aloe-vera-gel-330ml',
        alsoSlugs: ['forever-fiber', 'forever-active-pro-b'],
        why: "La pulpe d'Aloe Vera à boire accompagne le confort digestif au quotidien. Les fibres et les probiotiques complètent l'action pour un système digestif équilibré.",
        whyAr: 'يرافق هلام الألوة فيرا المخصّص للشرب راحة الهضم يومياً. وتكمّل الألياف والبروبيوتيك المفعول لجهاز هضمي متوازن.',
      },
      {
        id: 'immunity',
        label: 'Immunité, défenses',
        labelAr: 'المناعة، الدفاعات',
        heroSlug: 'forever-immublend',
        alsoSlugs: ['forever-propolis', 'forever-supergreens'],
        why: "Forever Immublend combine vitamines et nutriments ciblés pour soutenir les défenses naturelles. La propolis renforce l'organisme au changement de saison.",
        whyAr: 'يجمع Forever Immublend فيتامينات وعناصر موجَّهة لدعم الدفاعات الطبيعية. ويقوّي العكبر الجسم عند تغيّر الفصول.',
      },
      {
        id: 'joints',
        label: 'Articulations, mobilité',
        labelAr: 'المفاصل، الحركة',
        heroSlug: 'forever-move',
        alsoSlugs: ['forever-arctic-sea', 'aloe-msm-gel'],
        why: "Forever Move soutient le confort articulaire et la mobilité. Les oméga-3 d'Arctic Sea et le gel MSM en application locale complètent la routine.",
        whyAr: 'يدعم Forever Move راحة المفاصل والحركة. وتكمّل أوميغا-3 من Arctic Sea وجل MSM الموضعي الروتين.',
      },
    ],
  },
  {
    id: 'fitness',
    label: 'Forme & minceur',
    labelAr: 'اللياقة والرشاقة',
    icon: 'pulse',
    problems: [
      {
        id: 'slimming',
        label: 'Minceur, gestion du poids',
        labelAr: 'الرشاقة، إدارة الوزن',
        heroSlug: 'forever-therm',
        alsoSlugs: ['forever-lean', 'forever-fiber'],
        why: "Forever Therm soutient le métabolisme dans le cadre d'un mode de vie actif. Forever Lean et les fibres aident à gérer l'appétit au fil de la journée.",
        whyAr: 'يدعم Forever Therm الأيض ضمن نمط حياة نشط. ويساعد Forever Lean والألياف على ضبط الشهية طوال اليوم.',
      },
      {
        id: 'sport',
        label: 'Énergie & récupération sport',
        labelAr: 'طاقة وتعافٍ رياضي',
        heroSlug: 'forever-argi-plus',
        alsoSlugs: ['forever-lite-ultra-vanille', 'forever-arctic-sea'],
        why: "Argi+ accompagne l'effort grâce à la L-arginine, tandis que le shake Lite Ultra apporte des protéines pour la récupération. Les oméga-3 soutiennent l'organisme.",
        whyAr: 'يرافق Argi+ المجهود بفضل L-arginine، بينما يوفّر مخفوق Lite Ultra بروتينات للتعافي. وتدعم أوميغا-3 الجسم.',
      },
    ],
  },
  {
    id: 'hair',
    label: 'Mes cheveux',
    labelAr: 'شعري',
    icon: 'comb',
    problems: [
      {
        id: 'hair-care',
        label: 'Cheveux secs ou abîmés',
        labelAr: 'شعر جاف أو تالف',
        heroSlug: 'shampoing-aloe-jojoba',
        alsoSlugs: ['apres-shampoing-aloe-jojoba', 'aloe-vera-gel-330ml'],
        why: "Le shampoing Aloe-Jojoba nettoie en douceur et nourrit la fibre. L'après-shampoing démêle et apporte brillance pour des cheveux souples et sains.",
        whyAr: 'ينظّف شامبو Aloe-Jojoba بلطف ويغذّي الشعرة. ويفكّ البلسم التشابك ويمنح لمعاناً لشعر مرن وصحي.',
      },
    ],
  },
]
