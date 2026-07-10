import type { Product, Category } from '@/lib/products'

// ---------------------------------------------------------------------------
// Curated wellness "routines" — pre-built 3-product cures the customer can add
// to the cart in one tap. Because a routine has 3 items it automatically earns
// the −10% bundle discount, which raises the average order value while helping
// the customer choose a complete cure instead of a single product.
//
// Routines are defined by CATEGORY composition (not fixed product ids) so they
// keep working with the live database catalogue and the static fallback alike —
// we resolve one real, in-stock product per category at runtime.
// ---------------------------------------------------------------------------

export interface RoutineDef {
  id: string
  icon: string
  categories: Category[]
  title: { fr: string; ar: string }
  goal: { fr: string; ar: string }
}

export const ROUTINES: RoutineDef[] = [
  {
    id: 'digestion',
    icon: '🌿',
    categories: ["Pulpe d'Aloe Vera", 'Nutrition', 'Produits de la Ruche'],
    title: { fr: 'Routine Digestion & Vitalité', ar: 'روتين الهضم والحيوية' },
    goal: {
      fr: 'Purifier, nourrir et retrouver de l’énergie au quotidien.',
      ar: 'التطهير والتغذية واستعادة الطاقة اليومية.',
    },
  },
  {
    id: 'beaute',
    icon: '✨',
    categories: ['Beauté', 'Sonya', 'Cheveux'],
    title: { fr: 'Routine Beauté & Éclat', ar: 'روتين الجمال والإشراق' },
    goal: {
      fr: 'Une peau nourrie, des cheveux forts, un teint éclatant.',
      ar: 'بشرة مغذاة، شعر قوي، وإطلالة مشرقة.',
    },
  },
  {
    id: 'minceur',
    icon: '🔥',
    categories: ['Fitness & Minceur', 'Nutrition', "Pulpe d'Aloe Vera"],
    title: { fr: 'Routine Forme & Légèreté', ar: 'روتين الرشاقة والخفة' },
    goal: {
      fr: 'Accompagner votre silhouette avec une cure complète.',
      ar: 'مرافقة قوامك بكيور متكامل.',
    },
  },
  {
    id: 'premium',
    icon: '💎',
    categories: ['Infinite', 'Beauté', 'Produits de la Ruche'],
    title: { fr: 'Routine Éclat Premium', ar: 'روتين الإشراق الفاخر' },
    goal: {
      fr: 'Le soin d’exception, du sérum Infinite au meilleur de la ruche.',
      ar: 'العناية الاستثنائية، من سيروم Infinite إلى أفضل منتجات الخلية.',
    },
  },
]

export interface BuiltRoutine {
  def: RoutineDef
  items: Product[]
  subtotal: number
  discount: number
  total: number
}

const inStock = (p: Product) => p.stock === null || p.stock === undefined || p.stock > 0

// Pick one real product per category (prefer a best-seller, in stock). `avoidIds`
// holds products already used by other routines so each routine stays distinct.
export function buildRoutine(
  def: RoutineDef,
  products: Product[],
  discountRate: number,
  avoidIds: Set<string> = new Set(),
): BuiltRoutine {
  const chosen: Product[] = []
  const taken = (p: Product) => chosen.some((c) => c.id === p.id) || avoidIds.has(p.id)

  for (const cat of def.categories) {
    const pool = products.filter((p) => p.category === cat && inStock(p) && !taken(p))
    const pick = pool.find((p) => p.bestSeller) ?? pool[0]
    if (pick) chosen.push(pick)
  }

  // Backfill with best-sellers (still avoiding other routines' products) so the
  // routine always offers 3 distinct, real products.
  if (chosen.length < 3) {
    const backfill = products
      .filter((p) => inStock(p) && !taken(p))
      .sort((a, b) => Number(Boolean(b.bestSeller)) - Number(Boolean(a.bestSeller)))
    for (const p of backfill) {
      if (chosen.length >= 3) break
      chosen.push(p)
    }
  }

  const subtotal = chosen.reduce((sum, p) => sum + p.price, 0)
  // Only apply the bundle discount if the routine really has 3+ products.
  const discount = chosen.length >= 3 ? Math.round(subtotal * discountRate) : 0
  return { def, items: chosen, subtotal, discount, total: subtotal - discount }
}
