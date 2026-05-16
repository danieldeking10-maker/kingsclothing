import { useState, useEffect, useRef } from 'react';
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Menu, X, Search, Zap, Phone, LogOut, Package, Users, Receipt, ArrowRight, Loader2, SlidersHorizontal, ArrowUpDown, Filter, ChevronDown, ShieldCheck, Music2, Download } from 'lucide-react';
import { motion, AnimatePresence, stagger } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { useCart } from '../lib/CartContext';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { cn } from '@/src/lib/utils';
import { PAYMENT_MOBILE_MONEY, SUPPORT_INTERACTION_NUMBER, CATEGORIES } from '@/src/constants';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { usePWAInstall } from '../hooks/usePWAInstall';

import { CartDrawer } from './CartDrawer';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'relevance' | 'popularity' | 'newest'>('relevance');
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
  const { installPrompt, isInstalled, showInstallPrompt } = usePWAInstall();

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
    const handleScroll = () => {
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (window.scrollY / height) * 100;
      setScrollProgress(scrolled);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim() && !selectedCategory) {
        setSearchResults({ products: [], agents: [], orders: [] });
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setShowResults(true);

      try {
        const q = searchQuery.toLowerCase();
        
        // Build Products Query
        let productsQuery;
        if (selectedCategory) {
          productsQuery = query(
            collection(db, 'products'),
            where('status', '==', 'approved'),
            where('category', '==', selectedCategory),
            limit(100)
          );
        } else {
          productsQuery = query(
            collection(db, 'products'),
            where('status', '==', 'approved'),
            limit(100)
          );
        }
        
        // Search Agents (Only if admin or has permission)
        let agentsQuery = null;
        if (isBrandOwner) {
          agentsQuery = query(collection(db, 'agents'), limit(50));
        }

        // Search Orders (Limit to own orders or all for admin)
        let ordersQuery = null;
        if (isBrandOwner) {
          ordersQuery = query(collection(db, 'orders'), limit(50));
        } else if (user) {
          ordersQuery = query(collection(db, 'orders'), where('customerId', '==', user.uid), limit(20));
        }

        const promises: Promise<any>[] = [getDocs(productsQuery)];
        if (agentsQuery) promises.push(getDocs(agentsQuery));
        else promises.push(Promise.resolve({ docs: [] }));

        if (ordersQuery) promises.push(getDocs(ordersQuery));
        else promises.push(Promise.resolve({ docs: [] }));

        const [productsSnap, agentsSnap, ordersSnap] = await Promise.all(promises);

        let products = productsSnap.docs
          .map((doc: any) => ({ id: doc.id, ...doc.data() }))
          .filter((p: any) => 
            !q || 
            p.name?.toLowerCase().includes(q) || 
            p.description?.toLowerCase().includes(q)
          );

        // Apply Sorting
        if (sortBy === 'popularity') {
          products.sort((a, b) => (b.views || 0) - (a.views || 0));
        } else if (sortBy === 'newest') {
          products.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        } else {
          // Relevance (simple string match priority)
          products.sort((a, b) => {
            const aNameMatch = a.name?.toLowerCase().startsWith(q);
            const bNameMatch = b.name?.toLowerCase().startsWith(q);
            if (aNameMatch && !bNameMatch) return -1;
            if (!aNameMatch && bNameMatch) return 1;
            return 0;
          });
        }

        products = products.slice(0, 5);

        const agents = agentsSnap.docs
          .map((doc: any) => ({ id: doc.id, ...doc.data() }))
          .filter((a: any) => 
            !q ||
            a.name?.toLowerCase().includes(q) || 
            a.email?.toLowerCase().includes(q)
          )
          .slice(0, 3);

        const orders = ordersSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((o: any) => 
            !q ||
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
  }, [searchQuery, selectedCategory, sortBy, user, isBrandOwner]);

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

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <span key={i} className="text-accent underline decoration-accent/30">{part}</span> 
            : part
        )}
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/10 text-foreground">
      {/* Scroll Progress Bar */}
      <div 
        className="absolute bottom-0 left-0 h-[2px] bg-accent z-[60] transition-all duration-150 ease-out"
        style={{ width: `${scrollProgress}%` }}
      />
      
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
                                <p className="text-[10px] font-black uppercase text-white group-hover:text-accent transition-colors">{highlightMatch(p.name, searchQuery)}</p>
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
            
            {installPrompt && (
              <button 
                onClick={showInstallPrompt}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-editorial text-accent animate-pulse px-4 py-2 bg-accent/10 rounded-full border border-accent/20 hover:bg-accent hover:text-black transition-all"
              >
                <Download className="w-3 h-3" />
                Install Protocol
              </button>
            )}

            <div className="flex items-center space-x-2 lg:space-x-8 border-l border-white/10 pl-2 lg:pl-8">
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
                      to={`/auth?mode=signin&redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`} 
                      className="text-[10px] font-black uppercase tracking-editorial text-white/40 hover:text-white transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link 
                      to={`/auth?mode=signup&redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`} 
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
              className="p-3 relative text-foreground/60 hover:text-accent transition-colors"
            >
              <ShoppingCart className="w-6 h-6" />
              {totalItems > 0 && (
                <span className="absolute top-1 right-1 bg-accent text-black text-[9px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-background">
                  {totalItems}
                </span>
              )}
            </button>
            <button 
              onClick={() => setIsMenuOpen(true)} 
              className="p-3 text-foreground/60 hover:text-accent transition-colors"
            >
              <Menu className="w-7 h-7" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Refined */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[90] md:hidden cursor-pointer"
            />
            
            {/* Refined Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
              className="fixed top-0 right-0 bottom-0 w-[90%] max-w-md bg-background border-l border-white/10 z-[100] md:hidden shadow-[-40px_0_100px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden"
            >
              {/* Header inside Menu */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/[0.02]">
                <span className="text-xl font-display font-black uppercase italic tracking-tighter">
                  KINGS<span className="text-accent">.</span>
                </span>
                <button 
                  onClick={() => setIsMenuOpen(false)} 
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all group active:scale-90"
                >
                  <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="px-6 py-8 space-y-10">
                  {/* Enhanced Mobile Search */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-4"
                  >
                    <div className="relative group">
                      <div className="flex items-center bg-white/5 rounded-2xl border border-white/10 focus-within:border-accent transition-all pl-4 pr-2">
                        <Search className="w-4 h-4 text-white/20 group-focus-within:text-accent transition-colors" />
                        <input
                          type="text"
                          placeholder="Search archives..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="flex-1 bg-transparent py-4 px-3 text-xs font-black uppercase tracking-widest outline-none placeholder:text-white/10 text-white"
                        />
                        {isSearching && <Loader2 className="w-4 h-4 text-accent animate-spin mr-2" />}
                      </div>
                    </div>

                    {/* Filter & Sort Chips */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                        <button
                          onClick={() => setSelectedCategory(null)}
                          className={cn(
                            "flex-shrink-0 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border",
                            !selectedCategory ? "bg-accent text-black border-accent" : "bg-white/5 text-white/40 border-white/5"
                          )}
                        >
                          All
                        </button>
                        {CATEGORIES.map(cat => (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={cn(
                              "flex-shrink-0 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border",
                              selectedCategory === cat ? "bg-accent text-black border-accent" : "bg-white/5 text-white/40 border-white/5"
                            )}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-3">
                         <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 flex-1">
                            {(['relevance', 'popularity', 'newest'] as const).map((sort) => (
                              <button
                                key={sort}
                                onClick={() => setSortBy(sort)}
                                className={cn(
                                  "flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                                  sortBy === sort ? "bg-white/10 text-white" : "text-white/20 hover:text-white/40"
                                )}
                              >
                                {sort}
                              </button>
                            ))}
                         </div>
                      </div>
                    </div>

                    {/* Quick Search Results List */}
                    <AnimatePresence>
                      {(searchQuery.length >= 2 || selectedCategory) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2 bg-white/[0.03] rounded-2xl p-2 border border-white/5"
                        >
                          {searchResults.products.map(p => (
                            <Link 
                              key={p.id} 
                              to={`/product/${p.id}`} 
                              onClick={() => { setIsMenuOpen(false); setSearchQuery(''); }} 
                              className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-colors"
                            >
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-black flex-shrink-0">
                                <img src={p.mockupImage} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black uppercase text-white truncate">{highlightMatch(p.name, searchQuery)}</p>
                                <p className="text-[8px] font-bold text-accent/60 uppercase">{p.category}</p>
                              </div>
                              <ArrowRight className="w-3 h-3 text-white/20" />
                            </Link>
                          ))}
                          {searchResults.products.length === 0 && !isSearching && (
                            <div className="text-center py-6">
                               <p className="text-[9px] font-black uppercase tracking-widest text-white/20">Empty Archives</p>
                            </div>
                          )}
                          {(searchQuery || selectedCategory) && (
                            <button 
                              onClick={() => {
                                navigate(`/shop?search=${searchQuery}${selectedCategory ? `&category=${selectedCategory}` : ''}`);
                                setIsMenuOpen(false);
                              }}
                              className="w-full py-3 mt-2 bg-white/5 hover:bg-accent hover:text-black transition-all rounded-xl text-[9px] font-black uppercase tracking-widest"
                            >
                              View All Results
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Navigation Links Staggered */}
                  <motion.nav 
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: { transition: { staggerChildren: 0.05, delayChildren: 0.2 } }
                    }}
                    className="flex flex-col space-y-3"
                  >
                    {[
                      { label: 'The Shop', path: '/shop', icon: Package },
                      { label: 'Legion Agents', path: '/agent', icon: Users },
                      { label: 'Security Hub', path: '/order/lookup', icon: ShieldCheck },
                    ].map((link, idx) => (
                      <motion.div 
                        key={idx}
                        variants={{
                          hidden: { opacity: 0, x: 20 },
                          visible: { opacity: 1, x: 0 }
                        }}
                      >
                        <Link 
                          to={link.path} 
                          onClick={() => setIsMenuOpen(false)} 
                          className="flex items-center justify-between py-4 px-6 bg-white/[0.03] hover:bg-accent border border-white/5 rounded-2xl transition-all group"
                        >
                          <div className="flex items-center gap-4">
                            <link.icon className="w-5 h-5 text-white/20 group-hover:text-black transition-colors" />
                            <span className="text-xl font-display font-black uppercase italic tracking-tighter group-hover:text-black transition-colors">{link.label}</span>
                          </div>
                          <ArrowRight className="w-5 h-5 text-black opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </Link>
                      </motion.div>
                    ))}

                    {installPrompt && (
                      <motion.div
                        variants={{
                          hidden: { opacity: 0, scale: 0.9 },
                          visible: { opacity: 1, scale: 1 }
                        }}
                      >
                         <button 
                          onClick={() => { showInstallPrompt(); setIsMenuOpen(false); }}
                          className="w-full py-6 bg-accent flex items-center justify-center gap-4 rounded-3xl group shadow-[0_20px_40px_rgba(234,179,8,0.1)]"
                        >
                          <Download className="w-6 h-6 text-black group-hover:scale-110 transition-transform" />
                          <span className="text-2xl font-display font-black uppercase italic tracking-tighter text-black">Download App</span>
                        </button>
                      </motion.div>
                    )}
                  </motion.nav>

                  {/* Account Section Refined */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="pt-6 border-t border-white/5"
                  >
                    {user ? (
                      <div className="space-y-4">
                        <Link 
                          to="/agent" 
                          onClick={() => setIsMenuOpen(false)} 
                          className="flex items-center gap-4 p-5 bg-accent rounded-3xl group active:scale-[0.98] transition-all"
                        >
                          <div className="w-12 h-12 rounded-full bg-black text-accent flex items-center justify-center text-xl font-black shadow-2xl">
                            {user.displayName?.charAt(0) || 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black uppercase text-black leading-none mb-1">{user.displayName || 'Citadel Citizen'}</p>
                            <p className="text-[10px] font-black text-black/40 uppercase tracking-widest">{isBrandOwner ? 'High Command' : 'Active Duty'}</p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-black" />
                        </Link>
                        <button 
                          onClick={() => { handleSignOut(); setIsMenuOpen(false); }}
                          className="w-full py-4 flex items-center justify-center gap-3 bg-white/5 hover:bg-red-500/10 text-white/40 hover:text-red-500 border border-white/10 rounded-2xl transition-all font-black uppercase text-[10px] tracking-[0.2em]"
                        >
                          <LogOut className="w-4 h-4" />
                          Termination Protocol
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <Link 
                          to={`/auth?mode=signin&redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`} 
                          onClick={() => setIsMenuOpen(false)} 
                          className="py-5 bg-white text-black text-center text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-accent transition-all active:scale-95"
                        >
                          Login
                        </Link>
                        <Link 
                          to={`/auth?mode=signup&redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`} 
                          onClick={() => setIsMenuOpen(false)} 
                          className="py-5 bg-white/5 border border-white/10 text-white text-center text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all active:scale-95"
                        >
                          Enlist
                        </Link>
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>

              {/* Mobile Menu Footer */}
              <div className="p-6 bg-white/[0.02] border-t border-white/5">
                <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-white/20 italic">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3" />
                    <span>{SUPPORT_INTERACTION_NUMBER}</span>
                  </div>
                  <span>Citadel Security v.2.4</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </header>
  );
}


import { RecentlyViewed } from './RecentlyViewed';

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const { installPrompt, showInstallPrompt } = usePWAInstall();

  return (
    <footer className="bg-background border-t border-white/10 py-16 px-4 relative">
      {/* Back to Top */}
      <button 
        onClick={scrollToTop}
        className="absolute -top-6 left-1/2 -translate-x-1/2 p-4 bg-white text-black rounded-full shadow-2xl hover:bg-accent hover:-translate-y-2 transition-all group z-10"
      >
        <ArrowUpDown className="w-5 h-5 group-hover:scale-110 transition-transform" />
      </button>

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
            {installPrompt && (
              <li><button onClick={showInstallPrompt} className="text-accent underline decoration-accent/20 hover:text-white transition-colors">Install App</button></li>
            )}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-editorial text-accent mb-8">Structure</h3>
          <p className="text-white/50 text-[11px] mb-6 font-medium leading-relaxed uppercase tracking-tighter">
            50% Initial Deposit required.<br/>Remaining 50% on Delivery.
          </p>
          <div className="glass p-5 rounded-2xl">
            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-2 italic tracking-[0.3em]">Support Hotline</p>
            <p className="text-sm font-bold text-accent uppercase tracking-widest leading-relaxed mb-4">{SUPPORT_INTERACTION_NUMBER}</p>
            <div className="h-px bg-white/5 w-full mb-4"></div>
            <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-2 italic tracking-[0.3em]">Payment Hub</p>
            <p className="text-[9px] font-bold text-white uppercase tracking-widest leading-relaxed">Secure Paystack Transactions Integrated with {PAYMENT_MOBILE_MONEY}</p>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-black uppercase tracking-editorial text-accent mb-8">Citizenship</h3>
          <p className="text-white/40 text-[9px] mb-6 font-black leading-relaxed uppercase tracking-widest italic leading-relaxed">
            Join the inner circle for early blueprint access and exclusive drops.
          </p>
          <div className="relative group">
            <input 
              type="email" 
              placeholder="ENTER EMAIL"
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-[10px] font-black uppercase tracking-widest outline-none focus:border-accent transition-all"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-accent text-black rounded-xl hover:scale-110 active:scale-95 transition-all">
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center space-x-6 mt-10">
            {[
              { name: 'Instagram', icon: Search },
              { name: 'X', icon: Zap },
              { name: 'TikTok', icon: Music2 }
            ].map((social) => (
              <a key={social.name} href="#" className="p-3 bg-white/5 rounded-full hover:bg-accent hover:text-black transition-all group border border-white/5">
                <social.icon className="w-4 h-4" />
              </a>
            ))}
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
