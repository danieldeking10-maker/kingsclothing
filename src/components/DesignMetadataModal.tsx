import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, Palette, Layers, Save, RefreshCw, Tag, Zap } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FABRIC_COLORS, GSM_OPTIONS } from '../constants';
import { cn } from '@/src/lib/utils';
import { toast } from 'react-hot-toast';

interface DesignMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
}

export function DesignMetadataModal({ isOpen, onClose, product }: DesignMetadataModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [allowedColors, setAllowedColors] = useState<string[]>(product?.allowedColors || []);
  const [gsmOptions, setGsmOptions] = useState<string[]>(product?.gsmOptions || []);
  const [basePrice, setBasePrice] = useState(product?.basePrice || 150);
  const [salePrice, setSalePrice] = useState(product?.salePrice || '');
  const [isOnSale, setIsOnSale] = useState(product?.isOnSale || false);

  const toggleColor = (colorName: string) => {
    setAllowedColors(prev => 
      prev.includes(colorName) 
        ? prev.filter(c => c !== colorName) 
        : [...prev, colorName]
    );
  };

  const toggleGSM = (gsm: string) => {
    setGsmOptions(prev => 
      prev.includes(gsm) 
        ? prev.filter(g => g !== gsm) 
        : [...prev, gsm]
    );
  };

  const handleSave = async () => {
    if (allowedColors.length === 0) {
      toast.error('Authority requires at least one enabled color');
      return;
    }

    setIsSaving(true);
    try {
      const docRef = doc(db, 'products', product.id);
      await updateDoc(docRef, {
        allowedColors,
        gsmOptions,
        basePrice: Number(basePrice),
        salePrice: salePrice ? Number(salePrice) : null,
        isOnSale,
        updatedAt: new Date()
      });
      toast.success('Sovereign Metadata Updated');
      onClose();
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update metadata');
    } finally {
      setIsSaving(false);
    }
  };

  if (!product) return null;

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
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-2xl md:-translate-x-1/2 md:-translate-y-1/2 bg-[#0A0A0A] border border-white/10 rounded-[3rem] p-8 z-[110] shadow-[0_40px_100px_rgba(0,0,0,0.9)] overflow-y-auto custom-scrollbar"
          >
            <div className="space-y-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-accent/20 rounded-2xl">
                    <ShieldCheck className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-black uppercase italic tracking-tight text-white">Metadata Architect</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Design Calibration for {product.name}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-6 h-6 text-white/20" />
                </button>
              </div>

              <div className="space-y-10">
                {/* Color Constraints */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-3">
                        <Palette className="w-4 h-4 text-accent" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Color Authority ({allowedColors.length})</span>
                     </div>
                     <button 
                        onClick={() => setAllowedColors(FABRIC_COLORS.map(c => c.name))}
                        className="text-[8px] font-black uppercase tracking-widest text-accent hover:underline"
                     >
                        Enable All
                     </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {FABRIC_COLORS.map(color => {
                      const isActive = allowedColors.includes(color.name);
                      return (
                        <button
                          key={color.name}
                          onClick={() => toggleColor(color.name)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-2xl border transition-all",
                            isActive 
                              ? "bg-white/10 border-accent text-white" 
                              : "bg-white/5 border-white/5 text-white/20 hover:border-white/20"
                          )}
                        >
                          <div 
                            className="w-4 h-4 rounded-full border border-white/10 shrink-0"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span className="text-[9px] font-black uppercase tracking-widest truncate">{color.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Price Protocols */}
                <div className="space-y-6">
                   <div className="flex items-center space-x-3">
                      <Tag className="w-4 h-4 text-accent" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Valuation Protocols</span>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-widest text-white/20 px-2">Base Cost (GHC)</label>
                        <input 
                          type="number"
                          value={basePrice}
                          onChange={(e) => setBasePrice(Number(e.target.value))}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-mono font-bold text-white focus:border-accent outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-2">
                          <label className="text-[8px] font-black uppercase tracking-widest text-white/20">Sale Price (GHC)</label>
                          <button 
                            type="button"
                            onClick={() => setIsOnSale(!isOnSale)}
                            className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all",
                              isOnSale ? "bg-accent text-black" : "bg-white/5 text-white/40"
                            )}
                          >
                            {isOnSale ? 'Active' : 'Inactive'}
                          </button>
                        </div>
                        <input 
                          type="number"
                          placeholder="e.g. 120"
                          value={salePrice}
                          onChange={(e) => setSalePrice(e.target.value)}
                          className={cn(
                            "w-full bg-white/5 border rounded-2xl p-4 text-xs font-mono font-bold text-white outline-none transition-all",
                            isOnSale ? "border-accent text-accent" : "border-white/10 text-white/40"
                          )}
                        />
                      </div>
                   </div>
                </div>

                {/* GSM Constraints */}
                <div className="space-y-6">
                   <div className="flex items-center space-x-3">
                      <Layers className="w-4 h-4 text-accent" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Weight Protocols (GSM)</span>
                   </div>
                   <div className="flex flex-wrap gap-3">
                    {GSM_OPTIONS.map(gsm => {
                      const isActive = gsmOptions.includes(gsm);
                      return (
                        <button
                          key={gsm}
                          onClick={() => toggleGSM(gsm)}
                          className={cn(
                            "px-6 py-3 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest",
                            isActive 
                              ? "bg-accent text-black border-accent" 
                              : "bg-white/5 border-white/5 text-white/20 hover:border-white/20"
                          )}
                        >
                          {gsm} GSM
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-6 grid grid-cols-2 gap-4">
                <button
                  onClick={onClose}
                  className="py-5 bg-white/5 border border-white/10 rounded-full font-black uppercase text-[10px] tracking-[0.2em] hover:bg-white/10 transition-all"
                >
                  Terminate Session
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="py-5 bg-accent text-black rounded-full font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Deploy Protocol
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
