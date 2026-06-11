import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, ShoppingBag, Zap, ShieldCheck, Phone, ChevronLeft, RefreshCw } from 'lucide-react';
import { useCart } from '../lib/CartContext';
import { formatGHC, cn } from '@/src/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { doc, addDoc, collection, serverTimestamp, updateDoc, increment, runTransaction, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { initPaystackMock } from '../lib/paystackMock';
import { logPaystackCallback } from '../lib/paystackLogger';

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_d894983d4fc4381d5bfd95e0e1db5b800df57f95';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOrdering, setIsOrdering] = React.useState(false);
  const [step, setStep] = React.useState<'cart' | 'details'>('cart');
  const [guestName, setGuestName] = React.useState('');
  const [guestEmail, setGuestEmail] = React.useState('');
  const [guestNameError, setGuestNameError] = React.useState('');
  const [guestEmailError, setGuestEmailError] = React.useState('');
  const [couponCode, setCouponCode] = React.useState('');
  const [appliedCoupon, setAppliedCoupon] = React.useState<any>(null);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const q = query(
        collection(db, 'coupons'), 
        where('code', '==', couponCode.toUpperCase()), 
        where('active', '==', true)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const couponData = querySnapshot.docs[0].data();
        const couponId = querySnapshot.docs[0].id;
        
        if (couponData.usageLimit && (couponData.usageCount || 0) >= couponData.usageLimit) {
            toast.error('Usage terminal reached');
            return;
        }

        setAppliedCoupon({ id: couponId, ...couponData });
        toast.success(`Protocol Verified: ${couponData.discountPercentage}% Off`);
      } else {
        toast.error('Invalid Protocol Code');
      }
    } catch (e) {
      toast.error('Verification failure');
    }
  };

  const finalPrice = React.useMemo(() => {
    if (!appliedCoupon) return totalPrice;
    return totalPrice * (1 - (appliedCoupon.discountPercentage / 100));
  }, [totalPrice, appliedCoupon]);

  const startPaystackPayment = async () => {
    setIsOrdering(true);
    const loadingToast = toast.loading('Synchronizing Secure Paystack Gateway...');

    try {
      const referralId = sessionStorage.getItem('last_referral_id');
      const depositAmount = finalPrice;
      const genRef = 'KNGS_DEP_' + Math.random().toString(36).substring(2, 12).toUpperCase();

      const metadata = {
        custom_fields: [
          {
            display_name: "Cart Details",
            variable_name: "cart_details",
            value: items.map(i => `${i.name} (x${i.quantity})`).join(', ')
          },
          {
            display_name: "Coupon Code",
            variable_name: "coupon_code",
            value: appliedCoupon?.code || "NONE"
          },
          {
            display_name: "Customer Identity",
            variable_name: "customer_identity",
            value: user ? `User: ${user.displayName}` : `Guest: ${guestName} (${guestEmail})`
          }
        ]
      };

      // 1. Initialize Paystack Transaction on backend
      const initRes = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email || guestEmail || 'customer@example.com',
          amount: Math.round(depositAmount * 100), // convert to subunits
          reference: genRef,
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
          'CartDrawer Checkout',
          {
            reference: genRef,
            amount: depositAmount,
            email: user?.email || guestEmail || 'customer@example.com'
          },
          response
        );

        if (!audit.isValid) {
          toast.error(`Payment Authorization Failed: ${audit.reason || 'Details could not be verified'}`);
          setIsOrdering(false);
          return;
        }

        const orderData = {
          customerId: user?.uid || 'guest_' + Math.random().toString(36).substring(2, 10),
          customerName: user?.displayName || guestName || 'Guest Customer',
          customerEmail: user?.email || guestEmail || 'customer@example.com',
          isGuest: !user,
          items: items.map(item => ({
            productId: item.id,
            name: item.name,
            gsm: item.gsm,
            color: item.color,
            size: item.size,
            price: item.price,
            quantity: item.quantity
          })),
          totalAmount: finalPrice,
          depositAmount: depositAmount,
          discountApplied: totalPrice - finalPrice,
          appliedCouponCode: appliedCoupon?.code || null,
          status: 'pending',
          paymentStatus: 'paid',
          paystackReference: response.reference || response.id || genRef,
          referralAgentId: referralId || null,
          createdAt: serverTimestamp()
        };

        try {
          const orderRef = doc(collection(db, 'orders'));
          const orderId = orderRef.id;

          await runTransaction(db, async (transaction) => {
            transaction.set(orderRef, orderData);
            
            // 2. Increment salesCount for each product to track trending data
            items.forEach(item => {
              const productRef = doc(db, 'products', item.id);
              transaction.update(productRef, {
                salesCount: increment(item.quantity)
              });
            });

            if (appliedCoupon) {
              transaction.update(doc(db, 'coupons', appliedCoupon.id), {
                usageCount: increment(1)
              });
            }

            // Trigger notification for order status change (pending)
            const notifRef = doc(collection(db, 'notifications'));
            const notifMessage = `Your order #${orderId.slice(0, 8)} has been logged and is awaiting confirmation.`;
            transaction.set(notifRef, {
              title: `Order Status: PENDING`,
              message: notifMessage,
              type: 'order',
              userId: orderData.customerId || 'global',
              orderId: orderId,
              status: 'pending',
              createdAt: serverTimestamp()
            });
          });

          clearCart();
          toast.dismiss(loadingToast);
          toast.success('Capital Asset Secured');
          navigate(`/order/${orderId}`);
          onClose();
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'orders');
        }
      };

      const handlePaymentClosed = () => {
        setIsOrdering(false);
        toast.dismiss(loadingToast);
        toast.error('Transaction Terminated by User');
      };

      // 2. Open popup using resumed transaction / inline setup config
      const isSimulation = initData.mode === 'simulation';
      
      const config = {
        key: PAYSTACK_PUBLIC_KEY,
        email: user?.email || guestEmail || 'customer@example.com',
        amount: Math.round(depositAmount * 100), // convert to pesewas
        currency: 'GHS',
        channels: ['mobile_money', 'card'],
        ref: genRef,
        reference: genRef,
        access_code: initData.data?.access_code || undefined,
        mode: isSimulation ? 'simulation' : 'live',
        metadata,
        callback: async (response: any) => {
          if (isSimulation) {
            await handlePaymentSuccess(response);
          } else {
            // Verify on backend server
            const verifyToast = toast.loading('Confirming transaction clearance on server...');
            try {
              const verifyRes = await fetch(`/api/paystack/verify/${response.reference || genRef}`);
              if (!verifyRes.ok) throw new Error('Payment verification rejected');
              const verifyData = await verifyRes.json();
              
              if (verifyData.status && verifyData.data.status === 'success') {
                toast.success('Clearance Approved');
                await handlePaymentSuccess(response);
              } else {
                toast.error('Transaction failed validation clearance.');
                setIsOrdering(false);
              }
            } catch (err: any) {
              toast.error(`Verification Failure: ${err.message}`);
              setIsOrdering(false);
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
              const verifyRes = await fetch(`/api/paystack/verify/${response.reference || genRef}`);
              if (!verifyRes.ok) throw new Error('Payment verification rejected');
              const verifyData = await verifyRes.json();
              
              if (verifyData.status && verifyData.data.status === 'success') {
                toast.success('Clearance Approved');
                await handlePaymentSuccess(response);
              } else {
                toast.error('Transaction failed validation clearance.');
                setIsOrdering(false);
              }
            } catch (err: any) {
              toast.error(`Verification Failure: ${err.message}`);
              setIsOrdering(false);
            } finally {
              toast.dismiss(verifyToast);
            }
          }
        },
        onClose: handlePaymentClosed,
        onCancel: handlePaymentClosed
      };

      if (isSimulation || !(window as any).PaystackPop) {
        initPaystackMock();
      }
      
      const handler = (window as any).PaystackPop.setup(config);
      handler.openIframe();
      toast.dismiss(loadingToast);

    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error('Terminal Error: ' + error.message);
      setIsOrdering(false);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;

    if (step === 'cart') {
      if (user) {
        await startPaystackPayment();
      } else {
        setStep('details');
      }
      return;
    }

    if (step === 'details') {
      let valid = true;
      if (!guestName.trim()) {
        setGuestNameError('Identity verification name is required');
        valid = false;
      } else {
        setGuestNameError('');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!guestEmail.trim()) {
        setGuestEmailError('Protocol communication email is required');
        valid = false;
      } else if (!emailRegex.test(guestEmail)) {
        setGuestEmailError('Secure protocol email format is invalid');
        valid = false;
      } else {
        setGuestEmailError('');
      }

      if (!valid) {
        toast.error('Identity Credentials Incomplete');
        return;
      }

      await startPaystackPayment();
      return;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-background border-l border-white/10 z-[101] flex flex-col"
          >
            {/* Drawer Header */}
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ShoppingBag className="w-5 h-5 text-accent" />
                <h2 className="text-xl font-display font-black uppercase italic tracking-tighter">Your Bag</h2>
              </div>
              <button 
                onClick={onClose}
                aria-label="Close cart drawer"
                className="p-3 hover:bg-white/5 rounded-2xl transition-colors text-white/30 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Progress Bar */}
            {items.length > 0 && !user && (
              <div className="px-8 py-3 bg-black/20 border-b border-white/5 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-white/30">
                <button 
                  onClick={() => setStep('cart')}
                  className={cn("flex items-center space-x-1", step === 'cart' ? "text-accent" : "hover:text-white")}
                  aria-label="Go to step 1: Cart Ledger"
                >
                  <span className="font-mono font-bold">01</span>
                  <span>Ledger</span>
                </button>
                <div className="h-px bg-white/10 flex-1 mx-3" />
                <button 
                  onClick={() => step !== 'cart' && setStep('details')}
                  className={cn("flex items-center space-x-1", step === 'details' ? "text-accent" : "hover:text-white")}
                  aria-label="Go to step 2: Identity"
                >
                  <span className="font-mono font-bold">02</span>
                  <span>Identity</span>
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <AnimatePresence mode="wait">
                {step === 'cart' ? (
                  <motion.div
                    key="cart-items"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    {items.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center space-y-6 opacity-20 py-20">
                        <ShoppingBag className="w-16 h-16" strokeWidth={1} />
                        <p className="text-[10px] font-black uppercase tracking-[0.4em]">Empty Ledger</p>
                      </div>
                    ) : (
                      items.map((item) => (
                        <motion.div 
                           layout
                           key={item.cartId}
                           className="flex items-start space-x-6 group"
                        >
                           <div className="w-24 h-32 bg-[#1A1A1B] rounded-2xl overflow-hidden border border-white/5 flex-shrink-0">
                             <img src={item.image} alt={item.name} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" referrerPolicy="no-referrer" />
                           </div>
                           <div className="flex-1 space-y-2">
                             <div className="flex justify-between items-start">
                               <h3 className="text-sm font-black uppercase tracking-tighter italic leading-tight">"{item.name}"</h3>
                               <button 
                                 onClick={() => removeItem(item.cartId)}
                                 className="p-1 text-white/10 hover:text-red-500 transition-colors"
                                 aria-label={`Remove ${item.name} from cart`}
                               >
                                 <Trash2 className="w-3.5 h-3.5" />
                               </button>
                             </div>
                             <div className="flex flex-col space-y-1">
                               <div className="flex items-center space-x-2">
                                 <ShieldCheck className="w-3 h-3 text-accent" />
                                 <span className="text-[9px] font-black uppercase tracking-widest text-accent">{item.gsm} GSM Weight</span>
                               </div>
                               <p className="text-[9px] font-black uppercase tracking-widest text-white/40">
                                 {item.color} • {item.size}
                               </p>
                             </div>
                             <div className="flex items-center justify-between pt-4">
                               <div className="flex items-center bg-white/5 rounded-lg p-1 border border-white/5">
                                 <button 
                                   onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                                   className="w-8 h-8 flex items-center justify-center text-white/20 hover:text-white"
                                   aria-label="Decrease quantity"
                                 >
                                   -
                                 </button>
                                 <span className="px-4 text-[11px] font-mono font-black" aria-live="polite">{item.quantity}</span>
                                 <button 
                                   onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                                   className="w-8 h-8 flex items-center justify-center text-white/20 hover:text-white"
                                   aria-label="Increase quantity"
                                 >
                                   +
                                 </button>
                               </div>
                               <span className="text-sm font-display font-black italic">{formatGHC(item.price * item.quantity)}</span>
                             </div>
                           </div>
                        </motion.div>
                      ))
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="details-step"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    <button 
                      onClick={() => setStep('cart')}
                      className="flex items-center space-x-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                      aria-label="Back to Cart list"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back to Ledger</span>
                    </button>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <ShieldCheck className="w-6 h-6 text-accent" />
                        <h3 className="text-4xl font-display font-black uppercase italic tracking-tighter text-white leading-none">Guest Details</h3>
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">No account required to forge royal gear</p>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label htmlFor="guest-name" className="text-[10px] font-black uppercase tracking-normal text-white/40 block">Full Name</label>
                        <input 
                          id="guest-name"
                          type="text"
                          placeholder="Lord/Lady Sterling"
                          value={guestName}
                          onChange={(e) => {
                            setGuestName(e.target.value);
                            if (e.target.value.trim()) setGuestNameError('');
                          }}
                          className={cn(
                            "w-full bg-white/5 border rounded-2xl p-5 text-sm font-black text-white outline-none focus:border-accent transition-all",
                            guestNameError ? "border-red-500/50" : "border-white/10"
                          )}
                        />
                        {guestNameError && (
                          <p className="text-[9px] text-red-400 font-bold uppercase tracking-wider">{guestNameError}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="guest-email" className="text-[10px] font-black uppercase tracking-normal text-white/40 block">Email Address</label>
                        <input 
                          id="guest-email"
                          type="email"
                          placeholder="sterling@realm.com"
                          value={guestEmail}
                          onChange={(e) => {
                            setGuestEmail(e.target.value);
                            if (e.target.value.trim()) setGuestEmailError('');
                          }}
                          className={cn(
                            "w-full bg-white/5 border rounded-2xl p-5 text-sm font-black text-white outline-none focus:border-accent transition-all",
                            guestEmailError ? "border-red-500/50" : "border-white/10"
                          )}
                        />
                        {guestEmailError && (
                          <p className="text-[9px] text-red-400 font-bold uppercase tracking-wider">{guestEmailError}</p>
                        )}
                      </div>
                    </div>

                    <div className="p-6 bg-white/5 rounded-3xl border border-white/5 text-center">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
                        Prefer brand personalization?
                      </p>
                      <button
                        onClick={() => {
                          onClose();
                          navigate('/auth');
                        }}
                        className="mt-4 text-[10px] text-accent font-black uppercase tracking-widest hover:text-white transition-all underline decoration-dotted underline-offset-4"
                      >
                        Sign in / Register
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {items.length > 0 && (
              <div className="p-8 border-t border-white/10 bg-black/40 backdrop-blur-xl sticky bottom-0 space-y-8">
                {/* Coupon Entry */}
                <div className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-2xl p-2 focus-within:border-accent/40 transition-all">
                  <input 
                    type="text"
                    placeholder="LOYALTY PROTOCOL"
                    aria-label="Coupon Discount Code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest px-4 text-white placeholder:text-white/20"
                  />
                  <button 
                    onClick={handleApplyCoupon}
                    className="bg-accent text-black px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white transition-all min-h-[44px]"
                  >
                    Verify
                  </button>
                </div>

                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">Total Value</p>
                    <div className="flex items-baseline gap-3">
                      <p className="text-3xl font-display font-black tracking-tighter italic">{formatGHC(finalPrice)}</p>
                      {appliedCoupon && (
                        <p className="text-sm font-mono font-bold text-white/20 line-through">{formatGHC(totalPrice)}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-accent italic">Required Payment</p>
                    <p className="text-xl font-display font-black text-accent italic">{formatGHC(finalPrice)}</p>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isOrdering}
                  className="w-full bg-white text-black py-6 rounded-full font-black uppercase tracking-[0.3em] text-[11px] hover:bg-accent transition-all flex items-center justify-center space-x-3 shadow-2xl active:scale-95 disabled:opacity-50 min-h-[44px]"
                >
                  {isOrdering ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      <span>
                        {step === 'details' ? 'Authorize Production' : user ? 'Authorize Production' : 'Confirm Credentials'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
