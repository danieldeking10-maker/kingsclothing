import React from 'react';
import { ShieldCheck, Landmark, Smartphone, Zap } from 'lucide-react';
import { PaymentForm } from '../components/PaymentForm';

export default function PaymentTerminalPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 px-4 flex flex-col justify-center items-center bg-radial from-neutral-900 via-black to-black text-white relative">
      
      {/* Ambient background styling */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-40" />
      
      <div className="w-full max-w-lg mx-auto text-center space-y-2 z-10">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-widest uppercase">
          <span className="text-accent underline decoration-accent/40 decoration-wavy underline-offset-8">Authority</span> Pay
        </h1>
        <p className="text-xs text-white/50 font-medium tracking-widest uppercase max-w-sm mx-auto leading-relaxed">
          The ultimate garment authority secure instant billing platform.
        </p>
      </div>

      <div className="w-full max-w-md mx-auto mt-10 transition duration-300 z-10">
        <PaymentForm />
      </div>

      {/* Trust & Compliance Badge Array */}
      <div className="w-full max-w-lg mt-8 grid grid-cols-2 md:grid-cols-4 gap-2 text-center z-10">
        <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center space-y-1">
          <Smartphone className="w-4 h-4 text-white/40" />
          <span className="text-white/80 text-[10px] font-bold uppercase tracking-wider">MoMo Channels Only</span>
        </div>

        <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center space-y-1">
          <Landmark className="w-4 h-4 text-white/40" />
          <span className="text-white/80 text-[10px] font-bold uppercase tracking-wider">GHS Currency Enabled</span>
        </div>

        <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center space-y-1">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-white/80 text-[10px] font-bold uppercase tracking-wider">PCI-DSS Compliant</span>
        </div>

        <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center space-y-1">
          <Zap className="w-4 h-4 text-white/40" />
          <span className="text-white/80 text-[10px] font-bold uppercase tracking-wider">Instant Settlement</span>
        </div>
      </div>

    </div>
  );
}
