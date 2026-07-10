import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from '@/App'
import { CartProvider } from '@/lib/cartContext'
import { WishlistProvider } from '@/lib/wishlistContext'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { ProductsProvider } from '@/lib/productsContext'
import { BlogProvider } from '@/lib/blogContext'
import { FeatureFlagsProvider } from '@/lib/featureFlags'
import '@/styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <FeatureFlagsProvider>
        <LanguageProvider>
          <ProductsProvider>
            <BlogProvider>
              <CartProvider>
                <WishlistProvider>
                  <App />
                </WishlistProvider>
              </CartProvider>
            </BlogProvider>
          </ProductsProvider>
        </LanguageProvider>
      </FeatureFlagsProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

// Register the service worker for PWA install + offline — production only, so it
// never interferes with the local dev server / hot reload.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
