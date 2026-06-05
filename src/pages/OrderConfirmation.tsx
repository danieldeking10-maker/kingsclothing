import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Clock, 
  Truck, 
  Package, 
  ArrowLeft, 
  Zap, 
  ShieldCheck, 
  MessageCircle,
  Phone,
  Copy,
  CreditCard,
  Landmark,
  Share2,
  X,
  Search,
  ChevronRight,
  RefreshCw,
  Printer
} from 'lucide-react';
import { doc, onSnapshot, updateDoc, getDoc, increment, runTransaction, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { formatGHC, cn } from '@/src/lib/utils';
import { DEPOSIT_PERCENTAGE, SUPPORT_INTERACTION_NUMBER, BANK_DETAILS } from '@/src/constants';
import { toast } from 'react-hot-toast';
import { initPaystackMock } from '../lib/paystackMock';
import { logPaystackCallback } from '../lib/paystackLogger';

const STEPS = [
  { id: 'pending', label: 'Pending Payment', icon: Clock, description: 'Awaiting payment verify' },
  { id: 'processing', label: 'Processing', icon: Zap, description: 'In production queue' },
  { id: 'shipped', label: 'Shipped', icon: Truck, description: 'En route to HQ/Delivery' },
  { id: 'delivered', label: 'Delivered', icon: CheckCircle2, description: 'Kingdom assets received' }
];

export function OrderConfirmationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isBrandOwner } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [trackId, setTrackId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'momo' | 'bank'>('momo');

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackId.trim()) return;
    navigate(`/orders?track=${trackId.trim()}`);
    setTrackId('');
  };

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'orders', id), (doc) => {
      if (doc.exists()) {
        setOrder({ id: doc.id, ...doc.data() });
      } else {
        setOrder(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  const [isAlerting, setIsAlerting] = useState(false);

  const handleTriggerAlert = async () => {
    if (!user?.email && !order?.customerEmail) {
      toast.error('Customer email required for Paystack');
      return;
    }
    
    setIsAlerting(true);
    const loadingToast = toast.loading('Synchronizing Secure Paystack Gateway...');

    const orderIdRef = order?.id || 'KNGS_TRY_' + Math.random().toString(36).substring(2, 12).toUpperCase();

    const metadata = {
      custom_fields: [
        {
          display_name: "Order Confirmation",
          variable_name: "order_confirmation",
          value: orderIdRef
        }
      ]
    };

    try {
      // 1. Initialize Paystack Transaction on backend
      const initRes = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email || order?.customerEmail || 'customer@kingsclothing.brand',
          amount: Math.round((order?.depositAmount || 0) * 100), // convert to subunits
          reference: orderIdRef,
          metadata
        })
      });

      if (!initRes.ok) {
        const errData = await initRes.json();
        throw new Error(errData.error || 'Server rejected gateway synchronization');
      }

      const initData = await initRes.json();

      const handlePaymentSuccess = async (response: any) => {
        toast.dismiss(loadingToast);
        
        // Audit and validate response to stop false-positive payments
        const audit = await logPaystackCallback(
          'OrderConfirmation PayNow',
          {
            reference: orderIdRef,
            amount: order?.depositAmount || 0,
            email: user?.email || order?.customerEmail || 'customer@kingsclothing.brand'
          },
          response
        );

        if (!audit.isValid) {
          toast.error(`Payment Authorization Failed: ${audit.reason || 'Details could not be verified'}`);
          setIsAlerting(false);
          return;
        }

        toast.success('Payment Received Successfully');
        setIsAlerting(false);
        if (id) {
           try {
              await updateDoc(doc(db, 'orders', id), {
                paymentMethod: 'momo',
                paystackReference: response.reference || response.id || 'N/A'
              });
           } catch (dbErr) {
              console.error("Failed to update payment details on document:", dbErr);
           }
        }
        await handleConfirmPayment();
      };

      const handlePaymentClosed = () => {
        setIsAlerting(false);
        toast.dismiss(loadingToast);
        toast.error('Transaction Terminated by User');
      };

      // 2. Open popup using resumed transaction / inline setup config
      const isSimulation = initData.mode === 'simulation';

      const config = {
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_d894983d4fc4381d5bfd95e0e1db5b800df57f95',
        email: user?.email || order?.customerEmail || 'customer@kingsclothing.brand',
        amount: Math.round((order?.depositAmount || 0) * 100), // convert to pesewas/kobo
        currency: 'GHS',
        channels: ['mobile_money', 'card'],
        ref: orderIdRef,
        reference: orderIdRef,
        access_code: initData.data?.access_code || undefined,
        metadata,
        callback: async (response: any) => {
          if (isSimulation) {
            await handlePaymentSuccess(response);
          } else {
            // Verify on backend server
            const verifyToast = toast.loading('Confirming transaction clearance on server...');
            try {
              const verifyRes = await fetch(`/api/paystack/verify/${response.reference || orderIdRef}`);
              if (!verifyRes.ok) throw new Error('Payment verification rejected');
              const verifyData = await verifyRes.json();
              
              if (verifyData.status && verifyData.data.status === 'success') {
                toast.success('Clearance Approved');
                await handlePaymentSuccess(response);
              } else {
                toast.error('Transaction failed validation clearance.');
                setIsAlerting(false);
              }
            } catch (err: any) {
              toast.error(`Verification Failure: ${err.message}`);
              setIsAlerting(false);
            } finally {
              toast.dismiss(verifyToast);
            }
          }
        },
        onSuccess: async (response: any) => {
          if (isSimulation) {
            await handlePaymentSuccess(response);
          } else {
            // Verify on backend server
            const verifyToast = toast.loading('Confirming transaction clearance on server...');
            try {
              const verifyRes = await fetch(`/api/paystack/verify/${response.reference || orderIdRef}`);
              if (!verifyRes.ok) throw new Error('Payment verification rejected');
              const verifyData = await verifyRes.json();
              
              if (verifyData.status && verifyData.data.status === 'success') {
                toast.success('Clearance Approved');
                await handlePaymentSuccess(response);
              } else {
                toast.error('Transaction failed validation clearance.');
                setIsAlerting(false);
              }
            } catch (err: any) {
              toast.error(`Verification Failure: ${err.message}`);
              setIsAlerting(false);
            } finally {
              toast.dismiss(verifyToast);
            }
          }
        },
        onClose: handlePaymentClosed,
        onCancel: handlePaymentClosed
      };

      if (isSimulation) {
        initPaystackMock();
      }
      
      const handler = (window as any).PaystackPop.setup(config);
      handler.openIframe();
      toast.dismiss(loadingToast);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error('Terminal Error: ' + error.message);
      setIsAlerting(false);
    }
  };

  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  const handleMarkAsPaid = async () => {
    if (!id || order.status !== 'pending') return;
    
    setIsSubmittingTransfer(true);
    try {
      await updateDoc(doc(db, 'orders', id), {
        paymentMethod: 'bank',
        paymentSubmitted: true,
        paymentSubmittedAt: new Date().toISOString()
      });
      toast.success('Transfer Record Logged. Awaiting Verification.');
    } catch (error) {
      console.error('Submission Error:', error);
      toast.error('Failed to log transfer record.');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!id || order.status !== 'pending') return;
    
    setIsConfirming(true);
    try {
      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, 'orders', id);
        const orderSnap = await transaction.get(orderRef);
        
        if (!orderSnap.exists()) throw new Error("Order document does not exist");
        const orderData = orderSnap.data();
        if (orderData.status !== 'pending') throw new Error("Order is no longer pending");

        // Perform agent read FIRST before any updates
        let agentSnap = null;
        let agentRef = null;
        if (orderData.customerId) {
          agentRef = doc(db, 'agents', orderData.customerId);
          agentSnap = await transaction.get(agentRef);
        }

        // 1. Update Order Status
        transaction.update(orderRef, {
          status: 'processing',
          paymentConfirmedAt: new Date().toISOString()
        });

        // Trigger notification for order status change (processing)
        const notifRef = doc(collection(db, 'notifications'));
        const notifMessage = `Payment confirmed! Your order #${id.slice(0, 8)} is now being styled and printed.`;
        transaction.set(notifRef, {
          title: `Order Status: PROCESSING`,
          message: notifMessage,
          type: 'order',
          userId: orderData.customerId || 'global',
          orderId: id,
          status: 'processing',
          createdAt: serverTimestamp()
        });

        // 2. Update Agent Profile Stats (The person who made the purchase)
        if (agentRef && agentSnap && agentSnap.exists()) {
          const agentData = agentSnap.data();
          transaction.update(agentRef, {
            'stats.totalSales': increment(orderData.totalAmount),
          });

          // 3. Credit Referrer if applicable (10% commission on total sales)
          if (agentData?.referredBy) {
            const referrerRef = doc(db, 'agents', agentData.referredBy);
            const commissionAmount = orderData.totalAmount * 0.10;
            transaction.update(referrerRef, {
              'stats.commissionEarned': increment(commissionAmount)
            });
          }
        }
      });

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
      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, 'orders', id);
        const orderSnap = await transaction.get(orderRef);
        
        if (!orderSnap.exists()) throw new Error("Order does not exist");
        const orderData = orderSnap.data();
        const wasConfirmed = orderData.status !== 'pending';

        // Perform agent read FIRST before any updates
        let agentSnap = null;
        let agentRef = null;
        if (wasConfirmed && orderData.customerId) {
          agentRef = doc(db, 'agents', orderData.customerId);
          agentSnap = await transaction.get(agentRef);
        }

        // 1. Update Order Status
        transaction.update(orderRef, {
          status: 'cancelled',
          cancelledAt: new Date().toISOString()
        });

        // Trigger notification for order status change (cancelled)
        const notifRef = doc(collection(db, 'notifications'));
        const notifMessage = `Order #${id.slice(0, 8)} has been cancelled.`;
        transaction.set(notifRef, {
          title: `Order Status: CANCELLED`,
          message: notifMessage,
          type: 'order',
          userId: orderData.customerId || 'global',
          orderId: id,
          status: 'cancelled',
          createdAt: serverTimestamp()
        });

        // 2. Deduct from salesCount for each product
        orderData.items.forEach((item: any) => {
          const productRef = doc(db, 'products', item.productId);
          transaction.update(productRef, {
            salesCount: increment(-item.quantity)
          });
        });

        // 3. Deduct from stats if it was previously confirmed
        if (agentRef && agentSnap && agentSnap.exists()) {
          const agentData = agentSnap.data();
          transaction.update(agentRef, {
            'stats.totalSales': increment(-orderData.totalAmount),
          });

          // 4. Reverse commission if referredBy exists
          if (agentData?.referredBy) {
            const referrerRef = doc(db, 'agents', agentData.referredBy);
            const commissionAmount = orderData.totalAmount * 0.10;
            transaction.update(referrerRef, {
              'stats.commissionEarned': increment(-commissionAmount)
            });
          }
        }
      });

      toast.success('Order Cancelled Successfully');
      setIsCancelDialogOpen(false);
    } catch (error) {
      console.error('Cancellation Error:', error);
      toast.error('Failed to cancel order.');
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

  const [selectedStep, setSelectedStep] = useState<string>('');

  const currentStatusNormalized = useMemo(() => {
    if (!order) return 'pending';
    if (order.status === 'completed') return 'delivered';
    return order.status;
  }, [order]);

  const currentStatusIdx = useMemo(() => {
    return STEPS.findIndex(s => s.id === currentStatusNormalized);
  }, [currentStatusNormalized]);

  useEffect(() => {
    if (order && !selectedStep) {
      setSelectedStep(order.status === 'completed' ? 'delivered' : order.status);
    }
  }, [order, selectedStep]);

  const getStepStatus = (stepId: string) => {
    if (!order) return 'idle';
    const stepIdx = STEPS.findIndex(s => s.id === stepId);
    
    if (stepIdx < currentStatusIdx) return 'complete';
    if (stepIdx === currentStatusIdx) return 'active';
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
            
            <div className="flex flex-col md:grid md:grid-cols-4 gap-12 md:gap-8 relative select-none">
               {/* Progress Line (Desktop) */}
               <div className="hidden md:block absolute top-[28px] left-[12%] right-[12%] h-[2px] bg-white/5 z-0">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentStatusIdx / (STEPS.length - 1)) * 100}%` }}
                    className="h-full bg-accent shadow-[0_0_15px_rgba(242,125,38,0.5)]"
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
               </div>

               {/* Progress Line (Mobile) */}
               <div className="md:hidden absolute left-[23px] top-[10%] bottom-[10%] w-px bg-white/5 z-0">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${(currentStatusIdx / (STEPS.length - 1)) * 100}%` }}
                    className="w-full bg-accent shadow-[0_0_10px_rgba(242,125,38,0.5)]"
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
               </div>

               {STEPS.map((step, idx) => {
                 const status = getStepStatus(step.id);
                 const stepNumber = (idx + 1).toString().padStart(2, '0');
                 const isSelected = selectedStep === step.id;
                 
                 return (
                   <button 
                     key={step.id} 
                     onClick={() => setSelectedStep(step.id)}
                     className="flex flex-row md:flex-col items-center md:items-center text-center gap-8 md:gap-6 relative z-10 group/step text-left cursor-pointer focus:outline-none w-full"
                   >
                      <div className="relative flex-shrink-0">
                        <div className={cn(
                          "w-12 h-12 md:w-14 md:h-14 rounded-full border-2 flex items-center justify-center transition-all duration-700 relative z-20",
                          status === 'active' ? "border-accent bg-accent text-black shadow-[0_0_30px_rgba(242,125,38,0.3)] scale-110" :
                          status === 'complete' ? "border-accent bg-accent/20 text-accent hover:bg-accent/30" : "border-white/5 bg-background text-white/5 hover:border-white/20",
                          isSelected && "ring-2 ring-white/40 ring-offset-4 ring-offset-background"
                        )}>
                          {status === 'complete' ? <CheckCircle2 className="w-6 h-6 animate-pulse" /> : <step.icon className={cn("w-5 h-5 md:w-6 md:h-6", status === 'active' && "animate-pulse")} />}
                        </div>
                        
                        {/* Step Number Background */}
                        <span className={cn(
                          "absolute -top-4 -left-4 text-4xl font-display font-black italic opacity-5 pointer-events-none transition-all duration-500",
                          status !== 'idle' && "opacity-10 text-accent",
                          isSelected && "opacity-20 scale-110"
                        )}>
                          {stepNumber}
                        </span>
                      </div>
                      
                      <div className="text-left md:text-center space-y-1">
                         <p className={cn(
                           "text-xs font-black uppercase tracking-editorial leading-none transition-colors",
                           status === 'idle' ? "text-white/20 group-hover/step:text-white/40" : status === 'active' ? "text-accent" : "text-white",
                           isSelected && "text-accent underline underline-offset-4"
                         )}>{step.label}</p>
                         <p className="text-[9px] font-black uppercase tracking-tighter text-white/20 italic">{step.description}</p>
                      </div>
                   </button>
                 );
               })}
            </div>

            {/* Real-time Status Details & Logs */}
            <div className="mt-12 pt-8 border-t border-white/5 grid grid-cols-1 lg:grid-cols-12 gap-8">
               {/* Left Side: Step Guide */}
               <div className="lg:col-span-7 bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
                 <div className="flex items-center space-x-3">
                   <div className="p-2 bg-accent/20 text-accent rounded-lg">
                     {(() => {
                       const IconComp = STEPS.find(s => s.id === selectedStep)?.icon || Clock;
                       return <IconComp className="w-5 h-5" />;
                     })()}
                   </div>
                   <div>
                     <span className="text-[9px] font-black uppercase tracking-widest text-accent">Selected Blueprint Stage</span>
                     <h4 className="text-lg font-display font-black uppercase italic text-white flex items-center gap-2">
                       {STEPS.find(s => s.id === selectedStep)?.label || 'System Protocol'}
                       {selectedStep === currentStatusNormalized && (
                         <span className="text-[8px] tracking-normal font-mono px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20 font-normal uppercase">Current</span>
                       )}
                     </h4>
                   </div>
                 </div>
                 
                 <div className="text-white/60 text-xs leading-relaxed space-y-3">
                    {selectedStep === 'pending' && (
                      <div className="space-y-2">
                         <p>The system is awaiting confirmation of your GHS {formatGHC(order.depositAmount || 0)} payment.</p>
                         <p className="font-bold text-white uppercase text-[9px] tracking-widest mt-2 block text-accent">Next Action Plan:</p>
                         <ul className="list-disc pl-5 space-y-1 text-[11px] text-white/50">
                           <li>Authorize standard Mobile Money (MoMo) transfer via Paystack or direct pay.</li>
                           <li>Our administrators verify proof of entry to activate production.</li>
                         </ul>
                      </div>
                    )}
                    {selectedStep === 'processing' && (
                      <div className="space-y-2">
                         <p>Your payment was successfully authenticated! The Kings Design Authority has initialized the production workflow.</p>
                         <p className="font-bold text-white uppercase text-[9px] tracking-widest mt-2 block text-accent">Active Operations:</p>
                         <ul className="list-disc pl-5 space-y-1 text-[11px] text-white/50">
                           <li>Analyzing custom blueprints and design dimensions.</li>
                           <li>Applying precise high-fidelity digital transfers on premium raw garments.</li>
                           <li>Conducting manual print-integrity audit.</li>
                         </ul>
                      </div>
                    )}
                    {selectedStep === 'shipped' && (
                      <div className="space-y-2">
                         <p>Sovereign logistics channels are engaged. Your curated garments are cleared for transport.</p>
                         <p className="font-bold text-white uppercase text-[9px] tracking-widest mt-2 block text-accent">Dispatch Logistics:</p>
                         <ul className="list-disc pl-5 space-y-1 text-[11px] text-white/50">
                           <li>Package secured in protective weather-resistant sealing.</li>
                           <li>Route calculations optimizing for rapid regional delivery.</li>
                           <li>Check WhatsApp / SMS alerts for delivery agent coordinates.</li>
                         </ul>
                      </div>
                    )}
                    {selectedStep === 'delivered' && (
                      <div className="space-y-2">
                         <p>Procurement protocol complete. Wardrobe upgrade finalized.</p>
                         <p className="font-bold text-white uppercase text-[9px] tracking-widest mt-2 block text-accent">Post-Delivery Protocol:</p>
                         <ul className="list-disc pl-5 space-y-1 text-[11px] text-white/50">
                           <li>Confirm physical receipt with your delivery authority.</li>
                           <li>Earn 10% commission on referrals by sharing your unique Agent Link.</li>
                           <li>Submit your next layout blueprint in the agent workspace.</li>
                         </ul>
                      </div>
                    )}
                 </div>
               </div>

               {/* Right Side: Telemetry Terminal Logs */}
               <div className="lg:col-span-12 xl:col-span-5 bg-black/60 border border-white/5 rounded-2xl p-6 font-mono text-[10px] text-emerald-500/80 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                     <span className="font-bold tracking-widest text-[9px] uppercase text-white/40 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        Live Status Telemetry
                     </span>
                     <span className="text-[8px] text-white/20">CTRL_LOG_GHA</span>
                  </div>
                  
                  <div className="space-y-2 max-h-[160px] overflow-y-auto scrollbar-none">
                     <p className="text-white/20">[{new Date(order.createdAt?.seconds * 1000 || Date.now() - 3600000).toLocaleTimeString()}] SYS_BOOT: Procurement session initialized.</p>
                     
                     <p className="text-white/40">[{new Date(order.createdAt?.seconds * 1000 || Date.now() - 3600000).toLocaleTimeString()}] ORDER_ID: {order.id?.slice(0, 8)} logged to Ledger.</p>
                     
                     {order.paymentSubmitted && (
                       <p className="text-amber-500/80">
                          [{order.paymentSubmittedAt ? new Date(order.paymentSubmittedAt).toLocaleTimeString() : 'ACTIVE'}] DEP_LOG: Payment transfer record uploaded. Awaiting clerk verification.
                       </p>
                     )}

                     {currentStatusIdx >= 1 && (
                       <p className="text-emerald-500/60 font-medium">
                          [{order.updatedAt ? new Date(order.updatedAt.seconds * 1000).toLocaleTimeString() : 'ACTIVE'}] VERIFY: Clerk confirmed deposit. Production queue prioritized.
                       </p>
                     )}

                     {currentStatusIdx >= 2 && (
                       <p className="text-sky-500/80 font-medium">
                          [ACTIVE] DIST_AUTH: Garments packaged. Sovereign carrier assigned.
                       </p>
                     )}

                     {currentStatusIdx >= 3 && (
                       <p className="text-emerald-400 font-bold">
                          [SUCCESS] HANDOVER: Package accepted by target recipient.
                       </p>
                     )}

                     {order.status === 'cancelled' && (
                       <p className="text-red-500 font-bold">
                          [REVOKED] TERMINATE: Blueprint purged from active registers.
                       </p>
                     )}

                     <div className="animate-pulse text-emerald-500/30">_ Awaiting live event broadcast...</div>
                  </div>
               </div>
            </div>

            <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                 <p className="text-[10.5px] font-black uppercase tracking-widest text-accent animate-pulse">Advanced Logistics Telemetry Online</p>
                 <p className="text-[9px] font-semibold uppercase tracking-wide text-white/40">Open the secure log to inspect shipping carriers, download digital receipt blueprints, or locate delivery ports.</p>
              </div>
              <Link 
                to={`/orders?track=${order.id}`}
                className="px-6 py-3.5 bg-accent text-black text-[9.5px] font-black uppercase tracking-widest rounded-xl hover:bg-white transition-all flex items-center justify-center space-x-2 shadow-lg shadow-accent/15 flex-shrink-0"
              >
                <span>Launch Tracking Hub</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 print:block">
          {/* Payment & Next Steps */}
          <div className="space-y-8 print:hidden">
            <div className="glass p-10 rounded-[2.5rem] border border-white/5 flex flex-col justify-between h-full group hover:border-accent/30 transition-all duration-500">
               <div>
                  <div className="flex items-center space-x-2 text-accent mb-6">
                    <CreditCard className="w-4 h-4" />
                    <span className="text-[9px] font-black uppercase tracking-editorial">{order.status === 'cancelled' ? 'Authority Status' : 'Action Required'}</span>
                  </div>
                   <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white mb-6">{order.status === 'cancelled' ? 'Blueprint Terminated' : 'Payment Alert Protocol'}</h3>
                   
                   {order.status === 'pending' && (
                     <div className="flex p-1 bg-white/5 rounded-2xl mb-6">
                        <button 
                          onClick={() => setPaymentMethod('momo')}
                          className={cn(
                            "flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2",
                            paymentMethod === 'momo' ? "bg-accent text-black shadow-lg" : "text-white/40 hover:text-white"
                          )}
                        >
                           <Zap className="w-3 h-3" />
                           <span>Mobile Money</span>
                        </button>
                        <button 
                          onClick={() => setPaymentMethod('bank')}
                          className={cn(
                            "flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2",
                            paymentMethod === 'bank' ? "bg-accent text-black shadow-lg" : "text-white/40 hover:text-white"
                          )}
                        >
                           <Landmark className="w-3 h-3" />
                           <span>Bank Transfer</span>
                        </button>
                     </div>
                   )}

                   {order.status !== 'cancelled' && paymentMethod === 'momo' && (
                     <div className="space-y-4 mb-8">
                        <div className="bg-white/5 p-8 rounded-[2rem] border border-accent/20 flex flex-col items-center text-center space-y-4">
                           <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent animate-pulse">
                              <Zap className="w-6 h-6" />
                           </div>
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-2">Automated Alert Active</p>
                              <p className="text-white/40 text-[9px] leading-relaxed font-bold uppercase tracking-tight">
                                 A secure Paystack payment request has been signaled to your device. Please authorize the <span className="text-accent">{formatGHC(order.depositAmount)}</span> payment.
                              </p>
                           </div>
                        </div>
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                           <div className="flex items-center justify-between group/ref" onClick={handleCopyRef}>
                              <div>
                                 <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mb-1 italic">Security Hash (Reference)</p>
                                 <p className="text-lg font-mono font-black text-white">{order.id.slice(0, 8).toUpperCase()}</p>
                              </div>
                              <Copy className="w-5 h-5 text-white/10 group-hover/ref:text-white transition-colors" />
                           </div>
                           <div className="h-px bg-white/5 w-full"></div>
                           <a 
                             href={`https://wa.me/${SUPPORT_INTERACTION_NUMBER}`}
                             className="flex items-center justify-between group/support"
                           >
                              <div>
                                 <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mb-1 italic">Order Support & Follow-up</p>
                                 <p className="text-[11px] font-black text-accent uppercase">{SUPPORT_INTERACTION_NUMBER}</p>
                              </div>
                              <div className="bg-accent/10 p-2 rounded-lg group-hover/support:bg-accent group-hover/support:text-black transition-all">
                                <MessageCircle className="w-4 h-4" />
                              </div>
                           </a>
                        </div>
                     </div>
                   )}

                   {order.status !== 'cancelled' && paymentMethod === 'bank' && (
                     <div className="space-y-4 mb-8">
                        <div className="bg-white/5 p-8 rounded-[2rem] border border-accent/20 space-y-6">
                           <div className="flex items-center space-x-3 text-accent transition-all">
                              <Landmark className="w-5 h-5" />
                              <span className="text-[10px] font-black uppercase tracking-editorial">Archive Account Ledger</span>
                           </div>
                           
                           <div className="space-y-4">
                              <div className="flex justify-between items-center group/bank" onClick={() => {
                                 navigator.clipboard.writeText(BANK_DETAILS.accountNumber);
                                 toast.success('Account Number Captured');
                              }}>
                                 <div>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mb-1 italic">Account Number</p>
                                    <p className="text-xl font-mono font-black text-white tracking-widest">{BANK_DETAILS.accountNumber}</p>
                                 </div>
                                 <Copy className="w-3 h-3 text-white/10 group-hover/bank:text-accent" />
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mb-1 italic">Ledger Name</p>
                                    <p className="text-[10px] font-black text-white uppercase">{BANK_DETAILS.accountName}</p>
                                 </div>
                                 <div>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mb-1 italic">Protocol Institution</p>
                                    <p className="text-[10px] font-black text-white uppercase">{BANK_DETAILS.bankName}</p>
                                 </div>
                              </div>
                           </div>

                           <div className="pt-6 border-t border-white/5">
                              <p className="text-[9px] font-bold text-white/40 leading-relaxed uppercase tracking-tight text-center">
                                 Transfer <span className="text-accent font-black">{formatGHC(order.depositAmount)}</span> to the details above. Use Ref: <span className="text-white font-black">{order.id.slice(0, 8).toUpperCase()}</span>
                              </p>
                           </div>
                        </div>

                        <a 
                          href={`https://wa.me/${SUPPORT_INTERACTION_NUMBER}?text=${encodeURIComponent(`Greetings Kings Clothing Archive. I have initiated a bank transfer of ${formatGHC(order.depositAmount)} for Order Ref: ${order.id.slice(0, 8).toUpperCase()}. Requesting verification.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-5 bg-white/5 border border-white/10 hover:border-accent text-white font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all flex items-center justify-center space-x-3"
                        >
                           <MessageCircle className="w-4 h-4 text-accent" />
                           <span>Notify Archive of Transfer</span>
                        </a>

                        {order.status === 'pending' && !order.paymentSubmitted && (
                          <button 
                            onClick={handleMarkAsPaid}
                            disabled={isSubmittingTransfer}
                            className="w-full py-5 bg-accent text-black font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-white transition-all flex items-center justify-center space-x-3 shadow-lg shadow-accent/10"
                          >
                            {isSubmittingTransfer ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                            <span>Confirm Transfer Submission</span>
                          </button>
                        )}

                        {order.paymentSubmitted && order.status === 'pending' && (
                          <div className="p-5 bg-accent/10 border border-accent/20 rounded-2xl text-center">
                             <p className="text-[10px] font-black uppercase tracking-widest text-accent italic">Awaiting Registry Verification</p>
                          </div>
                        )}
                     </div>
                   )}

                   {order.status === 'pending' && (
                     <div className="space-y-4">
                       {isBrandOwner ? (
                         <div className={cn(
                           "p-8 border-2 rounded-[2rem] space-y-6 transition-all",
                           order.paymentSubmitted ? "border-accent bg-accent/5" : "border-white/10 bg-white/5"
                         )}>
                            <div className="flex items-center justify-between">
                               <div className="flex items-center space-x-3">
                                  <ShieldCheck className="w-5 h-5 text-accent" />
                                  <span className="text-xs font-black uppercase tracking-editorial text-white">Authority Verification</span>
                               </div>
                               {order.paymentSubmitted && (
                                  <div className="px-3 py-1 bg-accent text-black text-[8px] font-black uppercase tracking-widest rounded-full animate-pulse">
                                     Flagged for Review
                                  </div>
                               )}
                            </div>
                            <div className="space-y-2">
                               <p className="text-[10px] font-black uppercase tracking-widest text-white/40 leading-relaxed italic">
                                 Method: <span className="text-white">{order.paymentMethod === 'bank' ? 'Bank Transfer' : 'Mobile Money'}</span>
                               </p>
                               <p className="text-[10px] font-black uppercase tracking-widest text-white/40 leading-relaxed italic">
                                 Verify the {order.paymentMethod === 'bank' ? 'Account Ledger' : 'Paystack Ledger'} for <span className="text-accent">{formatGHC(order.depositAmount)}</span> before final authorization.
                               </p>
                            </div>
                            <button 
                             onClick={handleConfirmPayment}
                             disabled={isConfirming}
                             className="w-full py-6 bg-accent text-black font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl hover:bg-white transition-all shadow-[0_0_30px_rgba(242,125,38,0.3)] flex items-center justify-center space-x-3"
                           >
                             {isConfirming ? (
                               <RefreshCw className="w-5 h-5 animate-spin" />
                             ) : (
                               <ShieldCheck className="w-5 h-5" />
                             )}
                             <span>Authorize Production</span>
                           </button>
                         </div>
                       ) : (
                         <button 
                           onClick={handleTriggerAlert}
                           disabled={isAlerting}
                           className="w-full py-5 bg-accent text-black font-black uppercase text-[10px] tracking-widest rounded-3xl hover:bg-white transition-all flex items-center justify-center space-x-3 group/btn shadow-xl shadow-accent/20"
                         >
                           {isAlerting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4 group-hover/btn:scale-125 transition-transform" />}
                           <span>Complete Payment with Paystack</span>
                         </button>
                       )}
                     </div>
                   )}

                  {['pending', 'processing'].includes(order.status) && (
                    <button 
                      onClick={() => setIsCancelDialogOpen(true)}
                      className="w-full mt-4 py-4 bg-red-500/10 text-red-500 border border-red-500/20 font-black uppercase text-[9px] tracking-[0.2em] rounded-2xl hover:bg-red-500 hover:text-black transition-all active:scale-95 flex items-center justify-center space-x-2"
                    >
                       <X className="w-3 h-3" />
                       <span>Cancel Order</span>
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
                     <img src="https://picsum.photos/seed/m1/40/40" className="w-8 h-8 rounded-full border-2 border-background object-cover" referrerPolicy="no-referrer" />
                     <img src="https://picsum.photos/seed/m2/40/40" className="w-8 h-8 rounded-full border-2 border-background object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/20 italic">50/50 Strategy Active</p>
               </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="glass p-10 rounded-[2.5rem] border border-white/5 print:w-full print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
             <div className="flex justify-between items-end mb-12">
                 <h3 className="text-[10px] font-black uppercase tracking-editorial text-white/40 italic print:text-black/40">Architecture</h3>
                 <p className="text-[10px] font-black uppercase tracking-widest text-accent print:text-black font-bold">Summary</p>
             </div>
             
             <div className="space-y-8">
                {order.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center space-x-6">
                    <div className="w-20 h-24 bg-[#1A1A1B] rounded-2xl overflow-hidden border border-white/5 grayscale print:border-black/10">
                       <img src="https://picsum.photos/seed/item/200/250" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-black uppercase tracking-tighter text-white mb-2 italic print:text-black">"{item.name}"</h4>
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/20 print:text-black/40">
                         {item.gsm} GSM • {item.size} • {item.color}
                      </p>
                    </div>
                    <div className="text-accent font-mono font-black text-xs print:text-black">
                       {formatGHC(item.price)}
                    </div>
                  </div>
                ))}
             </div>

             <div className="mt-12 pt-8 border-t border-white/5 space-y-4 print:border-black/10">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/20 print:text-black/60">
                   <span>Gross Total</span>
                   <span className="text-white print:text-black">{formatGHC(order.totalAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-accent print:text-black">
                   <span>{order.totalAmount === order.depositAmount ? 'Full Payment' : 'Deposit to Start'}</span>
                   <span className="font-mono text-lg print:text-black">{formatGHC(order.depositAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/20 print:text-black/60">
                   {order.totalAmount - order.depositAmount > 0 ? <span>Balance on Delivery</span> : null}
                   {order.totalAmount - order.depositAmount > 0 ? <span className="print:text-black">{formatGHC(order.totalAmount - order.depositAmount)}</span> : null}
                </div>
             </div>

             <div className="mt-8 pt-6 border-t border-white/5 print:hidden">
                <button
                  id="order-print-receipt-btn"
                  onClick={() => window.print()}
                  className="w-full py-4 bg-white/5 border border-white/10 hover:border-accent text-white font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all flex items-center justify-center space-x-2 active:scale-95 duration-200"
                >
                   <Printer className="w-4 h-4 text-accent" />
                   <span>Print Receipt Blueprint</span>
                </button>
             </div>
          </div>
        </div>
      </div>

      {/* Global Order Tracking Segment */}
      <section className="mt-24 pt-24 border-t border-white/5 pb-16 print:hidden">
        <div className="max-w-4xl mx-auto px-4">
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
                  Track Another <br/> Blueprint
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20 leading-relaxed italic">
                  Enter an order identifier to intercept its current manufacturing and logistics stream.
                </p>
              </div>

              <form onSubmit={handleTrack} className="space-y-4">
                <div className="relative group/input">
                  <input 
                    type="text" 
                    value={trackId}
                    onChange={(e) => setTrackId(e.target.value)}
                    placeholder="ENTER ORDER ID (E.G. KB-XXXX)"
                    className="w-full bg-background border-2 border-white/5 rounded-2xl p-6 text-xs font-mono font-bold uppercase tracking-widest text-white focus:border-accent outline-none transition-all placeholder:text-white/5 group-hover/input:border-white/10"
                  />
                  <div className="absolute inset-y-0 right-4 flex items-center">
                    <button 
                      type="submit"
                      className="p-3 bg-white/5 hover:bg-accent hover:text-black rounded-xl transition-all group/btn"
                    >
                      <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
                <p className="text-[8px] font-black uppercase tracking-widest text-white/10 text-center">
                  Terminal access requires a valid authority hash.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

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
                  <h3 className="text-3xl font-display font-black uppercase italic tracking-tighter text-white mb-2">Cancel <br/> Order?</h3>
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
                     <span>Cancel Order</span>
                  </button>
                  <button 
                    onClick={() => setIsCancelDialogOpen(false)}
                    className="w-full py-5 bg-white/5 text-white/60 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-white/10 transition-all"
                  >
                     Abort Cancellation
                  </button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
}
