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
import { HomePage } from "./pages/Home";
import { ShopPage } from "./pages/Shop";
import { ProductPage } from "./pages/Product";
import { AgentPortal } from "./pages/Agent";
import { AuthPage } from "./pages/Auth";
import { AboutPage, TOSPage } from "./pages/StaticPages";
import { OrderConfirmationPage } from "./pages/OrderConfirmation";

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <div className="min-h-screen flex flex-col font-sans selection:bg-accent selection:text-black">
            <Header />
            <main className="flex-grow">
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
                </Routes>
              </AnimatePresence>
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
  );
}



