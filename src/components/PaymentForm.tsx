import React, { useState } from 'react';
import { CreditCard, Mail, DollarSign, Shield, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatGHC } from '../lib/utils'; // Assumed helper from project setup

// Declare global PaystackPop interface safely on window
declare global {
  interface Window {
    PaystackPop?: any;
  }
}

// Configurable Paystack Public Key fallback placeholders matching image_19.png metadata
const PUBLIC_KEY_ENV_VAR = (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '').trim().replace(/^["']|["']$/g, "");
const DEFAULT_PLACEHOLDER_KEY = PUBLIC_KEY_ENV_VAR || 'pk_test_your_paystack_public_key_here';

export function PaymentForm() {
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<any>(null);

  const getActivePublicKey = () => {
    return (customKey || PUBLIC_KEY_ENV_VAR || 'pk_test_your_paystack_public_key_here').trim();
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter a valid email address.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid payment amount.');
      return;
    }

    const activeKey = getActivePublicKey();
    if (!activeKey || activeKey === 'pk_test_your_paystack_public_key_here') {
      toast.error('Paystack Public Key is not set.');
      return;
    }

    setIsProcessing(true);
    const loadingToast = toast.loading('Initializing Paystack Secure Gateway...');

    try {
      const amountInPesewas = Math.round(numAmount * 100);
      const paystackPop = window.PaystackPop;

      if (!paystackPop || !paystackPop.setup) {
        toast.dismiss(loadingToast);
        setIsProcessing(false);
        throw new Error('Paystack inline SDK is not fully loaded. Try refreshing.');
      }

      const handler = paystackPop.setup({
        key: activeKey,
        email: email.trim(),
        amount: amountInPesewas,
        currency: 'GHS',
        channels: ['mobile_money'],
        ref: `kngs_terminal_${Date.now()}`,
        callback: (response: any) => {
          toast.dismiss(loadingToast);
          setIsProcessing(false);
          setPaymentSuccess(response);
          toast.success(`Payment verified! Ref: ${response.reference}`);
        },
        onClose: () => {
          toast.dismiss(loadingToast);
          setIsProcessing(false);
          toast.error('Payment cancelled by user.');
        }
      });

      handler.openIframe();

    } catch (error: any) {
      toast.dismiss(loadingToast);
      setIsProcessing(false);
      toast.error(error.message || 'Payment integration sync failed.');
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-black/60 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-2xl relative">
      {paymentSuccess ? (
        <div className="flex flex-col items-center justify-center text-center space-y-6 py-6" id="payment-success-card">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold uppercase tracking-wider text-white">Payment Confirmed</h3>
            <p className="text-xs text-white/60 mt-1 uppercase tracking-wide">Your payment was validated successfully.</p>
          </div>

          <div className="w-full bg-white/5 border border-white/5 rounded-xl p-4 space-y-3 font-mono text-[11px] text-white/80">
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-white/40">TRANS REFERENCE:</span>
              <span className="text-white font-bold select-all">{paymentSuccess.reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">AMOUNT PAID:</span>
              <span className="text-accent font-bold">GH₵ {amount}</span>
            </div>
          </div>

          <button
            onClick={() => {
              setPaymentSuccess(null);
              setAmount('');
            }}
            type="button"
            className="w-full bg-white/10 hover:bg-white/20 text-white rounded-xl py-3 text-xs font-black uppercase tracking-widest transition border border-white/10"
          >
            Initiate New Payment
          </button>
        </div>
      ) : (
        <form onSubmit={handlePayment} className="space-y-4" id="payment-terminal-form">
          
          {/* Email Block from image_17.png */}
          <div className="space-y-4">
            {/* 3. Collects Email Address */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[10px] font-black uppercase tracking-widest text-white/60">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/30">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="e.g. customer@kingsclothing.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 rounded-xl border border-white/10 focus:border-white/30 text-white placeholder-white/20 text-sm"
                />
              </div>
            </div>

            {/* Amount block matching image_15.png and image_16.png */}
            {/* 3. Collects Amount in GHS */}
            <div className="space-y-1.5">
              <label htmlFor="amount" className="block text-[10px] font-black uppercase tracking-widest text-white/60">
                Payment Amount (GHS)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-accent font-bold text-xs">
                  GH₵
                </div>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.10"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 rounded-xl border border-white/10 focus:border-white/30 text-white placeholder-white/20 text-sm"
                />
              </div>
              {parseFloat(amount) && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
                <p className="text-[10px] text-white/40 font-mono italic">
                  Will send {Math.round(parseFloat(amount) * 100)} Pesewas strictly over Mobile Money
                </p>
              )}
            </div>
          </div>

          {/* Paystack Gateway Configuration Dashboard Blocks from image_18.png and image_19.png */}
          {/* Paystack Public Key Configurator (Option & Helper) */}
          <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-[9px] font-black text-white/40 uppercase tracking-widest">
              <CreditCard className="w-3.5 h-3.5 text-white/40" />
              <span>Paystack Gateway Configuration</span>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[9px] text-white/40 uppercase tracking-wider">
                <span>Current Public Key Source:</span>
                <span className="font-mono text-[8px] px-1.5 py-0.5 rounded bg-white/10 text-accent font-bold">
                  {PUBLIC_KEY_ENV_VAR ? 'ENV FILE (VITE_)' : 'DEFAULT FALLBACK'}
                </span>
              </div>
              <div className="font-mono text-[9px] px-2.5 py-1.5 rounded bg-black/40 border border-white/5 text-white/60 overflow-hidden">
                {getActivePublicKey()}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[8px] font-black uppercase tracking-widest text-white/40">
                Override Public Key on-the-fly (Optional test overrides)
              </label>
              <input
                type="text"
                placeholder="pk_test_... (or leave blank to use configured standard key)"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                className="w-full px-2.5 py-2 bg-black/50 border border-white/5 rounded-lg text-white/80 placeholder-white/20 font-mono text-[11px]"
              />
            </div>
          </div>

          {/* Checkout Button Framework from image_20.png & image_21.png */}
          <button
            id="pay-submit-btn"
            type="submit"
            disabled={isProcessing}
            className="w-full relative flex items-center justify-center gap-2 bg-white hover:bg-white/90 text-black rounded-xl py-3.5 text-xs font-black uppercase tracking-widest transition duration-300 disabled:bg-white/20 disabled:text-white/40"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                <span>Completing Verification...</span>
              </>
            ) : (
              <>
                <span>Secure Mobile Money Pay</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Secure compliance text at bottom from image_21.png */}
          <p className="text-[9px] text-center text-white/30 uppercase tracking-widest leading-relaxed">
            Locked 256-bit encryption. Transactions comply fully with PCI-DSS guidelines.
          </p>

        </form>
      )}
    </div>
  );
}
