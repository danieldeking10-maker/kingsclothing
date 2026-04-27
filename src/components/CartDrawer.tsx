import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, ShoppingBag, Zap, ShieldCheck } from 'lucide-react';
import { useCart } from '../lib/CartContext';
import { formatGHC, cn } from '@/src/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { doc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOrdering, setIsOrdering] = React.useState(false);

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Identity Verification Required');
      navigate('/auth');
      onClose();
      return;
    }

    if (items.length === 0) return;

    setIsOrdering(true);
    try {
      const referralId = sessionStorage.getItem('last_referral_id');
      const orderData = {
        customerId: user.uid,
        customerName: user.displayName,
        items: items.map(item => ({
          productId: item.id,
          name: item.name,
          gsm: item.gsm,
          color: item.color,
          size: item.size,
          price: item.price,
          quantity: item.quantity
        })),
        totalAmount: totalPrice,
        depositAmount: totalPrice * 0.5,
        status: 'pending',
        referralAgentId: referralId || null,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      clearCart();
      toast.success('Order Successfully Logged');
      navigate(`/order/${docRef.id}`);
      onClose();
    } catch (error: any) {
      toast.error('Deployment Failed: ' + error.message);
    } finally {
      setIsOrdering(false);
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
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ShoppingBag className="w-5 h-5 text-accent" />
                <h2 className="text-xl font-display font-black uppercase italic tracking-tighter">Your Bag</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-3 hover:bg-white/5 rounded-2xl transition-colors text-white/30 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center space-y-6 opacity-20">
                  <ShoppingBag className="w-16 h-16" strokeWidth={1} />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em]">Empty Ledger</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {items.map((item) => (
                    <motion.div 
                      layout
                      key={item.cartId}
                      className="flex items-start space-x-6 group"
                    >
                      <div className="w-24 h-32 bg-[#1A1A1B] rounded-2xl overflow-hidden border border-white/5 flex-shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-start">
                          <h3 className="text-sm font-black uppercase tracking-tighter italic leading-tight">"{item.name}"</h3>
                          <button 
                            onClick={() => removeItem(item.cartId)}
                            className="p-1 text-white/10 hover:text-red-500 transition-colors"
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
                            >
                              -
                            </button>
                            <span className="px-4 text-[11px] font-mono font-black">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center text-white/20 hover:text-white"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-sm font-display font-black italic">{formatGHC(item.price * item.quantity)}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-8 border-t border-white/10 bg-black/40 backdrop-blur-xl">
                <div className="flex justify-between items-center mb-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Kingdom Total</p>
                    <p className="text-3xl font-display font-black text-white italic tracking-tighter">{formatGHC(totalPrice)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-1">50% Deposit Req.</p>
                    <p className="text-xl font-display font-black text-accent italic">{formatGHC(totalPrice * 0.5)}</p>
                  </div>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={isOrdering}
                  className="w-full bg-white text-black py-6 rounded-full font-black uppercase tracking-[0.3em] text-[11px] hover:bg-accent transition-all flex items-center justify-center space-x-3 shadow-2xl active:scale-95 disabled:opacity-50"
                >
                  {isOrdering ? (
                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      <span>Authorize Production</span>
                    </>
                  )}
                </button>
                <p className="mt-6 text-center text-[8px] font-black uppercase tracking-[0.2em] text-white/20 italic">
                  Remaining 50% payable upon physical delivery.
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
