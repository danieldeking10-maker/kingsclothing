import { useState } from 'react';
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Menu, X, Search, Phone, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { useCart } from '../lib/CartContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { cn } from '@/src/lib/utils';
import { MOMO_NUMBER } from '@/src/constants';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-xl md:text-2xl font-display font-black tracking-tighter uppercase italic">
              Kings<span className="text-accent underline decoration-white/20">.</span>
            </span>
          </Link>

          {/* Desktop Search */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8 relative">
            <div className="relative flex items-center bg-white/5 px-4 py-2 rounded-full border border-white/5 focus-within:border-accent/40 w-full transition-all">
              <Search className="w-4 h-4 text-white/20 mr-2" />
              <input
                type="text"
                placeholder="Search the Kingdom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-[11px] w-full outline-none placeholder:text-white/20 uppercase tracking-widest font-black"
              />
            </div>
          </form>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/shop" className="text-[10px] font-black uppercase tracking-editorial text-foreground/60 hover:text-accent transition-all">Shop</Link>
            <Link to="/agent" className="text-[10px] font-black uppercase tracking-editorial text-foreground/60 hover:text-accent transition-all">Agents</Link>
            
            <div className="flex items-center space-x-6 border-l border-white/10 pl-8">
              {user ? (
                <div className="flex items-center space-x-4">
                  <Link to="/agent" className="p-3 bg-white text-black rounded-full transition-all hover:bg-accent group box-border border-2 border-transparent hover:border-black/10">
                    <span className="text-[9px] font-black w-4 h-4 flex items-center justify-center uppercase">{user.displayName?.charAt(0) || 'U'}</span>
                  </Link>
                  <button onClick={handleSignOut} className="p-2 hover:bg-white/10 rounded-full transition-colors text-foreground/40 group relative" title="Sign Out">
                    <LogOut className="w-4 h-4" />
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-[8px] font-black uppercase px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10 z-[60]">Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-6">
                  <User className="w-4 h-4 text-white/20" />
                  <div className="flex items-center space-x-6">
                    <Link 
                      to="/auth" 
                      className="text-[10px] font-black uppercase tracking-editorial text-white/40 hover:text-white transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link 
                      to="/auth" 
                      className="text-[10px] font-black uppercase tracking-editorial bg-accent text-black px-10 py-3.5 rounded-full hover:bg-white hover:scale-105 transition-all shadow-[0_0_40px_rgba(242,125,38,0.15)]"
                    >
                      Sign Up
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <button className="relative p-3 hover:bg-white/10 rounded-full transition-colors border border-white/5">
              <ShoppingCart className="w-4 h-4" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent text-black text-[9px] font-black px-1.5 py-0.5 rounded-full animate-in zoom-in duration-300">
                  {totalItems}
                </span>
              )}
            </button>
          </nav>

          {/* Mobile Right Icons */}
          <div className="flex md:hidden items-center space-x-4">
            <button className="p-2 relative">
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute top-0 right-0 bg-accent text-black text-[8px] font-black px-1 py-0.5 rounded-full">
                  {totalItems}
                </span>
              )}
            </button>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2">
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="md:hidden fixed inset-0 top-[64px] bg-background z-[100] p-8 overflow-hidden"
          >
            <div className="space-y-12">
               <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="SEARCH..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border-none rounded-2xl py-6 px-10 text-3xl font-display font-black uppercase italic tracking-tighter"
                />
              </form>
              <nav className="flex flex-col space-y-8">
                <Link to="/shop" onClick={() => setIsMenuOpen(false)} className="text-5xl font-display font-black uppercase italic tracking-tighter">Shop</Link>
                <Link to="/agent" onClick={() => setIsMenuOpen(false)} className="text-5xl font-display font-black uppercase italic tracking-tighter">Agent Portal</Link>
                {user ? (
                  <>
                    <Link to="/agent" onClick={() => setIsMenuOpen(false)} className="text-5xl font-display font-black uppercase italic tracking-tighter text-accent underline decoration-white/20">
                      My Profile
                    </Link>
                    <button 
                      onClick={() => { handleSignOut(); setIsMenuOpen(false); }}
                      className="text-left text-3xl font-display font-black uppercase italic tracking-tighter text-white/20"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col space-y-6 pt-12 border-t border-white/5">
                    <Link to="/auth" onClick={() => setIsMenuOpen(false)} className="text-6xl font-display font-black uppercase italic tracking-tighter text-white/40 group hover:text-white transition-colors">
                      Sign In <span className="text-[10px] lowercase font-sans font-normal tracking-normal text-accent/50 align-middle ml-4">Initialize Access</span>
                    </Link>
                    <Link to="/auth" onClick={() => setIsMenuOpen(false)} className="text-6xl font-display font-black uppercase italic tracking-tighter text-accent group hover:translate-x-4 transition-transform">
                      Sign Up <span className="text-[10px] lowercase font-sans font-normal tracking-normal text-white/20 align-middle ml-4">Establish Presence</span>
                    </Link>
                  </div>
                )}
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}


export function Footer() {
  return (
    <footer className="bg-background border-t border-white/10 py-16 px-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
        <div className="space-y-6">
          <h2 className="text-2xl font-display font-black tracking-tighter uppercase italic">
            Kings<span className="text-accent underline decoration-white/10">.</span>
          </h2>
          <p className="text-white/50 text-sm leading-relaxed max-w-xs font-light">
            Locally crafted in the heart of Ghana. Built for those who refuse to settle.
          </p>
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-editorial text-accent mb-8">Navigation</h3>
          <ul className="space-y-4 text-white/60 text-xs font-bold uppercase tracking-widest">
            <li><Link to="/shop" className="hover:text-white transition-colors">The Shop</Link></li>
            <li><Link to="/agent" className="hover:text-white transition-colors">Become Agent</Link></li>
            <li><Link to="/about" className="hover:text-white transition-colors">Our Ethos</Link></li>
            <li><Link to="/tos" className="hover:text-white transition-colors">Terms</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-editorial text-accent mb-8">Structure</h3>
          <p className="text-white/50 text-[11px] mb-6 font-medium leading-relaxed uppercase tracking-tighter">
            50% Initial Deposit required.<br/>Remaining 50% on Delivery.
          </p>
          <div className="glass p-5 rounded-2xl">
            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-2">MoMo Reference</p>
            <p className="text-lg font-mono font-bold text-white tracking-widest">{MOMO_NUMBER}</p>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-editorial text-accent mb-8">Contact</h3>
          <a 
            href="mailto:contact@kingsclothing.com" 
            className="block text-white/60 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest mb-6"
          >
            KINGS@ACCRA.COMM
          </a>
          <div className="flex items-center space-x-3 text-[10px] uppercase font-black tracking-widest text-[#25D366]">
             <div className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
             <span>WhatsApp Live Support</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-16 mt-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-white/20 text-[9px] font-black uppercase tracking-[0.3em]">
        <p>&copy; 2026 KNGS BRAND. ACCRA, GHANA.</p>
        <div className="flex space-x-8 mt-6 md:mt-0">
           <span>Premium Heavyweight</span>
           <span>Studio Verified</span>
        </div>
      </div>

      {/* Floating WhatsApp */}
      <a
        href="https://wa.me/233534716125"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center"
      >
        <Phone className="w-6 h-6 fill-current" />
      </a>
    </footer>
  );
}
