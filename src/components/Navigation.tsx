import { useState, useEffect, useRef } from 'react';
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Menu, X, Search, Phone, LogOut, Package, Users, Receipt, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { useCart } from '../lib/CartContext';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { cn } from '@/src/lib/utils';
import { MOMO_NUMBER } from '@/src/constants';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

import { CartDrawer } from './CartDrawer';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    products: any[];
    agents: any[];
    orders: any[];
  }>({ products: [], agents: [], orders: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { user, isBrandOwner } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Search Logic
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults({ products: [], agents: [], orders: [] });
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setShowResults(true);

      try {
        const q = searchQuery.toLowerCase();
        
        // Search Products
        const productsQuery = query(
          collection(db, 'products'),
          where('status', '==', 'approved'),
          limit(50) // Fetch more to filter locally more effectively
        );
        
        // Search Agents (Only if admin or has permission)
        let agentsQuery = null;
        if (isBrandOwner) {
          agentsQuery = query(collection(db, 'agents'), limit(50));
        }

        // Search Orders (Limit to own orders or all for admin)
        let ordersQuery = null;
        if (isBrandOwner) {
          ordersQuery = query(collection(db, 'orders'), limit(20));
        } else if (user) {
          ordersQuery = query(collection(db, 'orders'), where('customerId', '==', user.uid), limit(20));
        }

        const promises: Promise<any>[] = [getDocs(productsQuery)];
        if (agentsQuery) promises.push(getDocs(agentsQuery));
        else promises.push(Promise.resolve({ docs: [] }));

        if (ordersQuery) promises.push(getDocs(ordersQuery));
        else promises.push(Promise.resolve({ docs: [] }));

        const [productsSnap, agentsSnap, ordersSnap] = await Promise.all(promises);

        const products = productsSnap.docs
          .map((doc: any) => ({ id: doc.id, ...doc.data() }))
          .filter((p: any) => 
            p.name?.toLowerCase().includes(q) || 
            p.description?.toLowerCase().includes(q) ||
            p.category?.toLowerCase().includes(q)
          )
          .slice(0, 5);

        const agents = agentsSnap.docs
          .map((doc: any) => ({ id: doc.id, ...doc.data() }))
          .filter((a: any) => 
            a.name?.toLowerCase().includes(q) || 
            a.email?.toLowerCase().includes(q)
          )
          .slice(0, 3);

        const orders = ordersSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((o: any) => 
            o.id?.toLowerCase().includes(q) || 
            o.customerName?.toLowerCase().includes(q)
          )
          .slice(0, 3);

        setSearchResults({ products, agents, orders });
      } catch (error) {
        console.error("Global search error:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, user, isBrandOwner]);

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
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/10 text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20 gap-4">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center space-x-2">
            <span className="text-xl md:text-2xl font-display font-black tracking-tighter uppercase italic">
              Kings<span className="text-accent underline decoration-white/20">.</span>
            </span>
          </Link>

          {/* Desktop Search */}
          <div ref={searchRef} className="hidden md:block flex-1 max-w-[180px] lg:max-w-md mx-2 lg:mx-8 relative">
            <form onSubmit={(e) => { e.preventDefault(); navigate(`/shop?search=${searchQuery}`); setShowResults(false); }} className="relative flex items-center bg-white/5 px-4 py-2 rounded-full border border-white/5 focus-within:border-accent/40 w-full transition-all">
              <Search className="w-4 h-4 text-white/20 mr-2" />
              <input
                type="text"
                placeholder="Search archives..."
                value={searchQuery}
                onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-[10px] w-full outline-none placeholder:text-white/20 uppercase tracking-widest font-black"
              />
              {isSearching && <Loader2 className="w-3 h-3 text-accent animate-spin" />}
            </form>

            <AnimatePresence>
              {showResults && (searchQuery.length >= 2) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-4 bg-black/95 backdrop-blur-3xl border border-white/10 rounded-3xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-[100]"
                >
                  <div className="p-2">
                    {/* Products Section */}
                    {searchResults.products.length > 0 && (
                      <div className="mb-4">
                        <div className="px-4 py-2">
                           <p className="text-[8px] font-black uppercase tracking-widest text-white/20 flex items-center gap-2">
                             <Package className="w-2 h-2" /> Blueprints
                           </p>
                        </div>
                        <div className="space-y-1">
                          {searchResults.products.map(p => (
                            <Link 
                              key={p.id} 
                              to={`/product/${p.id}`}
                              onClick={() => setShowResults(false)}
                              className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-2xl transition-colors group"
                            >
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5">
                                <img src={p.mockupImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                              <div className="flex-1">
                                <p className="text-[10px] font-black uppercase text-white group-hover:text-accent transition-colors">{p.name}</p>
                                <p className="text-[9px] font-medium text-white/40 uppercase tracking-tighter">{p.category}</p>
                              </div>
                              <ArrowRight className="w-3 h-3 text-white/0 group-hover:text-white/20 -translate-x-2 group-hover:translate-x-0 transition-all" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Agents Section */}
                    {searchResults.agents.length > 0 && (
                      <div className="mb-4 border-t border-white/5 pt-2">
                        <div className="px-4 py-2">
                           <p className="text-[8px] font-black uppercase tracking-widest text-white/20 flex items-center gap-2">
                             <Users className="w-2 h-2" /> Citizens
                           </p>
                        </div>
                        <div className="space-y-1">
                          {searchResults.agents.map(a => (
                            <Link 
                              key={a.id} 
                              to="/agent"
                              onClick={() => setShowResults(false)}
                              className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-2xl transition-colors group"
                            >
                              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                                <span className="text-[10px] font-black text-black uppercase">{a.name?.[0] || '?'}</span>
                              </div>
                              <div className="flex-1">
                                <p className="text-[10px] font-black uppercase text-white">{a.name}</p>
                                <p className="text-[8px] font-mono font-bold text-accent/60 tracking-tight">{a.role || 'Citadel Agent'}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Orders Section */}
                    {searchResults.orders.length > 0 && (
                      <div className="mb-4 border-t border-white/5 pt-2">
                        <div className="px-4 py-2">
                           <p className="text-[8px] font-black uppercase tracking-widest text-white/20 flex items-center gap-2">
                             <Receipt className="w-2 h-2" /> Transactions
                           </p>
                        </div>
                        <div className="space-y-1">
                          {searchResults.orders.map(o => (
                            <Link 
                              key={o.id} 
                              to={`/order/${o.id}`}
                              onClick={() => setShowResults(false)}
                              className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-2xl transition-colors group"
                            >
                              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                <Receipt className="w-3 h-3 text-white/20 px-1" />
                              </div>
                              <div className="flex-1">
                                <p className="text-[9px] font-mono font-black uppercase text-white mb-0.5">#{o.id.slice(-6).toUpperCase()}</p>
                                <div className="flex items-center gap-2">
                                  <p className="text-[8px] font-bold text-white/40 uppercase">{o.customerName}</p>
                                  <span className="text-[7px] font-black px-1.5 py-0.5 bg-accent/20 text-accent rounded uppercase">{o.status}</span>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No Results */}
                    {!isSearching && searchResults.products.length === 0 && searchResults.agents.length === 0 && searchResults.orders.length === 0 && (
                      <div className="p-8 text-center">
                        <Search className="w-8 h-8 text-white/5 mx-auto mb-2" />
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">No matching archives found</p>
                      </div>
                    )}

                    {isSearching && searchResults.products.length === 0 && searchResults.agents.length === 0 && (
                      <div className="p-8 text-center">
                        <Loader2 className="w-8 h-8 text-accent/20 animate-spin mx-auto mb-2" />
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-accent/40">Calibrating Oracle...</p>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => { navigate(`/shop?search=${searchQuery}`); setShowResults(false); }}
                    className="w-full py-4 bg-white/5 hover:bg-accent hover:text-black transition-all text-[9px] font-black uppercase tracking-[0.3em] border-t border-white/5"
                  >
                    View Comprehensive Results
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-2 lg:space-x-8 flex-shrink-0">
            <Link to="/shop" className="text-[10px] font-black uppercase tracking-editorial text-foreground/60 hover:text-accent transition-all">Shop</Link>
            <Link to="/agent" className="text-[10px] font-black uppercase tracking-editorial text-foreground/60 hover:text-accent transition-all">Agents</Link>
            
            <div className="flex items-center space-x-2 lg:space-x-6 border-l border-white/10 pl-2 lg:pl-8">
              {user ? (
                <div className="flex items-center space-x-2 lg:space-x-4">
                  <Link to="/agent" className="p-2 lg:p-3 bg-white text-black rounded-full transition-all hover:bg-accent group box-border border-2 border-transparent hover:border-black/10">
                    <span className="text-[9px] font-black w-4 h-4 flex items-center justify-center uppercase">{user.displayName?.charAt(0) || 'U'}</span>
                  </Link>
                  <button onClick={handleSignOut} className="p-2 hover:bg-white/10 rounded-full transition-colors text-foreground/40 group relative" title="Sign Out">
                    <LogOut className="w-4 h-4" />
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-[8px] font-black uppercase px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10 z-[60]">Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2 lg:space-x-6">
                  <User className="hidden lg:block w-4 h-4 text-white/20" />
                  <div className="flex items-center space-x-2 lg:space-x-6">
                    <Link 
                      to="/auth" 
                      className="text-[10px] font-black uppercase tracking-editorial text-white/40 hover:text-white transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link 
                      to="/auth" 
                      className="text-[10px] font-black uppercase tracking-editorial bg-accent text-black px-4 lg:px-10 py-2.5 lg:py-3 rounded-full hover:bg-white hover:scale-105 transition-all shadow-[0_0_40px_rgba(242,125,38,0.15)]"
                    >
                      Sign Up
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 lg:p-3 hover:bg-white/10 rounded-full transition-colors border border-white/5"
            >
              <ShoppingCart className="w-4 h-4" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent text-black text-[9px] font-black px-1.5 py-0.5 rounded-full animate-in zoom-in duration-300">
                  {totalItems}
                </span>
              )}
            </button>
          </nav>

          {/* Mobile Right Icons */}
          <div className="flex md:hidden items-center space-x-2 flex-shrink-0">
            <button 
              onClick={() => setIsCartOpen(true)}
              className="p-3 relative"
            >
              <ShoppingCart className="w-6 h-6" />
              {totalItems > 0 && (
                <span className="absolute top-1 right-1 bg-accent text-black text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  {totalItems}
                </span>
              )}
            </button>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-3">
              {isMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
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
              {/* Mobile Search - Enhanced */}
               <div className="relative">
                <input
                  type="text"
                  placeholder="SEARCH..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border-none rounded-2xl py-6 px-10 text-3xl font-display font-black uppercase italic tracking-tighter focus:bg-white/10 transition-all outline-none"
                />
                {isSearching && <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 w-6 h-6 text-accent animate-spin" />}

                {/* Mobile Search Results */}
                <AnimatePresence>
                  {searchQuery.length >= 2 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-6 space-y-8 overflow-hidden bg-black/40 rounded-3xl p-4 border border-white/5"
                    >
                      {/* Products */}
                      {searchResults.products.length > 0 && (
                        <div>
                          <p className="text-[10px] font-black uppercase text-white/20 mb-4 ml-2">Collections</p>
                          <div className="space-y-4">
                            {searchResults.products.map(p => (
                              <Link key={p.id} to={`/product/${p.id}`} onClick={() => { setIsMenuOpen(false); setSearchQuery(''); }} className="flex items-center gap-4">
                                <img src={p.mockupImage} className="w-12 h-12 rounded-xl object-cover bg-white/5" alt="" referrerPolicy="no-referrer" />
                                <span className="text-xl font-display font-black uppercase italic truncate">{p.name}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Agents */}
                      {searchResults.agents.length > 0 && (
                        <div>
                          <p className="text-[10px] font-black uppercase text-white/20 mb-4 ml-2">Agents</p>
                          <div className="space-y-4">
                            {searchResults.agents.map(a => (
                              <Link key={a.id} to="/agent" onClick={() => { setIsMenuOpen(false); setSearchQuery(''); }} className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-black text-black">{a.name?.[0]}</div>
                                <span className="text-xl font-display font-black uppercase italic">{a.name}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {searchResults.products.length === 0 && searchResults.agents.length === 0 && !isSearching && (
                        <p className="py-10 text-center text-[10px] font-black uppercase tracking-widest text-white/20">No matching blueprints found</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <nav className="flex flex-col space-y-8">
                <Link to="/shop" onClick={() => setIsMenuOpen(false)} className="text-3xl sm:text-4xl md:text-5xl font-display font-black uppercase italic tracking-tighter">Shop</Link>
                <Link to="/agent" onClick={() => setIsMenuOpen(false)} className="text-3xl sm:text-4xl md:text-5xl font-display font-black uppercase italic tracking-tighter">Agent Portal</Link>
                {user ? (
                  <>
                    <Link to="/agent" onClick={() => setIsMenuOpen(false)} className="text-3xl sm:text-4xl md:text-5xl font-display font-black uppercase italic tracking-tighter text-accent underline decoration-white/20">
                      My Profile
                    </Link>
                    <button 
                      onClick={() => { handleSignOut(); setIsMenuOpen(false); }}
                      className="text-left text-2xl sm:text-3xl font-display font-black uppercase italic tracking-tighter text-white/20"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col space-y-6 pt-12 border-t border-white/5">
                    <Link to="/auth" onClick={() => setIsMenuOpen(false)} className="text-4xl sm:text-5xl md:text-6xl font-display font-black uppercase italic tracking-tighter text-white/40 group hover:text-white transition-colors">
                      Sign In <span className="text-[10px] lowercase font-sans font-normal tracking-normal text-accent/50 align-middle ml-4">Initialize Access</span>
                    </Link>
                    <Link to="/auth" onClick={() => setIsMenuOpen(false)} className="text-4xl sm:text-5xl md:text-6xl font-display font-black uppercase italic tracking-tighter text-accent group hover:translate-x-4 transition-transform">
                      Sign Up <span className="text-[10px] lowercase font-sans font-normal tracking-normal text-white/20 align-middle ml-4">Establish Presence</span>
                    </Link>
                  </div>
                )}
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </header>
  );
}


import { RecentlyViewed } from './RecentlyViewed';

export function Footer() {
  return (
    <footer className="bg-background border-t border-white/10 py-16 px-4">
      <RecentlyViewed />
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
