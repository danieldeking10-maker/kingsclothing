/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { AnimatePresence, LazyMotion, domMax, m } from "motion/react";
import { AuthProvider } from "./lib/AuthContext";
import { CartProvider } from "./lib/CartContext";
import { WishlistProvider } from "./lib/WishlistContext";
import { Header, Footer } from "./components/Navigation";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initGlobalErrorHandlers } from "./lib/errorReporting";
import { useEffect, lazy, Suspense, useState, useCallback } from "react";
import { ProgressBar } from "./components/ui/ProgressBar";
import { AIChat } from "./components/AIChat";
import { ArrowUp, Copy, Check } from "lucide-react";

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
const PaymentTerminalPage = lazy(() => import("./pages/PaymentTerminal").then(m => ({ default: m.PaymentTerminalPage })));
const WishlistPage = lazy(() => import("./pages/Wishlist").then(m => ({ default: m.WishlistPage })));

const PageLoader = () => (
  <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-background">
    <div className="relative w-20 h-20 mb-6">
      <div className="absolute inset-0 rounded-full border-2 border-accent/10" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
      <div className="absolute inset-2 rounded-full border border-transparent border-b-gold-light animate-slow-spin opacity-60" />
    </div>
    <p className="text-[10px] font-black uppercase tracking-widest gold-text italic animate-pulse">Synchronizing Authority...</p>
  </div>
);

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
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: {
      duration: 0.3,
      ease: [0.7, 0, 0.84, 0] as const,
    },
  },
};

const pageTitles: Record<string, string> = {
  '/': 'KNGS Clothing | The Authority',
  '/shop': 'Shop Archive | KNGS Clothing',
  '/agent': 'Legion Agents | KNGS Clothing',
  '/auth': 'Access Protocol | KNGS Clothing',
  '/about': 'Our Doctrine | KNGS Clothing',
  '/tos': 'Terms of Sovereignty | KNGS Clothing',
  '/faq': 'Intelligence FAQ | KNGS Clothing',
  '/size-guide': 'Size Protocol | KNGS Clothing',
  '/orders': 'Order Archive | KNGS Clothing',
  '/pay': 'Payment Terminal | KNGS Clothing',
  '/payment': 'Payment Terminal | KNGS Clothing',
  '/wishlist': 'Wishlist Vault | KNGS Clothing',
};

function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const copyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('Link Copied to Archive');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy Failed');
    }
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 safe-bottom"
        >
          <button
            onClick={copyUrl}
            className="group p-3 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 hover:border-accent/40 hover:bg-accent/10 transition-all press-feedback shadow-2xl"
            aria-label="Copy page link"
            title="Copy page link"
          >
            {copied ? (
              <Check className="w-5 h-5 text-green-400" />
            ) : (
              <Copy className="w-5 h-5 text-white/60 group-hover:text-accent transition-colors" />
            )}
          </button>
          <button
            onClick={scrollToTop}
            className="group p-4 rounded-2xl gold-gradient hover:shadow-[0_0_40px_rgba(212,160,23,0.5)] transition-all press-feedback shadow-2xl animate-glow-pulse"
            aria-label="Scroll to top"
            title="Ascend"
          >
            <ArrowUp className="w-5 h-5 text-black font-black" strokeWidth={3} />
          </button>
        </m.div>
      )}
    </AnimatePresence>
  );
}

function AppContent() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    const matchedTitle = Object.keys(pageTitles).find(
      key => path === key || path.startsWith(key + '/')
    );
    document.title = matchedTitle ? pageTitles[matchedTitle] : pageTitles['/'];
  }, [location.pathname]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname, location.search]);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    const targets = document.querySelectorAll('.reveal-up, .reveal-in');
    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-accent selection:text-black bg-background text-white relative">
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
                  <Route path="/pay" element={<PaymentTerminalPage />} />
                  <Route path="/payment" element={<PaymentTerminalPage />} />
                  <Route path="/wishlist" element={<WishlistPage />} />
                </Routes>
              </m.div>
            </AnimatePresence>
          </LazyMotion>
        </Suspense>
      </main>
      <Footer />
      <ScrollToTopButton />
      <Toaster 
        position="bottom-right"
        gutter={12}
        toastOptions={{
          style: {
            background: '#000',
            color: '#fff',
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            borderRadius: '16px',
            border: '1px solid rgba(212,160,23,0.25)',
            padding: '14px 18px',
            boxShadow: '0 20px 60px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
          },
          success: {
            iconTheme: { primary: '#D4A017', secondary: '#000' },
            duration: 3500,
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#000' },
            duration: 5000,
          },
        }}
      />
      <AIChat />
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
            <WishlistProvider>
              <AppContent />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}



