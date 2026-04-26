import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ProductCard } from './ProductCard';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { RefreshCw, History } from 'lucide-react';

export function RecentlyViewed() {
  const { recentIds } = useRecentlyViewed();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (recentIds.length === 0) return;

    const fetchRecent = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'products'), where('__name__', 'in', recentIds));
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort by the order in recentIds
        const sorted = recentIds
          .map(id => fetched.find(p => p.id === id))
          .filter(Boolean);
          
        setProducts(sorted);
      } catch (error) {
        console.error('Error fetching recent products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecent();
  }, [recentIds]);

  if (recentIds.length === 0) return null;

  return (
    <section className="py-16 mb-16 border-b border-white/5 bg-white/[0.02] rounded-[3rem]">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-accent/10 rounded-2xl border border-accent/20">
              <History className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h2 className="text-3xl font-display font-black uppercase italic tracking-tighter text-white">Chronicle</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Recently Viewed blueprints</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center space-y-4">
            <RefreshCw className="w-8 h-8 animate-spin text-accent/20" />
            <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Syncing History...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
