import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Clock, 
  Truck, 
  Package, 
  ArrowLeft, 
  Zap, 
  ShieldCheck, 
  Phone,
  Copy,
  CreditCard,
  Share2,
  X,
  Facebook,
  Twitter
} from 'lucide-react';
import { doc, onSnapshot, updateDoc, getDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatGHC, cn } from '@/src/lib/utils';
import { MOMO_NUMBER } from '@/src/constants';
import { toast } from 'react-hot-toast';

const STEPS = [
  { id: 'pending', label: 'Pending Payment', icon: Clock, description: 'Awaiting deposit verify' },
  { id: 'processing', label: 'Processing', icon: Zap, description: 'In production queue' },
  { id: 'shipped', label: 'Shipped', icon: Truck, description: 'En route to HQ/Delivery' },
  { id: 'delivered', label: 'Delivered', icon: CheckCircle2, description: 'Kingdom assets received' }
];

export function OrderConfirmationPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'orders', id), (doc) => {
      if (doc.exists()) {
        setOrder({ id: doc.id, ...doc.data() });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  const handleConfirmPayment = async () => {
    if (!id || order.status !== 'pending') return;
    
    setIsConfirming(true);
    try {
      // Update Order Status
      await updateDoc(doc(db, 'orders', id), {
        status: 'processing',
        paymentConfirmedAt: new Date().toISOString()
      });

      // Update Agent Profile Stats (The person who made the purchase)
      if (order.customerId) {
        const agentDoc = await getDoc(doc(db, 'agents', order.customerId));
        const agentData = agentDoc.data();
        
        const agentRef = doc(db, 'agents', order.customerId);
        await updateDoc(agentRef, {
          'stats.totalSales': increment(order.totalAmount),
        });

        // Credit Referrer if applicable (10% commission on total sales)
        if (agentData?.referredBy) {
          const referrerRef = doc(db, 'agents', agentData.referredBy);
          const commissionAmount = order.totalAmount * 0.10; // 10% commission
          await updateDoc(referrerRef, {
            'stats.commissionEarned': increment(commissionAmount)
          });
        }
      }

      toast.success('Payment confirmation broadcasted!');
    } catch (error) {
      console.error('Confirmation Error:', error);
      toast.error('Failed to confirm payment.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!id || !['pending', 'processing'].includes(order.status)) return;
    
    setIsCancelling(true);
    try {
      await updateDoc(doc(db, 'orders', id), {
        status: 'cancelled',
        cancelledAt: new Date().toISOString()
      });
      toast.success('Authority Revoked Successfully');
      setIsCancelDialogOpen(false);
    } catch (error) {
      console.error('Cancellation Error:', error);
      toast.error('Failed to revoke authority.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCopyRef = () => {
    if (!id) return;
    navigator.clipboard.writeText(id.slice(0, 8));
    toast.success('Reference ID copied');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Kings Clothing Order Status',
        text: `Track my Kings Clothing Brand authority procurement: ${order?.items?.[0]?.name || 'Streetwear Heritage'}`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      setIsShareModalOpen(true);
    }
  };

  const sharePlatforms = useMemo(() => [
    { 
      name: 'WhatsApp', 
      icon: Phone, 
      href: `https://wa.me/?text=${encodeURIComponent(`Track my Kings Clothing order: ${window.location.href}`)}`,
      color: 'hover:text-green-500'
    },
    { 
      name: 'X', 
      icon: Zap, 
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Broadcast Authority. My Kings Clothing order is now in the ledger. ${window.location.href}`)}`,
      color: 'hover:text-white'
    },
    { 
      name: 'Facebook', 
      icon: ShieldCheck, 
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
      color: 'hover:text-blue-500'
    },
  ], [order]);

  const getStepStatus = (stepId: string) => {
    if (!order) return 'idle';
    const statusIdx = STEPS.findIndex(s => s.id === order.status);
    const stepIdx = STEPS.findIndex(s => s.id === stepId);
    
    if (stepIdx < statusIdx) return 'complete';
    if (stepIdx === statusIdx) return 'active';
    return 'idle';
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-background">
       <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin text-accent" />
          <p className="text-[10px] font-black uppercase tracking-editorial text-white/20">Establishing Relay...</p>
       </div>
    </div>
  );

  if (!order) return (
    <div className="h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
       <ShieldCheck className="w-16 h-16 text-white/5 mb-6" />
       <h1 className="text-2xl font-display font-black uppercase italic text-white/40 mb-4">Transmission Lost</h1>
       <Link to="/shop" className="text-accent font-black uppercase tracking-widest text-[10px] underline">Return to Shop</Link>
    </div>
  );

  return (
    <div className="bg-background min-h-screen pt-24 pb-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {order.status === 'cancelled' && (
           <motion.div 
             initial={{ opacity: 0, y: -20 }}
             animate={{ opacity: 1, y: 0 }}
             className="mb-12 p-8 bg-red-500/10 border border-red-500/20 rounded-[2.5rem] flex items-center justify-between group"
           >
              <div className="flex items-center space-x-6">
                 <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500">
                    <X className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-xl font-display font-black uppercase italic text-red-500 leading-tight">Order Terminated</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500/40 italic">The procurement blueprint has been successfully purged.</p>
                 </div>
              </div>
              <Link to="/shop" className="px-6 py-3 bg-red-500 text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-white transition-all">
                 Back to Shop
              </Link>
           </motion.div>
        )}
        {/* Header */}
        <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-12">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-accent text-black p-2 rounded-lg">
                <Package className="w-5 h-5" />
              </div>
              <span className="text-accent text-[10px] font-black uppercase tracking-editorial">Order Confirmed</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-black tracking-tighter uppercase italic leading-none mb-4">
              Receipt of <br/> Authority<span className="text-accent">.</span>
            </h1>
            <p className={cn(
              "text-[10px] font-black uppercase tracking-widest",
              order.status === 'cancelled' ? "text-red-500/40" : "text-white/30"
            )}>
               {order.status === 'cancelled' ? 'Blueprint Expired' : `Blueprint Instance: ${id?.slice(0, 12)}...`}
            </p>
          </div>
          
          <div className="flex items-center space-x-6">
            <button 
              onClick={handleShare}
              className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-accent hover:text-white transition-colors"
            >
              <Share2 className="w-3 h-3" />
              <span>Broadcast Authority</span>
            </button>
            <Link to="/shop" className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">
              <ArrowLeft className="w-3 h-3" />
              <span>Return to Catalog</span>
            </Link>
          </div>
        </header>

        {/* Status Tracker */}
        <div className="glass p-8 md:p-16 rounded-[3rem] border border-white/10 mb-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <Zap className="w-32 h-32 text-accent" strokeWidth={1} />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-12">
              <h3 className="text-xs font-black uppercase tracking-editorial italic text-white/60">Deployment Progress</h3>
              <div className="flex items-center space-x-2">
                {order.status === 'cancelled' ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-red-500 italic">Authority Revoked</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-accent">Active Relay</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex flex-col md:grid md:grid-cols-4 gap-12 md:gap-8 relative">
               {/* Progress Line (Desktop) */}
               <div className="hidden md:block absolute top-[28px] left-[12%] right-[12%] h-[2px] bg-white/5 z-0">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(STEPS.findIndex(s => s.id === order.status) / (STEPS.length - 1)) * 100}%` }}
                    className="h-full bg-accent shadow-[0_0_15px_rgba(242,125,38,0.5)]"
                  />
               </div>

               {/* Progress Line (Mobile) */}
               <div className="md:hidden absolute left-[23px] top-[10%] bottom-[10%] w-px bg-white/5 z-0">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${(STEPS.findIndex(s => s.id === order.status) / (STEPS.length - 1)) * 100}%` }}
                    className="w-full bg-accent shadow-[0_0_10px_rgba(242,125,38,0.5)]"
                  />
               </div>

               {STEPS.map((step, idx) => {
                 const status = getStepStatus(step.id);
                 const stepNumber = (idx + 1).toString().padStart(2, '0');
                 
                 return (
                   <div key={step.id} className="flex flex-row md:flex-col items-center md:items-center text-center gap-8 md:gap-6 relative z-10">
                      <div className="relative flex-shrink-0">
                        <div className={cn(
                          "w-12 h-12 md:w-14 md:h-14 rounded-full border-2 flex items-center justify-center transition-all duration-700 relative z-20",
                          status === 'active' ? "border-accent bg-accent text-black shadow-[0_0_30px_rgba(242,125,38,0.3)] scale-110" :
                          status === 'complete' ? "border-accent bg-accent/20 text-accent" : "border-white/5 bg-background text-white/5"
                        )}>
                          {status === 'complete' ? <CheckCircle2 className="w-6 h-6" /> : <step.icon className={cn("w-5 h-5 md:w-6 md:h-6", status === 'active' && "animate-pulse")} />}
                        </div>
                        
                        {/* Step Number Background */}
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
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Payment & Next Steps */}
          <div className="space-y-8">
            <div className="glass p-10 rounded-[2.5rem] border border-white/5 flex flex-col justify-between h-full group hover:border-accent/30 transition-all duration-500">
               <div>
                  <div className="flex items-center space-x-2 text-accent mb-6">
                    <CreditCard className="w-4 h-4" />
                    <span className="text-[9px] font-black uppercase tracking-editorial">{order.status === 'cancelled' ? 'Authority Status' : 'Action Required'}</span>
                  </div>
                  {order.status !== 'cancelled' ? (
                    <>
                      <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white mb-6">Authorize <br/> Deposit</h3>
                      <p className="text-white/40 text-[10px] leading-relaxed font-bold uppercase tracking-tight mb-8">
                        To trigger production, send <span className="text-accent font-black">{formatGHC(order.depositAmount)}</span> via Mobile Money. 
                      </p>
                    </>
                  ) : (
                    <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white mb-6">Blueprint <br/> Terminated</h3>
                  )}
                  
                  {order.status !== 'cancelled' && (
                    <div className="space-y-4 mb-8">
                       <div className="bg-white/5 p-5 rounded-2xl border border-white/5 flex items-center justify-between">
                          <div>
                             <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mb-1 italic">MOMO Endpoint</p>
                             <p className="text-lg font-mono font-black text-accent">{MOMO_NUMBER}</p>
                          </div>
                          <Phone className="w-5 h-5 text-accent/40" />
                       </div>
                       <div className="bg-white/5 p-5 rounded-2xl border border-white/5 flex items-center justify-between group/ref" onClick={handleCopyRef}>
                          <div>
                             <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mb-1 italic">Reference ID</p>
                             <p className="text-lg font-mono font-black text-white">{order.id.slice(0, 8).toUpperCase()}</p>
                          </div>
                          <Copy className="w-5 h-5 text-white/10 group-hover/ref:text-white transition-colors" />
                       </div>
                    </div>
                  )}

                  {order.status === 'pending' && (
                    <button 
                      onClick={handleConfirmPayment}
                      disabled={isConfirming}
                      className="w-full py-5 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-3xl hover:bg-accent transition-all flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                    >
                      {isConfirming ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 group-hover/btn:scale-125 transition-transform" />
                          <span>Confirm Deposit Sent</span>
                        </>
                      )}
                    </button>
                  )}

                  {['pending', 'processing'].includes(order.status) && (
                    <button 
                      onClick={() => setIsCancelDialogOpen(true)}
                      className="w-full mt-4 py-4 bg-red-500/10 text-red-500 border border-red-500/20 font-black uppercase text-[9px] tracking-[0.2em] rounded-2xl hover:bg-red-500 hover:text-black transition-all active:scale-95 flex items-center justify-center space-x-2"
                    >
                       <X className="w-3 h-3" />
                       <span>Revoke Authorization</span>
                    </button>
                  )}

                  {order.status === 'cancelled' && (
                    <div className="p-8 border border-white/5 bg-white/5 rounded-3xl text-center space-y-4">
                       <ShieldCheck className="w-8 h-8 text-white/10 mx-auto" />
                       <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">Procurement Stream Terminated</p>
                    </div>
                  )}
               </div>
               
               <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                  <div className="flex -space-x-2">
                     <img src="https://picsum.photos/seed/m1/40/40" className="w-8 h-8 rounded-full border-2 border-background object-cover" />
                     <img src="https://picsum.photos/seed/m2/40/40" className="w-8 h-8 rounded-full border-2 border-background object-cover" />
                  </div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/20 italic">50/50 Strategy Active</p>
               </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="glass p-10 rounded-[2.5rem] border border-white/5">
             <div className="flex justify-between items-end mb-12">
                <h3 className="text-[10px] font-black uppercase tracking-editorial text-white/40 italic">Architecture</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-accent">Summary</p>
             </div>
             
             <div className="space-y-8">
                {order.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center space-x-6">
                    <div className="w-20 h-24 bg-[#1A1A1B] rounded-2xl overflow-hidden border border-white/5 grayscale">
                       <img src="https://picsum.photos/seed/item/200/250" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-black uppercase tracking-tighter text-white mb-2 italic">"{item.name}"</h4>
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/20">
                         {item.gsm} GSM • {item.size} • {item.color}
                      </p>
                    </div>
                    <div className="text-accent font-mono font-black text-xs">
                       {formatGHC(item.price)}
                    </div>
                  </div>
                ))}
             </div>

             <div className="mt-12 pt-8 border-t border-white/5 space-y-4">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/20">
                   <span>Gross Total</span>
                   <span className="text-white">{formatGHC(order.totalAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-accent">
                   <span>Deposit to Start</span>
                   <span className="font-mono text-lg">{formatGHC(order.depositAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/20">
                   <span>Balance on Delivery</span>
                   <span>{formatGHC(order.totalAmount - order.depositAmount)}</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {isShareModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setIsShareModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="glass p-10 rounded-[3rem] w-full max-w-md border border-white/10 relative"
              onClick={(e) => e.stopPropagation()}
            >
               <button 
                 onClick={() => setIsShareModalOpen(false)}
                 className="absolute top-8 right-8 text-white/30 hover:text-white transition-colors"
               >
                 <X className="w-5 h-5" />
               </button>

               <div className="mb-10">
                  <h3 className="text-3xl font-display font-black uppercase italic tracking-tighter text-white mb-2">Broadcast <br/> Authority</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">Global Deployment Protocols Active</p>
               </div>

               <div className="grid grid-cols-3 gap-6 mb-10">
                  {sharePlatforms.map((platform) => (
                    <a
                      key={platform.name}
                      href={platform.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex flex-col items-center space-y-4 p-6 rounded-3xl bg-white/5 border border-white/5 transition-all duration-300",
                        platform.color,
                        "hover:bg-white/10 hover:border-white/20 group"
                      )}
                    >
                       <platform.icon className="w-6 h-6 group-hover:scale-125 transition-transform duration-500" />
                       <span className="text-[8px] font-black uppercase tracking-widest">{platform.name}</span>
                    </a>
                  ))}
               </div>

               <div className="space-y-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">Terminal Link</p>
                  <div className="bg-black/40 p-5 rounded-2xl border border-white/5 flex items-center justify-between group/link" onClick={() => {
                     navigator.clipboard.writeText(window.location.href);
                     toast.success('Authority Link Captured');
                  }}>
                     <p className="text-[10px] font-mono font-bold text-white/40 truncate mr-4">{window.location.href}</p>
                     <Copy className="w-4 h-4 text-white/20 group-hover/link:text-accent transition-colors flex-shrink-0" />
                  </div>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancellation Modal */}
      <AnimatePresence>
        {isCancelDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
            onClick={() => setIsCancelDialogOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="glass p-10 rounded-[3rem] w-full max-w-sm border border-red-500/20 relative"
              onClick={(e) => e.stopPropagation()}
            >
               <div className="mb-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500 mb-6">
                     <ShieldCheck className="w-8 h-8" />
                  </div>
                  <h3 className="text-3xl font-display font-black uppercase italic tracking-tighter text-white mb-2">Revoke <br/> Authority?</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic leading-relaxed">
                     This action will terminate the procurement blueprint. This is an irreversible protocol.
                  </p>
               </div>

               <div className="space-y-4">
                  <button 
                    onClick={handleCancelOrder}
                    disabled={isCancelling}
                    className="w-full py-5 bg-red-500 text-black font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-white transition-all disabled:opacity-50 flex items-center justify-center space-x-3"
                  >
                     {isCancelling ? <RefreshCw className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                     <span>Terminate Order</span>
                  </button>
                  <button 
                    onClick={() => setIsCancelDialogOpen(false)}
                    className="w-full py-5 bg-white/5 text-white/60 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-white/10 transition-all"
                  >
                     Abort Revocation
                  </button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RefreshCw({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
      <path d="M21 3v5h-5"/>
    </svg>
  );
}
