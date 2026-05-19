import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { SlidersHorizontal, ArrowUpDown, RefreshCw, ChevronRight, Zap, Trash2, Edit3 } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CATEGORIES, PRICING, FABRIC_COLORS, GSM_OPTIONS } from '@/src/constants';
import { formatGHC, cn } from '@/src/lib/utils';
import { useAuth } from '../lib/AuthContext';
import toast from 'react-hot-toast';

import { ProductCard } from '@/src/components/ProductCard';
import { ProductCardSkeleton } from '@/src/components/ui/Skeleton';
import { ErrorBoundary } from '@/src/components/ErrorBoundary';

// Helper to get price from the nested pricing object
const getPrice = (product: any): number => {
  const category = product.category;
  const gsm = (product.gsmOptions && product.gsmOptions[0]) || '260';
  
  if (product.gsmPrices && product.gsmPrices[gsm]) {
    return product.gsmPrices[gsm];
  }

  const globalCategoryPricing = (PRICING as any)[category];
  if (globalCategoryPricing) {
    if (typeof globalCategoryPricing === 'object') {
      return globalCategoryPricing[gsm] || globalCategoryPricing['260'] || 150;
    }
    return globalCategoryPricing;
  }
  return 150;
};

export function ShopPage() {
  const { user, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search')?.toLowerCase() || '';
  const sortParam = searchParams.get('sort') || 'newest';
  
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedColor, setSelectedColor] = useState('All');
  const [selectedGSM, setSelectedGSM] = useState('All');
  const [showOnlySale, setShowOnlySale] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState(sortParam);
  const [loading, setLoading] = useState(true);
  const [displayLimit, setDisplayLimit] = useState(12);

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
    const q = query(
      collection(db, 'products'), 
      where('status', '==', 'approved'),
      limit(40)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((p: any) => !p.isPrivate); // Filter out private designs from public shop
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
      const price = getPrice(p);
      const matchesSearch = p.name.toLowerCase().includes(search) || 
                          p.category.toLowerCase().includes(search) ||
                          (p.agentName || '').toLowerCase().includes(search);
      const matchesCategory = selectedCategory === 'All' || p.category.includes(selectedCategory);
      const matchesPrice = price >= priceRange[0] && price <= priceRange[1];
      const matchesColor = selectedColor === 'All' || 
                          (p.colors && p.colors.includes(selectedColor)) || 
                          (p.allowedColors && p.allowedColors.includes(selectedColor));
      const matchesGSM = selectedGSM === 'All' || (p.gsmOptions && p.gsmOptions.includes(selectedGSM));
      const matchesSale = !showOnlySale || p.isOnSale === true;

      return matchesSearch && matchesCategory && matchesPrice && matchesColor && matchesGSM && matchesSale;
    }).sort((a, b) => {
      if (sortBy === 'newest') {
        const timeA = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
        const timeB = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
        return timeB - timeA;
      }
      const priceA = getPrice(a);
      const priceB = getPrice(b);
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

  const handleDelete = async (productId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this design? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'products', productId));
      toast.success('Design purged from catalog');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete design');
    }
  };

  const handleUpdatePrice = async (productId: string, newPrice: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await updateDoc(doc(db, 'products', productId), {
        basePrice: newPrice,
        updatedAt: new Date()
      });
      toast.success('Economic authority updated');
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update price');
    }
  };

  return (
    <div className="bg-background min-h-screen py-16 md:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <header className="mb-20">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-12 border-b border-white/5">
            <div className="max-w-2xl">
              <span className="text-accent text-[10px] font-black uppercase tracking-editorial mb-4 block animate-pulse">The Catalog</span>
              <h1 className="text-5xl sm:text-6xl md:text-8xl font-display font-black tracking-tighter uppercase italic leading-[0.85]">
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
        <div className="flex flex-col space-y-12 mb-16">
          {/* Price & Sort Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center space-x-2 text-[10px] uppercase font-black tracking-widest text-white/20 italic bg-white/5 px-4 py-2 rounded-full border border-white/5">
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Visible Structure: {filteredProducts.length} DESIGNS</span>
                  </div>
                  
                  <div className="flex items-center gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar max-w-full">
                    <button
                        onClick={() => setShowOnlySale(!showOnlySale)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2",
                          showOnlySale
                            ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                            : "text-white/40 hover:text-white hover:bg-white/5"
                        )}
                      >
                        <Zap className={cn("w-3 h-3", showOnlySale ? "fill-current" : "")} />
                        Sale Items
                      </button>
                    {[
                      { label: 'Any Yield', range: [0, 10000] as [number, number], id: 'all' },
                      { label: 'Under ₵100', range: [0, 100] as [number, number], id: 'under-100' },
                      { label: '₵100 - 200', range: [100, 200] as [number, number], id: '100-200' },
                      { label: 'Over ₵200', range: [200, 10000] as [number, number], id: 'over-200' }
                    ].map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => setPriceRange(filter.range)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                          priceRange[0] === filter.range[0] && priceRange[1] === filter.range[1]
                            ? "bg-accent text-black shadow-lg shadow-accent/20"
                            : "text-white/40 hover:text-white hover:bg-white/5"
                        )}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>
             
             <div className="relative group">
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

          {/* GSM & Color Row */}
          <div className="flex flex-col lg:flex-row gap-8 py-8 border-y border-white/5">
            {/* GSM Weights */}
            <div className="flex-1 space-y-4">
              <span className="text-[10px] font-black uppercase tracking-editorial text-white/20 block">Weight Class (GSM)</span>
              <div className="flex flex-wrap gap-2">
                {['All', ...GSM_OPTIONS].map(gsm => (
                  <button
                    key={gsm}
                    onClick={() => setSelectedGSM(gsm)}
                    className={cn(
                      "px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                      selectedGSM === gsm 
                        ? "bg-accent text-black border-accent" 
                        : "bg-white/5 text-white/40 border-white/10 hover:border-white/30"
                    )}
                  >
                    {gsm === 'All' ? 'ANY WEIGHT' : `${gsm} GSM`}
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div className="flex-[2] space-y-4">
              <span className="text-[10px] font-black uppercase tracking-editorial text-white/20 block">Color Authority</span>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setSelectedColor('All')}
                  className={cn(
                    "px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                    selectedColor === 'All' 
                      ? "bg-accent text-black border-accent" 
                      : "bg-white/5 text-white/40 border-white/10 hover:border-white/30"
                  )}
                >
                  ANY COLOR
                </button>
                {FABRIC_COLORS.map(color => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border group",
                      selectedColor === color.name 
                        ? "bg-white text-black border-white" 
                        : "bg-white/5 text-white/40 border-white/10 hover:border-white/30"
                    )}
                  >
                    <div 
                      className="w-3 h-3 rounded-full border border-white/10" 
                      style={{ backgroundColor: color.hex }}
                    />
                    {color.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="space-y-16">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
              <AnimatePresence mode="popLayout">
                {filteredProducts.slice(0, displayLimit).map((product, idx) => (
                  <ErrorBoundary key={product.id}>
                    <ProductCard
                      product={product}
                      isAdmin={isAdmin}
                      onDelete={handleDelete}
                      onUpdatePrice={handleUpdatePrice}
                      isNew={isNew(product.createdAt)}
                    />
                  </ErrorBoundary>
                ))}
              </AnimatePresence>
            </div>

            {filteredProducts.length > displayLimit && (
              <div className="flex justify-center pt-8">
                <button 
                  onClick={() => setDisplayLimit(prev => prev + 12)}
                  className="group flex flex-col items-center gap-4"
                >
                  <p className="text-[10px] font-black uppercase tracking-editorial text-white/20 group-hover:text-accent transition-colors">Manifest Additional Designs</p>
                  <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center group-hover:border-accent transition-all">
                    <RefreshCw className="w-4 h-4 text-white/20 group-hover:text-accent animate-slow-spin" />
                  </div>
                </button>
              </div>
            )}
          </div>
        )}

        {!loading && filteredProducts.length === 0 && (
          <div className="py-40 text-center space-y-8">
            <div className="inline-block glass p-8 rounded-full border-dashed">
               <SlidersHorizontal className="w-12 h-12 text-white/5 mx-auto" />
            </div>
            <h2 className="text-3xl font-display font-black uppercase italic text-white/20">Empty Blueprint Section</h2>
            <button 
              onClick={() => { 
                setSelectedCategory('All'); 
                setSelectedColor('All');
                setSelectedGSM('All');
                setPriceRange([0, 10000]);
              }}
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

