import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Product } from '@/lib/products'
import { trackAddToCart } from '@/lib/analytics'

export interface CartLine {
  product: Product
  quantity: number
}

interface CartContextValue {
  lines: CartLine[]
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  addToCart: (product: Product, quantity?: number) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  subtotal: number
  count: number
  lastAdded: Product | null
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [lastAdded, setLastAdded] = useState<Product | null>(null)

  function addToCart(product: Product, quantity = 1) {
    // When stock is tracked (a number), never let the cart exceed it.
    const cap = typeof product.stock === 'number' ? product.stock : Infinity
    if (cap <= 0) return // out of stock — nothing to add
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id)
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id
            ? { ...l, quantity: Math.min(l.quantity + quantity, cap) }
            : l,
        )
      }
      return [...prev, { product, quantity: Math.min(quantity, cap) }]
    })
    setLastAdded(product)
    setIsOpen(true)
    trackAddToCart(product.name, product.price)
  }

  function removeFromCart(productId: string) {
    setLines((prev) => prev.filter((l) => l.product.id !== productId))
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    setLines((prev) =>
      prev.map((l) => {
        if (l.product.id !== productId) return l
        const cap = typeof l.product.stock === 'number' ? l.product.stock : Infinity
        return { ...l, quantity: Math.min(quantity, cap) }
      }),
    )
  }

  function clearCart() {
    setLines([])
    setLastAdded(null)
  }

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0),
    [lines],
  )
  const count = useMemo(() => lines.reduce((sum, l) => sum + l.quantity, 0), [lines])

  const value: CartContextValue = {
    lines,
    isOpen,
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    subtotal,
    count,
    lastAdded,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
