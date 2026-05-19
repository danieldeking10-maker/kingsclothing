/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AnimatePresence } from "motion/react";
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
const OrderConfirmationPage = lazy(() => import("./pages/OrderConfirmation").then(m => ({ default: m.OrderConfirmationPage })));
const OrdersPage = lazy(() => import("./pages/Orders").then(m => ({ default: m.OrdersPage })));

// Global loading skeleton for routes
const PageLoader = () => (
  <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-background">
    <div className="w-16 h-16 border-2 border-accent/20 border-t-accent rounded-full animate-spin mb-4" />
    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 italic animate-pulse">Synchronizing Authority...</p>
  </div>
);

export default function App() {
  useEffect(() => {
    initGlobalErrorHandlers();
  }, []);

  return (
    <ErrorBoundary>
      <Router>
      <AuthProvider>
        <CartProvider>
          <div className="min-h-screen flex flex-col font-sans selection:bg-accent selection:text-black bg-background text-white">
            <ProgressBar />
            <Header />
            <main className="flex-grow">
              <Suspense fallback={<PageLoader />}>
                <AnimatePresence mode="wait">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/shop" element={<ShopPage />} />
                    <Route path="/product/:id" element={<ProductPage />} />
                    <Route path="/agent" element={<AgentPortal />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/tos" element={<TOSPage />} />
                    <Route path="/order/:id" element={<OrderConfirmationPage />} />
                    <Route path="/orders" element={<OrdersPage />} />
                  </Routes>
                </AnimatePresence>
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
        </CartProvider>
      </AuthProvider>
    </Router>
    </ErrorBoundary>
  );
}



