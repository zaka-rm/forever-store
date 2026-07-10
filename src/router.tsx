import { Suspense, lazy } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Routes, Route, useLocation } from 'react-router-dom'
import { PageTransition } from '@/components/ui/PageTransition'

const Home = lazy(() => import('@/pages/Home'))
const Shop = lazy(() => import('@/pages/Shop'))
const Routines = lazy(() => import('@/pages/Routines'))
const ProductDetail = lazy(() => import('@/pages/ProductDetail'))
const About = lazy(() => import('@/pages/About'))
const Contact = lazy(() => import('@/pages/Contact'))
const Checkout = lazy(() => import('@/pages/Checkout'))
const OrderConfirmation = lazy(() => import('@/pages/OrderConfirmation'))
const TrackOrder = lazy(() => import('@/pages/TrackOrder'))
const OrderRespond = lazy(() => import('@/pages/OrderRespond'))
const Search = lazy(() => import('@/pages/Search'))
const Favoris = lazy(() => import('@/pages/Favoris'))
const Quiz = lazy(() => import('@/pages/Quiz'))
const Loyalty = lazy(() => import('@/pages/Loyalty'))
const BecomeDistributor = lazy(() => import('@/pages/BecomeDistributor'))
const Faq = lazy(() => import('@/pages/Faq'))
const Legal = lazy(() => import('@/pages/Legal'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const Blog = lazy(() => import('@/pages/Blog'))
const BlogPost = lazy(() => import('@/pages/BlogPost'))
const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin'))
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))

function withTransition(node: React.ReactNode) {
  return <PageTransition>{node}</PageTransition>
}

export function AppRoutes() {
  const location = useLocation()

  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={withTransition(<Home />)} />
          <Route path="/shop" element={withTransition(<Shop />)} />
          <Route path="/shop/:slug" element={withTransition(<ProductDetail />)} />
          <Route path="/routines" element={withTransition(<Routines />)} />
          <Route path="/about" element={withTransition(<About />)} />
          <Route path="/contact" element={withTransition(<Contact />)} />
          <Route path="/checkout" element={withTransition(<Checkout />)} />
          <Route path="/checkout/confirmation" element={withTransition(<OrderConfirmation />)} />
          <Route path="/suivi" element={withTransition(<TrackOrder />)} />
          <Route path="/commande" element={withTransition(<OrderRespond />)} />
          <Route path="/recherche" element={withTransition(<Search />)} />
          <Route path="/favoris" element={withTransition(<Favoris />)} />
          <Route path="/quiz" element={withTransition(<Quiz />)} />
          <Route path="/fidelite" element={withTransition(<Loyalty />)} />
          <Route path="/devenir-distributeur" element={withTransition(<BecomeDistributor />)} />
          <Route path="/faq" element={withTransition(<Faq />)} />
          <Route path="/confidentialite" element={withTransition(<Legal />)} />
          <Route path="/conditions" element={withTransition(<Legal />)} />
          <Route path="/blog" element={withTransition(<Blog />)} />
          <Route path="/blog/:slug" element={withTransition(<BlogPost />)} />
          <Route path="/admin/login" element={withTransition(<AdminLogin />)} />
          <Route path="/admin" element={withTransition(<AdminDashboard />)} />
          <Route path="*" element={withTransition(<NotFound />)} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  )
}
