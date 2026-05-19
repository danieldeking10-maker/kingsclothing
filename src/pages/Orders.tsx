import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Clock, ShieldCheck, ChevronRight, Search, Receipt, ArrowRight, Loader2, Filter, SlidersHorizontal, Sliders } from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { formatGHC, cn } from '@/src/lib/utils';

export function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'>('all');

  useEffect(() => {
    if (!user) {
      if (!authLoading) navigate('/auth?mode=signin&redirect=/orders');
      return;
    }

    const q = query(
      collection(db, 'orders'),
      where('customerId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Orders Fetch Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, navigate]);

  const filteredOrders = orders.filter(o => filter === 'all' || o.status === filter);

  if (loading) return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-16 h-16 border-2 border-accent/20 border-t-accent rounded-full animate-spin mb-4" />
      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 italic animate-pulse">Synchronizing Transactions...</p>
    </div>
  );

  return (
    <div className="bg-background min-h-screen py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-20 pb-12 border-b border-white/5 flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div className="max-w-2xl">
              <span className="text-accent text-[10px] font-black uppercase tracking-editorial mb-4 block animate-pulse">Transaction Ledger</span>
              <h1 className="text-5xl md:text-8xl font-display font-black tracking-tighter uppercase italic leading-[0.85]">
                Order <br/> Archives<span className="text-accent">.</span>
              </h1>
           </div>
           
           <div className="flex flex-wrap gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
              {(['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                    filter === f ? "bg-accent text-black shadow-lg" : "text-white/40 hover:text-white"
                  )}
                >
                  {f}
                </button>
              ))}
           </div>
        </header>

        {filteredOrders.length === 0 ? (
          <div className="py-32 text-center space-y-8 glass rounded-[3rem] border border-dashed border-white/10">
            <div className="flex justify-center">
               <Receipt className="w-16 h-16 text-white/5" />
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-display font-black uppercase italic text-white/20">Zero Transactions Recorded</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/10 max-w-xs mx-auto">Your digital footprint remains empty in the deployment ledger.</p>
            </div>
            <Link 
              to="/shop" 
              className="inline-block px-10 py-5 bg-accent text-black font-black uppercase text-[10px] tracking-widest rounded-full hover:scale-105 transition-transform"
            >
              Acquire Assets
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order, idx) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-accent/5 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <Link 
                  to={`/order/${order.id}`}
                  className="relative block bg-white/[0.02] border border-white/5 hover:border-accent/40 rounded-[2.5rem] p-8 md:p-12 transition-all group overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                     <div className="flex items-center space-x-8">
                        <div className="w-20 h-24 bg-black rounded-2xl overflow-hidden border border-white/5 flex-shrink-0 grayscale group-hover:grayscale-0 transition-all">
                           <img 
                              src={order.items?.[0]?.mockupImage || "https://picsum.photos/seed/order/200/300"} 
                              className="w-full h-full object-cover" 
                              alt=""
                              referrerPolicy="no-referrer"
                           />
                        </div>
                        <div className="space-y-3">
                           <div className="flex items-center space-x-3">
                              <span className="text-[9px] font-mono font-black text-white/20 uppercase">#{order.id.slice(-6).toUpperCase()}</span>
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                                order.status === 'delivered' ? "bg-green-500/20 text-green-500" :
                                order.status === 'cancelled' ? "bg-red-500/20 text-red-500" :
                                "bg-accent/20 text-accent"
                              )}>
                                {order.status}
                              </span>
                           </div>
                           <h4 className="text-xl md:text-2xl font-display font-black uppercase italic leading-none text-white group-hover:text-accent transition-colors">
                             {order.items?.length === 1 ? order.items[0].name : `${order.items?.[0]?.name} +${order.items?.length - 1} Assets`}
                           </h4>
                           <p className="text-[10px] font-black uppercase tracking-widest text-white/20">
                             Placed on {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'N/A'}
                           </p>
                        </div>
                     </div>

                     <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 border-t md:border-t-0 md:border-l border-white/5 pt-6 md:pt-0 md:pl-12">
                        <div className="text-right">
                           <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mb-1">Total Valuation</p>
                           <p className="text-2xl font-display font-black text-white">{formatGHC(order.totalAmount)}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-accent group-hover:text-black group-hover:border-accent transition-all">
                           <ChevronRight className="w-6 h-6" />
                        </div>
                     </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Tracking Relay Segment */}
        <section className="mt-24 pt-24 border-t border-white/5">
          <div className="glass p-12 rounded-[3.5rem] border border-white/10 relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/5 blur-[100px] rounded-full group-hover:bg-accent/10 transition-colors" />
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                    <Search className="w-5 h-5 text-accent" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-editorial text-white/40">Authority Oversight</span>
                </div>
                <h3 className="text-4xl font-display font-black uppercase italic tracking-tighter text-white mb-4">
                  Track Generic <br/> Blueprint
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20 leading-relaxed italic">
                  Enter an order identifier to intercept its current manufacturing and logistics stream without authentication.
                </p>
              </div>

              <div className="space-y-4">
                 <form 
                   onSubmit={(e) => {
                     e.preventDefault();
                     const formData = new FormData(e.currentTarget);
                     const trackId = formData.get('trackId') as string;
                     if (trackId) navigate(`/order/${trackId.trim().toUpperCase()}`);
                   }}
                   className="relative group/input"
                 >
                   <input 
                     name="trackId"
                     type="text" 
                     placeholder="KB-XXXX"
                     className="w-full bg-background border-2 border-white/5 rounded-2xl p-6 text-xs font-mono font-bold uppercase tracking-widest text-white focus:border-accent outline-none transition-all placeholder:text-white/5 group-hover/input:border-white/10"
                   />
                   <div className="absolute inset-y-0 right-4 flex items-center">
                     <button 
                       type="submit"
                       className="p-3 bg-white/5 hover:bg-accent hover:text-black rounded-xl transition-all group/btn"
                     >
                       <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                     </button>
                   </div>
                 </form>
                 <p className="text-[8px] font-black uppercase tracking-widest text-white/10 text-center uppercase">
                   Protocol authorization required for specific data streams.
                 </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-24 pt-12 border-t border-white/5 text-center">
           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/10 italic">Citadel Order Protocol v2.4 • End-to-End Encryption Enabled</p>
        </footer>
      </div>
    </div>
  );
}
