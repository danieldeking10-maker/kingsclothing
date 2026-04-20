import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { SlidersHorizontal, ArrowUpDown, Grid3X3, List, RefreshCw, ChevronRight, Zap } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CATEGORIES, PRICING } from '@/src/constants';
import { formatGHC, cn } from '@/src/lib/utils';

// Helper to get price from the nested pricing object
const getPrice = (category: string, subType?: string): number => {
  if (category === 'T-Shirts' && subType) {
    return (PRICING['T-Shirts'] as any)[subType] || 120;
  }
  return (PRICING as any)[category] || 150;
};

export function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search')?.toLowerCase() || '';
  const sortParam = searchParams.get('sort') || 'newest';
  
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState(sortParam);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSortBy(sortParam);
  }, [sortParam]);

  const setBy = (val: string) => {
    setSortBy(val);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sort', val);
    setSearchParams(newParams);
  };

  useEffect(() => {
    // Fetch approved products
    const q = query(collection(db, 'products'), where('status', '==', 'approved'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search) || 
                          p.category.toLowerCase().includes(search) ||
                          (p.agentName || '').toLowerCase().includes(search);
      const matchesCategory = selectedCategory === 'All' || p.category.includes(selectedCategory);
      return matchesSearch && matchesCategory;
    }).sort((a, b) => {
      if (sortBy === 'newest') {
        const timeA = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
        const timeB = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
        return timeB - timeA;
      }
      const priceA = getPrice(a.category, a.subType);
      const priceB = getPrice(b.category, b.subType);
      if (sortBy === 'price-low') return priceA - priceB;
      if (sortBy === 'price-high') return priceB - priceA;
      return 0;
    });
  }, [products, search, selectedCategory, sortBy]);

  const isNew = (createdAt: any) => {
    if (!createdAt) return false;
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const diff = Date.now() - date.getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  };

  return (
    <div className="bg-background min-h-screen py-16 md:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <header className="mb-20">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-12 border-b border-white/5">
            <div className="max-w-2xl">
              <span className="text-accent text-[10px] font-black uppercase tracking-editorial mb-4 block animate-pulse">The Catalog</span>
              <h1 className="text-6xl md:text-8xl font-display font-black tracking-tighter uppercase italic leading-[0.85]">
                {search ? `Searching: ${search}` : 'Authority Blueprint'}
              </h1>
            </div>
            
            <div className="flex flex-wrap gap-3">
              {['All', ...CATEGORIES].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border",
                    selectedCategory === cat 
                      ? "bg-white text-black border-white" 
                      : "bg-transparent text-white/40 border-white/10 hover:border-white/30"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Filters & Sorting */}
        <div className="flex justify-between items-center mb-16 px-2">
           <div className="flex items-center space-x-2 text-[10px] uppercase font-black tracking-widest text-white/20 italic">
              <SlidersHorizontal className="w-3 h-3" />
              <span>Visible Structure: {filteredProducts.length} DESIGNS</span>
           </div>
           
           <div className="relative">
              <select 
                value={sortBy}
                onChange={(e) => setBy(e.target.value)}
                className="appearance-none bg-white/5 border border-white/10 rounded-full py-3 px-8 pr-12 text-[10px] font-black uppercase tracking-widest focus:ring-accent text-accent outline-none"
              >
                <option value="newest">NEWEST</option>
                <option value="price-low">PRICE: MIN</option>
                <option value="price-high">PRICE: MAX</option>
              </select>
              <ArrowUpDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 pointer-events-none" />
           </div>
        </div>

        {loading ? (
          <div className="py-40 flex flex-col items-center space-y-6">
              <RefreshCw className="w-12 h-12 animate-spin text-accent/20" strokeWidth={1} />
              <p className="text-[10px] font-black uppercase tracking-editorial text-white/20">Scanning Database...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product, idx) => (
                <motion.div
                  layout
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative"
                >
                  <Link to={`/product/${product.id}`} className="block space-y-6">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-[#1A1A1B] group-hover:shadow-[0_0_50px_rgba(242,125,38,0.1)] transition-all duration-700">
                      <img 
                        src={product.mockupImage} 
                        alt={product.name} 
                        className="w-full h-full object-cover grayscale brightness-75 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-1000 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Brand Tag */}
                      <div className="absolute top-6 left-6 p-1 bg-background/50 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
                         <div className="px-3 py-1 flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                            <p className="text-[8px] font-black uppercase tracking-widest text-white">
                              {product.category} Collection
                            </p>
                            {isNew(product.createdAt) && (
                              <span className="ml-2 bg-accent text-black text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">NEW</span>
                            )}
                         </div>
                      </div>

                      {/* Agent Badge */}
                      {product.agentName && (
                        <div className="absolute bottom-6 left-6 right-6 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                          <div className="glass p-4 rounded-2xl flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-tighter text-white/60">Designed by <span className="text-accent underline decoration-accent/20 italic">{product.agentName}</span></span>
                            <ChevronRight className="w-4 h-4 text-accent" />
                          </div>
                        </div>
                      )}

                      {/* Status/Format Badge */}
                      <div className="absolute top-6 right-6">
                         <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center backdrop-blur-xl group-hover:border-accent/40 transition-colors">
                            <Zap className="w-4 h-4 text-white/20 group-hover:text-accent group-hover:scale-125 transition-all" />
                         </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-end px-2">
                      <div className="space-y-2">
                        <h3 className="text-xl font-display font-black uppercase italic tracking-tight group-hover:text-accent transition-colors leading-none">
                          {product.name}
                        </h3>
                        <p className="text-[9px] font-medium text-white/30 uppercase tracking-[0.3em] font-sans">
                           EST. ACCRA • 2026
                        </p>
                      </div>
                      <p className="text-accent font-mono font-black text-lg tracking-tighter">
                        {formatGHC(getPrice(product.category, product.subType))}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {!loading && filteredProducts.length === 0 && (
          <div className="py-40 text-center space-y-8">
            <div className="inline-block glass p-8 rounded-full border-dashed">
               <SlidersHorizontal className="w-12 h-12 text-white/5 mx-auto" />
            </div>
            <h2 className="text-3xl font-display font-black uppercase italic text-white/20">Empty Blueprint Section</h2>
            <button 
              onClick={() => { setSelectedCategory('All'); }}
              className="px-10 py-4 bg-accent text-black font-black uppercase text-[10px] tracking-widest rounded-full hover:scale-105 transition-transform"
            >
              RESET SCAN
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

