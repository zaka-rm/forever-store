export interface Review {
  id: string
  author: string
  rating: number
  date: string
  comment: string
}

const seedReviews: Record<string, Review[]> = {
  p01: [
    { id: 'r1', author: 'Marc D.', rating: 5, date: '2026-04-12', comment: "Le goût est bien meilleur que l'ancienne formule, et sans conservateur c'est un vrai plus." },
    { id: 'r2', author: 'Sophie L.', rating: 5, date: '2026-03-02', comment: 'Je le prends tous les matins depuis un an, je ne pourrais plus m\'en passer.' },
  ],
  p12: [
    { id: 'r3', author: 'Karim B.', rating: 5, date: '2026-02-18', comment: 'Digestion nettement améliorée après deux semaines.' },
  ],
  p27: [
    { id: 'r4', author: 'Julie M.', rating: 5, date: '2026-05-01', comment: 'Facile à avaler, aucun goût de poisson désagréable.' },
  ],
  p42: [
    { id: 'r5', author: 'Aïcha R.', rating: 5, date: '2026-01-22', comment: 'Ma peau est beaucoup moins réactive depuis que je l\'utilise chaque matin.' },
    { id: 'r6', author: 'Thomas P.', rating: 4, date: '2026-03-15', comment: 'Très rafraîchissant, parfait en été.' },
  ],
  p50: [
    { id: 'r7', author: 'Nadia S.', rating: 5, date: '2026-04-28', comment: 'Le meilleur baume à lèvres que j\'aie testé, dure longtemps.' },
  ],
}

export function getReviews(productId: string): Review[] {
  return seedReviews[productId] ?? []
}
