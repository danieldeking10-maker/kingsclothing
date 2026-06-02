import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  Clock, 
  ShieldCheck, 
  ChevronRight, 
  Search, 
  Receipt, 
  ArrowRight, 
  Loader2, 
  Filter, 
  SlidersHorizontal, 
  Zap,
  Truck,
  CheckCircle2,
  MapPin,
  Calendar,
  DollarSign,
  AlertCircle,
  X,
  ExternalLink,
  Share2,
  Copy,
  User,
  ExternalLink as LinkIcon
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, limit, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { formatGHC, cn } from '@/src/lib/utils';
import { toast } from 'react-hot-toast';

const STEPS = [
  { id: 'pending', label: 'Pending Payment', icon: Clock, description: 'Awaiting payment verification' },
  { id: 'processing', label: 'Processing', icon: Zap, description: 'In manufacture & production queue' },
  { id: 'shipped', label: 'Shipped', icon: Truck, description: 'En route to HQ/local dispatch' },
  { id: 'delivered', label: 'Delivered', icon: CheckCircle2, description: 'Kingdom assets received & completed' }
];

export function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const trackIdParam = searchParams.get('track') || '';

  // Authed Order States
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'>('all');

  // Custom Tracking States
  const [searchId, setSearchId] = useState(trackIdParam);
  const [trackedOrder, setTrackedOrder] = useState<any | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [lastTrackedId, setLastTrackedId] = useState('');

  // Active snapshot reference to track real-time changes
  const trackingUnsubRef = useRef<(() => void) | null>(null);

  const startTrackingOrder = (idToTrack: string) => {
    const cleanId = idToTrack.trim();
    if (!cleanId) return;

    setTrackingLoading(true);
    setTrackingError(null);
    setLastTrackedId(cleanId);

    // Clean up any prev active tracking subscription
    if (trackingUnsubRef.current) {
      trackingUnsubRef.current();
    }

    try {
      const unsub = onSnapshot(doc(db, 'orders', cleanId), (docSnap) => {
        if (docSnap.exists()) {
          setTrackedOrder({ id: docSnap.id, ...docSnap.data() });
          setTrackingError(null);
        } else {
          setTrackingError(`No shipment metadata found for: "${cleanId}". Refer to your order invoice or confirm ID formatting.`);
          setTrackedOrder(null);
        }
        setTrackingLoading(false);
      }, (error) => {
        console.error("Tracking subscription failed:", error);
        setTrackingError("Security protocol constraint or invalid tracking identifier format.");
        setTrackedOrder(null);
        setTrackingLoading(false);
      });

      trackingUnsubRef.current = unsub;
    } catch (err: any) {
      console.error(err);
      setTrackingError("Invalid tracking identifier schema.");
      setTrackedOrder(null);
      setTrackingLoading(false);
    }
  };

  // Listen to searchParams changes for automated deep-linked tracking lookups
  useEffect(() => {
    if (trackIdParam) {
      setSearchId(trackIdParam);
      startTrackingOrder(trackIdParam);
    } else {
      setTrackedOrder(null);
      setTrackingError(null);
    }
  }, [trackIdParam]);

  // Authenticated user's archive list fetching
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'orders'),
      where('customerId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    let isSubscribed = true;
    let unsubscribeSimple = () => {};

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!isSubscribed) return;
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.warn("Orders compound query failed (likely missing composite indexes), falling back to in-memory sorting:", error);
      if (!isSubscribed) return;

      const qSimple = query(
        collection(db, 'orders'),
        where('customerId', '==', user.uid),
        limit(100)
      );

      unsubscribeSimple = onSnapshot(qSimple, (snapshot) => {
        if (!isSubscribed) return;
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        items.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
          const timeB = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
          return timeB - timeA;
        });
        setOrders(items.slice(0, 50));
        setLoading(false);
      }, (fallbackError) => {
        console.error("Orders simple fallback query failed:", fallbackError);
        setLoading(false);
      });
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
      unsubscribeSimple();
    };
  }, [user]);

  // Unified cleanup
  useEffect(() => {
    return () => {
      if (trackingUnsubRef.current) {
        trackingUnsubRef.current();
      }
    };
  }, []);

  const handleTrackFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    setSearchParams({ track: searchId.trim() });
  };

  const handleQuickTrack = (orderId: string) => {
    setSearchParams({ track: orderId });
    // Scroll smoothly to tracking hub
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearTracking = () => {
    setSearchParams({});
    setSearchId('');
    setTrackedOrder(null);
    setTrackingError(null);
  };

  const handleCopyTrackingLink = () => {
    const link = `${window.location.origin}/orders?track=${lastTrackedId}`;
    navigator.clipboard.writeText(link);
    toast.success('Direct Tracking Link Copied!');
  };

  const getStepStatus = (stepId: string) => {
    if (!trackedOrder) return 'idle';
    const statusIdx = STEPS.findIndex(s => s.id === trackedOrder.status);
    const stepIdx = STEPS.findIndex(s => s.id === stepId);
    
    if (stepIdx < statusIdx) return 'complete';
    if (stepIdx === statusIdx) return 'active';
    return 'idle';
  };

  const filteredOrders = orders.filter(o => filter === 'all' || o.status === filter);

  if (authLoading || (user && loading)) return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-16 h-16 border-2 border-accent/20 border-t-accent rounded-full animate-spin mb-4" />
      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 italic animate-pulse">Syncing Transactional Data...</p>
    </div>
  );

  return (
    <div className="bg-background min-h-screen py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Dynamic Navigation/Context Header */}
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-8">
          <div className="max-w-2xl">
            <span className="text-accent text-[10px] font-black uppercase tracking-editorial mb-3 block animate-pulse">
              Logistics & Shipment Bureau
            </span>
            <h1 className="text-4xl md:text-7xl font-display font-black tracking-tighter uppercase italic leading-[0.85] mb-4">
              Real-Time <br/> Tracking Center<span className="text-accent">.</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 italic">
              Deploy logistics verification and look up the shipment status of your Kings Clothing garments.
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-2 bg-white/5 px-4 py-2.5 rounded-xl border border-white/5">
                <User className="w-3.5 h-3.5 text-accent" />
                <span className="text-[8.5px] font-black uppercase tracking-widest text-white/50">{user.displayName || user.email}</span>
              </div>
            ) : (
              <Link 
                to="/auth?mode=signin&redirect=/orders" 
                className="px-5 py-2.5 bg-accent text-black font-black uppercase text-[9px] tracking-widest rounded-xl hover:bg-white transition-all flex items-center space-x-2 shadow-lg shadow-accent/15"
              >
                <span>Agent Portal Log In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </header>

        {/* Global Tracking Input Suite */}
        <section className="mb-16">
          <div className="glass p-8 md:p-12 rounded-[2.5rem] border border-white/10 relative overflow-hidden group">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/5 blur-[100px] rounded-full group-hover:bg-accent/10 transition-colors pointer-events-none" />
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                    <Search className="w-4 h-4 text-accent" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Secure Verification Tunnel</span>
                </div>
                <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white mb-2">
                  Query Shipment State
                </h3>
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-wide leading-relaxed">
                  Provide your unique 20-character order ID hash (issued at receipt checkout) to wire up live telemetry on its transit steps.
                </p>
              </div>

              <div className="lg:col-span-7">
                <form onSubmit={handleTrackFormSubmit} className="relative group/input">
                  <input 
                    type="text" 
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    placeholder="ENTER SERIAL ASSIGNMENT ID (E.G. KB-XXXX OR FIRESTORE ID)"
                    className="w-full bg-background border-2 border-white/5 rounded-2xl p-5 text-xs font-mono font-bold uppercase tracking-widest text-white focus:border-accent outline-none transition-all placeholder:text-white/10 group-hover/input:border-white/10 pr-16"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    <button 
                      type="submit"
                      disabled={trackingLoading}
                      className="p-3 bg-white/5 hover:bg-accent hover:text-black rounded-xl transition-all group/btn disabled:opacity-35"
                    >
                      {trackingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />}
                    </button>
                  </div>
                </form>
                {trackIdParam && (
                  <div className="mt-3 flex justify-end">
                    <button 
                      onClick={clearTracking}
                      className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:text-white flex items-center space-x-1.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      <span>Clear Tracker Session</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Real-time Tracking Result View */}
        <AnimatePresence mode="wait">
          {trackingLoading && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="glass p-12 rounded-[2.5rem] border border-white/10 flex flex-col items-center justify-center text-center space-y-4 mb-16"
            >
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40 animate-pulse">Intercepting live shipment stream...</p>
            </motion.div>
          )}

          {trackingError && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="glass p-8 md:p-12 rounded-[2.5rem] border border-red-500/10 bg-red-500/[0.02] flex items-start space-x-4 mb-16"
            >
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black uppercase text-red-500">Query Authentication Incident</h4>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wide leading-relaxed">{trackingError}</p>
              </div>
            </motion.div>
          )}

          {trackedOrder && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -20 }}
              className="mb-16 space-y-8"
            >
              {/* Main Stepper Card */}
              <div className="glass p-8 md:p-16 rounded-[3rem] border border-accent/20 relative overflow-hidden shadow-[0_0_50px_rgba(242,125,38,0.06)] bg-white/[0.01]">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   <Zap className="w-32 h-32 text-accent animate-pulse" strokeWidth={1} />
                </div>
                
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12 border-b border-white/5 pb-6">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-editorial text-accent animate-pulse mb-1">LIVE FEED CONNECTION ACTIVE</p>
                      <h3 className="text-xl md:text-3xl font-display font-black text-white uppercase italic tracking-tighter">
                        Garment Instance: #{trackedOrder.id.slice(-8).toUpperCase()}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button 
                        onClick={handleCopyTrackingLink}
                        className="px-4 py-2 rounded-xl bg-white/5 text-white/60 text-[8px] font-black uppercase tracking-widest hover:text-white border border-white/5 hover:border-white/20 transition-all flex items-center space-x-1.5"
                      >
                        <Copy className="w-3 h-3 text-accent" />
                        <span>Share Tracking Frame</span>
                      </button>
                      <Link 
                        to={`/order/${trackedOrder.id}`}
                        className="px-4 py-2 rounded-xl bg-accent text-black text-[8px] font-black uppercase tracking-widest hover:bg-white transition-all flex items-center space-x-1.5 shadow-lg shadow-accent/15"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Interactive Invoice</span>
                      </Link>
                    </div>
                  </div>
                  
                  {/* Stepper Timeline UI */}
                  <div className="flex flex-col md:grid md:grid-cols-4 gap-12 md:gap-8 relative my-12">
                     {/* Horizontal Progress bar for Desktop */}
                     <div className="hidden md:block absolute top-[28px] left-[12%] right-[12%] h-[2px] bg-white/5 z-0">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(STEPS.findIndex(s => s.id === trackedOrder.status) / (STEPS.length - 1)) * 100}%` }}
                          className="h-full bg-accent shadow-[0_0_15px_rgba(242,125,38,0.5)]"
                        />
                     </div>

                     {/* Vertical Progress bar for Mobile */}
                     <div className="md:hidden absolute left-[23px] top-[10%] bottom-[10%] w-px bg-white/5 z-0">
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${(STEPS.findIndex(s => s.id === trackedOrder.status) / (STEPS.length - 1)) * 100}%` }}
                          className="w-full bg-accent shadow-[0_0_10px_rgba(242,125,38,0.5)]"
                        />
                     </div>

                     {STEPS.map((step, idx) => {
                       const status = getStepStatus(step.id);
                       const stepNumber = (idx + 1).toString().padStart(2, '0');
                       const isCancelled = trackedOrder.status === 'cancelled';
                       
                       return (
                         <div key={step.id} className="flex flex-row md:flex-col items-center md:items-center text-center gap-8 md:gap-6 relative z-10">
                            <div className="relative flex-shrink-0">
                              <div className={cn(
                                "w-12 h-12 md:w-14 md:h-14 rounded-full border-2 flex items-center justify-center transition-all duration-700 relative z-20",
                                isCancelled ? "border-red-500/20 bg-background text-red-500/40" :
                                status === 'active' ? "border-accent bg-accent text-black shadow-[0_0_30px_rgba(242,125,38,0.3)] scale-110" :
                                status === 'complete' ? "border-accent bg-accent/20 text-accent" : "border-white/5 bg-background text-white/5"
                              )}>
                                {isCancelled ? (
                                  <X className="w-5 h-5 text-red-500" />
                                ) : status === 'complete' ? (
                                  <CheckCircle2 className="w-6 h-6 animate-pulse" />
                                ) : (
                                  <step.icon className={cn("w-5 h-5 md:w-6 md:h-6", status === 'active' && "animate-pulse")} />
                                )}
                              </div>
                              
                              <span className={cn(
                                "absolute -top-4 -left-4 text-4xl font-display font-black italic opacity-5 pointer-events-none transition-colors duration-500",
                                status !== 'idle' && "opacity-10 text-accent"
                              )}>
                                {stepNumber}
                              </span>
                            </div>
                            
                            <div className="text-left md:text-center space-y-1">
                               <p className={cn(
                                 "text-xs font-black uppercase tracking-editorial leading-none",
                                 status === 'idle' ? "text-white/20" : status === 'active' ? "text-accent" : "text-white"
                               )}>{step.label}</p>
                               <p className="text-[9px] font-black uppercase tracking-tighter text-white/20 italic">{step.description}</p>
                            </div>
                         </div>
                       );
                     })}
                  </div>

                  {trackedOrder.status === 'cancelled' && (
                    <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center space-x-4">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <p className="text-[10px] text-red-500/80 font-black uppercase tracking-widest leading-relaxed">
                        THIS TRANSACTING PATH HAS BEEN TERMINATED AND PURGED FROM ACTIVE LOGS.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Manifest Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                
                {/* Manifest Order Receipt Details */}
                <div className="md:col-span-7 glass p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                  <div className="flex items-center space-x-3 mb-2">
                    <Receipt className="w-4 h-4 text-accent" />
                    <span className="text-[9.5px] font-black uppercase tracking-widest text-white/40">Manifest & Cart Assets</span>
                  </div>
                  
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                    {trackedOrder.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 items-center hover:border-white/10 transition-colors">
                        <div className="w-14 h-16 bg-black rounded-xl overflow-hidden flex-shrink-0 border border-white/10 grayscale hover:grayscale-0 transition-all">
                          <img src={item.mockupImage || "https://picsum.photos/seed/order/100/150"} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-grow">
                          <h5 className="text-[10px] font-black uppercase text-white tracking-wide">{item.name}</h5>
                          <p className="text-[8.5px] font-mono text-white/30 uppercase mt-0.5">Size: {item.size} | Color: {item.color || 'Default'}</p>
                          <p className="text-[9px] font-black text-accent mt-1">Quantity: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-white">{formatGHC(item.price * item.quantity)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Secure Balances and Shipping Status */}
                <div className="md:col-span-5 space-y-6">
                  <div className="glass p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                    <div className="flex items-center space-x-3">
                      <DollarSign className="w-4 h-4 text-accent" />
                      <span className="text-[9.5px] font-black uppercase tracking-widest text-white/40">Financial Ledger Sheet</span>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/30">
                        <span>Gross Evaluation</span>
                        <span className="text-white font-mono">{formatGHC(trackedOrder.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-accent">
                        <span>{trackedOrder.totalAmount === trackedOrder.depositAmount ? 'Full Payment Completed' : 'Deposit Completed'}</span>
                        <span className="font-mono text-base">{formatGHC(trackedOrder.depositAmount)}</span>
                      </div>
                      <div className="h-px bg-white/5 w-full" />
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/30">
                        {trackedOrder.totalAmount - trackedOrder.depositAmount > 0 ? <span>Payable on Dropoff</span> : null}
                        {trackedOrder.totalAmount - trackedOrder.depositAmount > 0 ? <span className="text-white font-mono text-sm">{formatGHC(trackedOrder.totalAmount - trackedOrder.depositAmount)}</span> : null}
                      </div>
                    </div>

                    {trackedOrder.status === 'pending' && (
                      <div className="pt-4 border-t border-white/5">
                        <Link 
                          to={`/order/${trackedOrder.id}`}
                          className="w-full py-4 bg-accent text-black font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-white transition-all flex items-center justify-center space-x-2 shadow-lg shadow-accent/10"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Finalize Payment Gateway</span>
                        </Link>
                      </div>
                    )}
                  </div>

                  <div className="glass p-8 rounded-[2.5rem] border border-white/5 space-y-4">
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-4 h-4 text-accent" />
                      <span className="text-[9.5px] font-black uppercase tracking-widest text-white/40">Registered Recipient</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] font-black uppercase text-white">Name: <span className="text-white/65 font-bold">{trackedOrder.customerName || 'Walk-In Guest'}</span></p>
                      <p className="text-[11px] font-black uppercase text-white">Contact Email: <span className="text-white/65 font-bold">{trackedOrder.customerEmail || 'No Email Logged'}</span></p>
                      {trackedOrder.momoNumber && (
                        <p className="text-[11px] font-black uppercase text-white">Momo: <span className="text-accent font-mono">({trackedOrder.momoProvider?.toUpperCase()}) {trackedOrder.momoNumber}</span></p>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Authenticated User Archive Module */}
        {user ? (
          <section className="mt-16 pt-16 border-t border-white/5">
            <header className="mb-12 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <h3 className="text-3xl font-display font-black uppercase italic text-white tracking-tighter">Your Order Archives</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic mt-1 leading-relaxed">
                  Historical overview of design instances locked into production and processing.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 bg-white/5 p-1 rounded-2xl border border-white/5">
                 {(['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const).map(f => (
                   <button
                     key={f}
                     onClick={() => setFilter(f)}
                     className={cn(
                       "px-3.5 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all",
                       filter === f ? "bg-accent text-black shadow-lg" : "text-white/40 hover:text-white"
                     )}
                   >
                     {f}
                   </button>
                 ))}
              </div>
            </header>

            {filteredOrders.length === 0 ? (
              <div className="py-24 text-center space-y-6 glass rounded-[2.5rem] border border-dashed border-white/10 bg-white/[0.005]">
                <Package className="w-12 h-12 text-white/5 mx-auto" />
                <div className="space-y-2">
                  <h4 className="text-lg font-display font-black uppercase italic text-white/30">No matching orders</h4>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/15 max-w-xs mx-auto">No matching historical instances match your selected status filtration.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order, idx) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="relative group/card"
                  >
                    <div className="absolute inset-0 bg-accent/5 rounded-[2rem] blur-xl opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none" />
                    <div className="relative bg-white/[0.01] border border-white/5 hover:border-accent/30 rounded-[2rem] p-6 transition-all">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        
                        <div className="flex items-center space-x-6">
                          <div className="w-14 h-18 bg-black rounded-xl overflow-hidden border border-white/5 flex-shrink-0 grayscale group-hover/card:grayscale-0 transition-all">
                            <img 
                              src={order.items?.[0]?.mockupImage || "https://picsum.photos/seed/order/100/150"} 
                              className="w-full h-full object-cover" 
                              alt=""
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          
                          <div className="space-y-1.5">
                            <div className="flex items-center space-x-3">
                              <span className="text-[9px] font-mono font-bold text-white/30 uppercase">#{order.id.slice(-6).toUpperCase()}</span>
                              <span className={cn(
                                "px-2.5 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-widest",
                                order.status === 'delivered' ? "bg-green-500/10 text-green-500 border border-green-500/20" :
                                order.status === 'cancelled' ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                                "bg-accent/15 text-accent border border-accent/25 animate-pulse"
                              )}>
                                {order.status}
                              </span>
                            </div>
                            <h4 className="text-base font-display font-black uppercase italic text-white group-hover/card:text-accent transition-colors leading-tight">
                              {order.items?.length === 1 ? order.items[0].name : `${order.items?.[0]?.name} +${order.items?.length - 1} Assorted Assets`}
                            </h4>
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/30">
                              Logged: {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                          <div className="text-left md:text-right">
                            <p className="text-[7px] font-black uppercase tracking-widest text-white/20 mb-0.5">Value Segment</p>
                            <p className="text-lg font-display font-black text-white">{formatGHC(order.totalAmount)}</p>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => handleQuickTrack(order.id)}
                              className="px-4 py-2 bg-white/5 text-white hover:bg-accent hover:text-black rounded-xl text-[8px] font-black uppercase tracking-widest transition-all"
                            >
                              Track Live
                            </button>
                            <Link 
                              to={`/order/${order.id}`}
                              className="p-2.5 bg-white/5 hover:border-accent text-white hover:text-accent rounded-xl border border-white/5 transition-all"
                            >
                              <LinkIcon className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>

                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="mt-16 pt-16 border-t border-white/5 text-center">
            <div className="glass p-8 rounded-[2rem] border border-white/10 bg-white/[0.005] max-w-lg mx-auto space-y-4">
              <ShieldCheck className="w-10 h-10 text-white/20 mx-auto" />
              <h4 className="text-lg font-display font-black uppercase italic tracking-tighter text-white">Access Your Unified Brand History</h4>
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/40 leading-relaxed">
                Log in with your official account credentials to query your full history, review complete invoices, request payouts, and monitor designs.
              </p>
              <Link 
                to="/auth?mode=signin&redirect=/orders"
                className="inline-block px-8 py-3.5 bg-white/5 hover:bg-accent hover:text-black border border-white/5 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
              >
                Sign In to Archive Account
              </Link>
            </div>
          </section>
        )}

        <footer className="mt-24 pt-12 border-t border-white/5 text-center">
           <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/10 italic">Secure Citadel Logistics Tunnel v3.1 • TLS 1.3 Certified • 256-bit AES Authenticated Protocol</p>
        </footer>

      </div>
    </div>
  );
}
