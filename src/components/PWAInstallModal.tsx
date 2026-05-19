import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share, PlusSquare, Download, ShieldCheck, ChevronRight } from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PWAInstallModal({ isOpen, onClose }: PWAInstallModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] cursor-pointer"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-4 right-4 bottom-4 md:left-1/2 md:right-auto md:w-full md:max-w-md md:-translate-x-1/2 bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] p-8 z-[110] shadow-[0_40px_100px_rgba(0,0,0,0.9)] overflow-hidden"
          >
            {/* Background Texture */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-accent/10 rounded-2xl">
                    <Download className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-black uppercase italic tracking-tight text-white">Citadel Protocol</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Mobile OS Installation</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-white/20" />
                </button>
              </div>

              <div className="space-y-6">
                <p className="text-sm text-white/60 leading-relaxed font-medium">
                  To establish a permanent connection to the Kings Authority, follow these instructions for your iOS device:
                </p>

                <div className="space-y-4">
                  <div className="flex items-start space-x-4 p-5 bg-white/5 rounded-3xl border border-white/5">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-black text-white">01</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-black uppercase tracking-widest text-white flex items-center gap-2">
                        Tap the <Share className="w-3.5 h-3.5 text-accent" /> Share icon
                      </p>
                      <p className="text-[9px] font-medium text-white/30 uppercase tracking-tighter italic">Located at the bottom of Safari</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 p-5 bg-white/5 rounded-3xl border border-white/5">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-black text-white">02</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-black uppercase tracking-widest text-white flex items-center gap-2">
                        Select <PlusSquare className="w-3.5 h-3.5 text-accent" /> Add to Home Screen
                      </p>
                      <p className="text-[9px] font-medium text-white/30 uppercase tracking-tighter italic">Scroll down in the share menu</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 p-5 bg-white/5 rounded-3xl border border-white/5">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-black text-white">03</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-black uppercase tracking-widest text-white">Establish Authority</p>
                      <p className="text-[9px] font-medium text-white/30 uppercase tracking-tighter italic">Tap "Add" in the top right corner</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={onClose}
                  className="w-full py-5 bg-accent text-black rounded-full font-black uppercase text-[10px] tracking-[0.3em] flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Acknowledge Protocol
                </button>
              </div>

              <div className="flex items-center justify-center space-x-2 text-[8px] font-black uppercase tracking-widest text-white/20 italic">
                <ChevronRight className="w-2 h-2" />
                <span>Compatible with iOS 11.3+ & Safari</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
