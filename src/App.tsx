/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AnimatePresence, LazyMotion, domMax, m } from "motion/react";
import { AuthProvider } from "./lib/AuthContext";
import { CartProvider } from "./lib/CartContext";
import { Header, Footer } from "./components/Navigation";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initGlobalErrorHandlers } from "./lib/errorReporting";
import { useEffect, lazy, Suspense } from "react";
import { ProgressBar } from "./components/ui/ProgressBar";

// Lazy-loaded pages for optimized transition and initial load speed
const HomePage = lazy(() => import("./pages/Home").then(m => ({ default: m.HomePage })));
const ShopPage = lazy(() => import("./pages/Shop").then(m => ({ default: m.ShopPage })));
const ProductPage = lazy(() => import("./pages/Product").then(m => ({ default: m.ProductPage })));
const AgentPortal = lazy(() => import("./pages/Agent").then(m => ({ default: m.AgentPortal })));
const AuthPage = lazy(() => import("./pages/Auth").then(m => ({ default: m.AuthPage })));
const AboutPage = lazy(() => import("./pages/StaticPages").then(m => ({ default: m.AboutPage })));
const TOSPage = lazy(() => import("./pages/StaticPages").then(m => ({ default: m.TOSPage })));
const FAQPage = lazy(() => import("./pages/StaticPages").then(m => ({ default: m.FAQPage })));
const SizeGuidePage = lazy(() => import("./pages/StaticPages").then(m => ({ default: m.SizeGuidePage })));
const OrderConfirmationPage = lazy(() => import("./pages/OrderConfirmation").then(m => ({ default: m.OrderConfirmationPage })));
const OrdersPage = lazy(() => import("./pages/Orders").then(m => ({ default: m.OrdersPage })));

// Global loading skeleton for routes
const PageLoader = () => (
  <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-background">
    <div className="w-16 h-16 border-2 border-accent/20 border-t-accent rounded-full animate-spin mb-4" />
    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 italic animate-pulse">Synchronizing Authority...</p>
  </div>
);

// High-end aesthetic page variants (cross-fade and slide-up animation effect)
const pageVariants = {
  initial: {
    opacity: 0,
    y: 16,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1] as const, // Designer quintic/exponential decel ease-out
    },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: {
      duration: 0.3,
      ease: [0.7, 0, 0.84, 0] as const, // Clean acceleration ease-in
    },
  },
};

function AppContent() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-accent selection:text-black bg-background text-white">
      <ProgressBar />
      <Header />
      <main className="flex-grow overflow-hidden">
        <Suspense fallback={<PageLoader />}>
          <LazyMotion features={domMax}>
            <AnimatePresence mode="wait">
              <m.div
                key={location.pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full h-full"
              >
                <Routes location={location}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/shop" element={<ShopPage />} />
                  <Route path="/product/:id" element={<ProductPage />} />
                  <Route path="/agent" element={<AgentPortal />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/tos" element={<TOSPage />} />
                  <Route path="/faq" element={<FAQPage />} />
                  <Route path="/size-guide" element={<SizeGuidePage />} />
                  <Route path="/order/:id" element={<OrderConfirmationPage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                </Routes>
              </m.div>
            </AnimatePresence>
          </LazyMotion>
        </Suspense>
      </main>
      <Footer />
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#000',
            color: '#fff',
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)'
          }
        }}
      />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    initGlobalErrorHandlers();
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}



