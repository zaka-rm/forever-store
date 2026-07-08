import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Product } from '@/lib/products'
import { getLocalizedProduct, stockStatus } from '@/lib/products'
import { ProductImage } from '@/components/ui/ProductImage'
import { RatingStars } from '@/components/ui/RatingStars'
import { useCart } from '@/lib/cartContext'
import { useWishlist } from '@/lib/wishlistContext'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { formatPrice } from '@/lib/format'

export function ProductCard({ product: rawProduct }: { product: Product }) {
  const { addToCart } = useCart()
  const { has, toggle } = useWishlist()
  const { t, locale } = useLanguage()
  const product = getLocalizedProduct(rawProduct, locale)
  const [justAdded, setJustAdded] = useState(false)
  const saved = has(product.id)
  const stock = stockStatus(product.stock)
  const soldOut = stock === 'out'

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault()
    if (soldOut) return
    addToCart(product)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1200)
  }

  function handleToggleWishlist(e: React.MouseEvent) {
    e.preventDefault()
    toggle(product.id)
  }

  return (
    <motion.div whileHover="hover" className="group flex flex-col">
      <Link to={`/shop/${product.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-4xl bg-stone">
          <motion.div
            variants={{ hover: { scale: 1.06 } }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="h-full w-full"
          >
            <ProductImage src={product.image} alt={product.name} />
          </motion.div>

          {soldOut ? (
            <span className="absolute start-3 top-3 rounded-full bg-clay-500/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-cream">
              {t.product.soldOut}
            </span>
          ) : stock === 'low' ? (
            <span className="absolute start-3 top-3 rounded-full bg-clay-500/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-cream">
              {product.stock} {t.product.lowStockSuffix}
            </span>
          ) : (product.bestSeller || product.new) ? (
            <span className="absolute start-3 top-3 rounded-full bg-cream/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-ink/70">
              {product.bestSeller ? t.product.bestSellerBadge : t.product.newBadge}
            </span>
          ) : null}

          <button
            type="button"
            onClick={handleToggleWishlist}
            aria-label={t.nav.openWishlist}
            className="absolute end-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-cream/90 transition-colors hover:bg-cream"
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-4 w-4 ${saved ? 'fill-clay-500 stroke-clay-500' : 'fill-none stroke-ink/60'}`}
              strokeWidth="1.6"
            >
              <path d="M12 20.5s-7.5-4.6-9.6-9.3C1 8.1 2.3 5 5.4 4.2c2-.5 3.9.3 5 1.9l1.6 2.2 1.6-2.2c1.1-1.6 3-2.4 5-1.9 3.1.8 4.4 3.9 3 7-2.1 4.7-9.6 9.3-9.6 9.3Z" />
            </svg>
          </button>

          <motion.button
            type="button"
            onClick={handleAdd}
            disabled={soldOut}
            initial={{ y: '110%' }}
            variants={{ hover: { y: '0%' } }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute inset-x-3 bottom-3 rounded-full py-3 text-sm font-medium sm:inset-x-4 ${
              soldOut ? 'cursor-not-allowed bg-ink/40 text-cream' : 'bg-ink text-cream'
            }`}
          >
            {soldOut ? t.product.outOfStock : justAdded ? t.product.added : t.product.addToCart}
          </motion.button>
        </div>

        <div className="mt-4 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-snug text-ink">{product.name}</p>
            <RatingStars rating={product.rating} count={product.reviewCount} className="mt-1" />
          </div>
          <p className="flex-none whitespace-nowrap font-medium text-ink">{formatPrice(product.price)}</p>
        </div>
      </Link>
    </motion.div>
  )
}
