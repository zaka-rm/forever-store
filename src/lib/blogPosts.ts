export interface BlogPost {
  slug: string
  title: string
  titleAr: string
  excerpt: string
  excerptAr: string
  content: string[]
  contentAr: string[]
  image: string
  date: string
  readTime: string
  tag: string
  tagAr: string
}

export interface LocalizedBlogPost {
  slug: string
  title: string
  excerpt: string
  content: string[]
  image: string
  date: string
  readTime: string
  tag: string
}

/** Picks the right language for a post's text fields. */
export function getLocalizedPost(p: BlogPost, locale: 'fr' | 'ar'): LocalizedBlogPost {
  const ar = locale === 'ar'
  return {
    slug: p.slug,
    title: ar ? p.titleAr : p.title,
    excerpt: ar ? p.excerptAr : p.excerpt,
    content: ar && p.contentAr.length ? p.contentAr : p.content,
    image: p.image,
    date: p.date,
    readTime: p.readTime,
    tag: ar ? p.tagAr : p.tag,
  }
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'bienfaits-aloe-vera-science',
    title: "Les bienfaits de l'Aloe Vera : ce que dit la recherche",
    titleAr: 'فوائد الألوة فيرا: ماذا يقول العلم',
    excerpt:
      "L'Aloe Vera est utilisée depuis des millénaires, mais que sait-on réellement de ses effets ? Tour d'horizon de ses plus de 250 constituants actifs.",
    excerptAr:
      'تُستخدم الألوة فيرا منذ آلاف السنين، لكن ماذا نعرف حقاً عن تأثيراتها؟ جولة على أكثر من 250 مكوّناً فعّالاً فيها.',
    content: [
      "L'Aloe Vera est cultivée et utilisée depuis plus de 6 000 ans, mais ce n'est que récemment que la recherche a commencé à documenter précisément la richesse de sa composition. Plus de 250 constituants d'intérêt ont été identifiés dans le gel de la plante : des vitamines (A, B, C et E), des minéraux comme le zinc, le cuivre et le fer, des sucres complexes, des lipides et des glycoprotéines.",
      "En application topique, l'Aloe Vera est reconnue pour son fort pouvoir hydratant. Elle facilite la cicatrisation et contribue au renouvellement cutané en agissant sur la prolifération des kératinocytes et la synthèse du collagène de type I — deux mécanismes clés dans le maintien d'une peau souple et régénérée.",
      "En usage interne, la plante est appréciée pour sa richesse en molécules antioxydantes, qui aident à renforcer les défenses naturelles de l'organisme. Elle est aussi souvent associée à un effet bénéfique en cas de fatigue physique et psychique, ce qui explique sa popularité comme complément alimentaire quotidien.",
      "Chez Forever Living Products, chaque étape de la fabrication — culture, récolte, extraction, stabilisation et conditionnement — est réalisée et contrôlée en interne, avec des plantations aux États-Unis et en République Dominicaine, pour garantir un niveau de qualité constant.",
    ],
    contentAr: [
      'تُزرع الألوة فيرا وتُستخدم منذ أكثر من 6000 عام، لكن العلم لم يبدأ إلا مؤخراً في توثيق ثراء تركيبتها بدقة. تم تحديد أكثر من 250 مكوّناً ذا أهمية في هلام النبتة: فيتامينات (أ، ب، ج، هـ)، ومعادن مثل الزنك والنحاس والحديد، وسكريات مركّبة، ودهون، وبروتينات سكرية.',
      'عند الاستعمال الموضعي، تشتهر الألوة فيرا بقدرتها الترطيبية العالية. فهي تسهّل التئام الجروح وتساهم في تجديد البشرة عبر التأثير على تكاثر الخلايا الكيراتينية وإنتاج الكولاجين من النوع الأول — وهما آليتان أساسيتان للحفاظ على بشرة مرنة ومتجددة.',
      'أما داخلياً، فيُقدَّر النبات لغناه بجزيئات مضادة للأكسدة تساعد على تقوية دفاعات الجسم الطبيعية. كما يُربط غالباً بتأثير مفيد في حالات التعب الجسدي والذهني، ما يفسّر شهرته كمكمّل غذائي يومي.',
      'في Forever Living Products، تُنفَّذ كل مرحلة من مراحل التصنيع — الزراعة والحصاد والاستخلاص والتثبيت والتعبئة — وتُراقَب داخلياً، مع مزارع في الولايات المتحدة وجمهورية الدومينيكان، لضمان مستوى جودة ثابت.',
    ],
    image: '/products/page-04.jpg',
    date: '2026-05-14',
    readTime: '4 min',
    tag: 'Science',
    tagAr: 'علم',
  },
  {
    slug: 'integrer-aloe-vera-routine-quotidienne',
    title: "Comment intégrer l'Aloe Vera à votre routine quotidienne",
    titleAr: 'كيف تُدخل الألوة فيرا في روتينك اليومي',
    excerpt:
      "Boisson le matin, soin du soir : quelques façons simples et concrètes d'intégrer l'Aloe Vera à votre rythme de vie sans bouleverser vos habitudes.",
    excerptAr:
      'مشروب في الصباح، عناية في المساء: طرق بسيطة وملموسة لإدخال الألوة فيرا إلى نمط حياتك دون قلب عاداتك.',
    content: [
      "Le plus simple pour commencer est la pulpe d'Aloe Vera stabilisée à boire : 30 à 40 ml, trois fois par jour, avant les repas. Beaucoup de personnes l'intègrent à leur rituel du matin, comme elles le feraient avec un jus ou une tisane.",
      "Côté soin, l'Aloe First s'utilise en brume tout au long de la journée pour hydrater et rafraîchir la peau, y compris par-dessus le maquillage. Le soir, une routine simple — nettoyant, gel ou crème hydratante, soin ciblé si besoin — suffit pour profiter des bienfaits de la plante sans complexifier sa salle de bain.",
      "Pour les cheveux, le shampoing et l'après-shampoing Aloe-Jojoba peuvent remplacer vos produits actuels sans changement d'habitude particulier : même geste, formule différente.",
      "L'essentiel est la régularité plutôt que la quantité. Un geste simple répété chaque jour a généralement plus d'impact visible qu'une routine complexe suivie de façon irrégulière.",
    ],
    contentAr: [
      'أبسط بداية هي شرب هلام الألوة فيرا المثبَّت: من 30 إلى 40 مل، ثلاث مرات يومياً، قبل الوجبات. يدمجه كثيرون في طقوس صباحهم، تماماً كما يفعلون مع عصير أو شاي أعشاب.',
      'من ناحية العناية، يُستخدم Aloe First كرذاذ طوال اليوم لترطيب البشرة وإنعاشها، حتى فوق المكياج. في المساء، يكفي روتين بسيط — منظّف، هلام أو كريم مرطّب، وعناية موجَّهة عند الحاجة — للاستفادة من فوائد النبتة دون تعقيد.',
      'أما للشعر، فيمكن لشامبو وبلسم Aloe-Jojoba أن يحلّا محل منتجاتك الحالية دون تغيير في العادات: نفس الحركة، تركيبة مختلفة.',
      'الأهم هو الانتظام لا الكمية. حركة بسيطة تتكرر كل يوم غالباً ما يكون أثرها المرئي أكبر من روتين معقّد يُتَّبع بشكل غير منتظم.',
    ],
    image: '/products/page-42.jpg',
    date: '2026-05-28',
    readTime: '3 min',
    tag: 'Routine',
    tagAr: 'روتين',
  },
  {
    slug: 'usage-topique-vs-interne',
    title: 'Aloe Vera en usage topique vs interne : quelles différences ?',
    titleAr: 'الألوة فيرا: الاستعمال الموضعي مقابل الداخلي، ما الفرق؟',
    excerpt:
      "Boire de l'Aloe Vera et l'appliquer sur la peau n'ont pas le même objectif. Explications sur les deux usages et comment les combiner intelligemment.",
    excerptAr:
      'شرب الألوة فيرا وتطبيقها على البشرة ليسا لنفس الهدف. توضيح للاستعمالين وكيفية الجمع بينهما بذكاء.',
    content: [
      "L'Aloe Vera se prête à deux grandes familles d'usage, qui répondent à des besoins différents. En application topique — gel, crème, lotion — elle agit directement sur la peau : hydratation, apaisement, aide à la cicatrisation, notamment après une exposition au soleil ou en cas d'irritation.",
      "En usage interne — la pulpe à boire — elle est pensée comme un complément alimentaire qui accompagne le bien-être général de l'organisme, contribue au maintien du système immunitaire et apporte des antioxydants qui participent à la lutte contre le stress oxydatif.",
      "Les deux usages ne sont pas exclusifs : de nombreux utilisateurs combinent une pulpe à boire quotidienne avec une routine de soins topiques, considérant qu'ils répondent à deux besoins complémentaires plutôt qu'à un seul et même objectif.",
      "Comme pour tout complément alimentaire, il est recommandé de demander l'avis de son médecin traitant en cas de traitement médical en cours avant de démarrer une consommation régulière.",
    ],
    contentAr: [
      'تنقسم استعمالات الألوة فيرا إلى عائلتين كبيرتين تلبّيان حاجات مختلفة. موضعياً — هلام، كريم، لوشن — تعمل مباشرة على البشرة: ترطيب، تهدئة، ومساعدة على الالتئام، خاصة بعد التعرض للشمس أو في حالات التهيّج.',
      'أما داخلياً — الهلام المخصّص للشرب — فيُعتبر مكمّلاً غذائياً يرافق العافية العامة للجسم، ويساهم في دعم جهاز المناعة، ويوفّر مضادات أكسدة تشارك في مواجهة الإجهاد التأكسدي.',
      'الاستعمالان ليسا متعارضين: يجمع كثير من المستخدمين بين شرب الهلام يومياً وروتين عناية موضعي، باعتبارهما يلبّيان حاجتين متكاملتين لا هدفاً واحداً.',
      'كما هو الحال مع أي مكمّل غذائي، يُنصح باستشارة الطبيب المعالج في حال وجود علاج جارٍ قبل البدء في استهلاك منتظم.',
    ],
    image: '/products/page-31.jpg',
    date: '2026-06-09',
    readTime: '3 min',
    tag: 'Guide',
    tagAr: 'دليل',
  },
  {
    slug: 'recettes-pulpe-aloe-vera',
    title: "5 façons simples d'utiliser la pulpe d'Aloe Vera au quotidien",
    titleAr: '5 طرق بسيطة لاستعمال هلام الألوة فيرا يومياً',
    excerpt:
      "Au-delà du verre classique, quelques idées faciles pour varier la façon de consommer votre pulpe d'Aloe Vera stabilisée.",
    excerptAr:
      'أبعد من الكوب التقليدي، بعض الأفكار السهلة لتنويع طريقة تناول هلام الألوة فيرا المثبَّت.',
    content: [
      "1. Nature, avant le repas : la façon la plus simple. 30 à 40 ml, trois fois par jour, avant les repas — c'est la base de toute routine Aloe Vera.",
      "2. Dans un smoothie : ajoutez une dose de pulpe à votre smoothie du matin avec des fruits de saison pour une touche fraîche et légèrement acidulée.",
      "3. Dans de l'eau infusée : mélangée à de l'eau fraîche avec quelques feuilles de menthe, elle devient une boisson désaltérante pour l'été.",
      "4. Avec Forever Supergreens ou Forever Lite Ultra : versez un stick de Supergreens dans votre pulpe préférée, ou utilisez-la comme liquide de base pour votre shake Lite Ultra.",
      "5. En glaçons aromatisés : congelez de la pulpe d'Aloe Berry Nectar dans un bac à glaçons pour rafraîchir vos boissons de l'été avec une touche fruitée.",
    ],
    contentAr: [
      '1. صافية، قبل الوجبة: الطريقة الأبسط. من 30 إلى 40 مل، ثلاث مرات يومياً قبل الوجبات — وهي أساس كل روتين ألوة فيرا.',
      '2. في سموذي: أضف جرعة من الهلام إلى سموذي الصباح مع فواكه موسمية للمسة منعشة وحامضة قليلاً.',
      '3. في ماء منقوع: ممزوجاً بماء بارد مع بضع أوراق نعناع، يصبح مشروباً مرطّباً للصيف.',
      '4. مع Forever Supergreens أو Forever Lite Ultra: اسكب عصا Supergreens في هلامك المفضّل، أو استعمله سائلاً أساسياً لمخفوق Lite Ultra.',
      '5. مكعبات ثلج بنكهة: جمّد هلام Aloe Berry Nectar في قالب ثلج لإنعاش مشروبات صيفك بلمسة فاكهية.',
    ],
    image: '/products/page-09.jpg',
    date: '2026-06-20',
    readTime: '3 min',
    tag: 'Astuces',
    tagAr: 'نصائح',
  },
  {
    slug: 'tresors-de-la-ruche-forever',
    title: 'Les trésors de la ruche : propolis, gelée royale et pollen',
    titleAr: 'كنوز الخلية: العكبر، الغذاء الملكي وحبوب اللقاح',
    excerpt:
      "Au-delà de l'Aloe Vera, Forever puise dans la ruche des ingrédients précieux. Petit tour d'horizon de la propolis, de la gelée royale et du pollen d'abeille.",
    excerptAr:
      'أبعد من الألوة فيرا، تستمد Forever من الخلية مكوّنات ثمينة. جولة سريعة على العكبر والغذاء الملكي وحبوب اللقاح.',
    content: [
      "La ruche est l'un des laboratoires les plus fascinants de la nature. Forever y récolte trois ingrédients emblématiques, chacun avec ses propriétés propres, transformés avec le même soin que la plante d'Aloe Vera.",
      "La propolis est la substance résineuse que les abeilles collectent sur les bourgeons pour protéger et assainir leur ruche. Riche en flavonoïdes, elle est traditionnellement appréciée pour son rôle de soutien des défenses naturelles, particulièrement au changement de saison.",
      "La gelée royale est la nourriture exclusive de la reine — ce qui lui permet de vivre bien plus longtemps que les autres abeilles. Concentrée en nutriments, en acides aminés et en vitamines du groupe B, elle est réputée pour accompagner tonus et vitalité.",
      "Le pollen d'abeille, enfin, est une source naturelle de protéines, de vitamines et d'antioxydants. Beaucoup l'apprécient comme complément énergétique, saupoudré sur un yaourt ou ajouté à un smoothie. Comme toujours, un avis médical est recommandé en cas de traitement en cours ou d'allergie connue aux produits de la ruche.",
    ],
    contentAr: [
      'الخلية من أكثر مختبرات الطبيعة إبهاراً. تحصد منها Forever ثلاثة مكوّنات مميّزة، لكلّ منها خصائصه، تُعالَج بنفس عناية نبتة الألوة فيرا.',
      'العكبر مادة صمغية تجمعها النحل من البراعم لحماية خليّتها وتعقيمها. غنيّ بالفلافونويدات، ويُقدَّر تقليدياً لدوره في دعم الدفاعات الطبيعية، خصوصاً عند تغيّر الفصول.',
      'الغذاء الملكي هو الغذاء الحصري للملكة — ما يتيح لها العيش أطول بكثير من باقي النحل. مركّز بالعناصر الغذائية والأحماض الأمينية وفيتامينات المجموعة ب، ويشتهر بمرافقة الحيوية والنشاط.',
      'أما حبوب اللقاح، فهي مصدر طبيعي للبروتينات والفيتامينات ومضادات الأكسدة. يفضّلها كثيرون كمكمّل للطاقة، تُرشّ على الزبادي أو تُضاف إلى سموذي. وكالعادة، يُنصح باستشارة الطبيب في حال وجود علاج جارٍ أو حساسية معروفة تجاه منتجات النحل.',
    ],
    image: '/products/page-10.jpg',
    date: '2026-07-01',
    readTime: '4 min',
    tag: 'Nutrition',
    tagAr: 'تغذية',
  },
  {
    slug: 'sport-energie-recuperation-forever',
    title: 'Sport, énergie et récupération : bien accompagner son effort',
    titleAr: 'الرياضة والطاقة والتعافي: كيف ترافق مجهودك',
    excerpt:
      "Avant, pendant et après l'entraînement — comment soutenir son énergie et sa récupération avec des gestes simples et une bonne hydratation.",
    excerptAr:
      'قبل التمرين وأثناءه وبعده — كيف تدعم طاقتك وتعافيك بحركات بسيطة وترطيب جيّد.',
    content: [
      "Que l'on soit sportif du dimanche ou plus assidu, l'énergie et la récupération reposent d'abord sur trois piliers : l'hydratation, une alimentation adaptée et un repos suffisant. Les compléments viennent en soutien de ces fondamentaux, jamais à leur place.",
      "Avant l'effort, l'hydratation est essentielle. Une boisson à base de pulpe d'Aloe Vera, riche en eau et en micronutriments, peut accompagner cette préparation. Forever Argi+, sa formule à base de L-arginine et de vitamines, est aussi appréciée des sportifs pour accompagner l'effort.",
      "Pendant l'entraînement, l'objectif est de maintenir un bon niveau d'hydratation. Après, la récupération passe par un apport en protéines et par le repos : Forever Lite Ultra, en shake, apporte des protéines et peut se glisser dans une collation post-entraînement.",
      "L'essentiel reste la régularité et l'écoute de son corps. Aucun complément ne remplace un sommeil de qualité et une alimentation équilibrée — ils en sont le complément, au sens propre du terme.",
    ],
    contentAr: [
      'سواء كنت رياضياً في العطلة أو أكثر مواظبة، تعتمد الطاقة والتعافي أولاً على ثلاث ركائز: الترطيب، وتغذية مناسبة، وراحة كافية. تأتي المكمّلات لدعم هذه الأساسيات، لا لتحلّ محلّها.',
      'قبل المجهود، الترطيب ضروري. مشروب مبني على هلام الألوة فيرا، غنيّ بالماء والعناصر الدقيقة، يمكن أن يرافق هذا التحضير. كما يُقدّر الرياضيون Forever Argi+ بتركيبته المبنية على L-arginine والفيتامينات لمرافقة المجهود.',
      'أثناء التمرين، الهدف هو الحفاظ على مستوى ترطيب جيّد. وبعده، يمرّ التعافي عبر تزويد بالبروتينات والراحة: يوفّر Forever Lite Ultra، كمخفوق، بروتينات ويمكن إدراجه في وجبة خفيفة بعد التمرين.',
      'يبقى الأهم هو الانتظام والإصغاء إلى الجسم. لا مكمّل يعوّض نوماً جيّداً وتغذية متوازنة — فهي مكمّلة لهما بالمعنى الحرفي.',
    ],
    image: '/products/page-19.jpg',
    date: '2026-07-08',
    readTime: '3 min',
    tag: 'Fitness',
    tagAr: 'لياقة',
  },
  {
    slug: 'routine-peau-minimaliste-aloe-vera',
    title: "Une routine peau minimaliste avec l'Aloe Vera",
    titleAr: 'روتين بشرة بسيط مع الألوة فيرا',
    excerpt:
      "Trois gestes suffisent. Comment construire une routine de soin simple, efficace et fidèle à l'esprit « moins mais mieux ».",
    excerptAr:
      'ثلاث خطوات تكفي. كيف تبني روتين عناية بسيطاً وفعّالاً ووفيّاً لمبدأ «أقل ولكن أفضل».',
    content: [
      "La tendance est aux routines à rallonge — dix produits, autant d'étapes. Pourtant, une peau saine se contente souvent de l'essentiel : nettoyer, hydrater, protéger. Trois gestes, matin et soir, suffisent à la plupart d'entre nous.",
      "Le matin : un nettoyant doux, une crème hydratante, et surtout une protection solaire dès qu'il y a de la lumière. L'Aloe Sunscreen SPF 30 combine protection et confort pour un usage quotidien.",
      "Le soir : on démaquille et on nettoie pour débarrasser la peau des impuretés de la journée, puis on applique un soin hydratant. Une à deux fois par semaine, un gommage doux aide à raviver l'éclat.",
      "Le secret n'est pas dans le nombre de produits, mais dans la régularité et la qualité des formules. Une routine simple, suivie chaque jour, donne presque toujours de meilleurs résultats qu'une routine complexe appliquée de façon irrégulière.",
    ],
    contentAr: [
      'الموضة اليوم روتينات طويلة — عشرة منتجات، وعشر خطوات. ومع ذلك، غالباً ما تكتفي البشرة الصحية بالأساسي: تنظيف، ترطيب، حماية. ثلاث خطوات، صباحاً ومساءً، تكفي معظمنا.',
      'صباحاً: منظّف لطيف، كريم مرطّب، وقبل كل شيء حماية من الشمس منذ ظهور الضوء. يجمع Aloe Sunscreen SPF 30 بين الحماية والراحة للاستعمال اليومي.',
      'مساءً: نزيل المكياج وننظّف لتخليص البشرة من شوائب اليوم، ثم نضع عناية مرطّبة. مرة إلى مرتين أسبوعياً، يساعد تقشير لطيف على إعادة الإشراق.',
      'السرّ ليس في عدد المنتجات، بل في الانتظام وجودة التركيبات. روتين بسيط يُتَّبع كل يوم يعطي دائماً تقريباً نتائج أفضل من روتين معقّد يُطبَّق بشكل غير منتظم.',
    ],
    image: '/products/page-32.jpg',
    date: '2026-07-15',
    readTime: '3 min',
    tag: 'Beauté',
    tagAr: 'جمال',
  },
]

export function getBlogPostBySlug(slug: string) {
  return blogPosts.find((p) => p.slug === slug)
}
