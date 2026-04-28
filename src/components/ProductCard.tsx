import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Zap, Trash2, Edit3, ChevronRight, Sparkles } from 'lucide-react';
import { formatGHC, cn } from '@/src/lib/utils';
import { PRICING, GSM_OPTIONS } from '@/src/constants';
import { GSM } from '@/src/types';
import { generateProductTags } from '../services/geminiService';

interface ProductCardProps {
  product: any;
  isAdmin?: boolean;
  onDelete?: (id: string, e: React.MouseEvent) => void;
  onUpdatePrice?: (id: string, newPrice: number, e: React.MouseEvent) => void;
  isNew?: boolean;
}

const getProductPrice = (product: any, selectedGsm: GSM): number => {
  // 1. Check for gsmPrices on the product itself (managed by ledger)
  if (product.gsmPrices && product.gsmPrices[selectedGsm]) {
    return product.gsmPrices[selectedGsm];
  }

  // 2. Fallback to global PRICING constants
  const globalCategoryPricing = (PRICING as any)[product.category];
  
  if (globalCategoryPricing) {
    if (typeof globalCategoryPricing === 'object') {
      return globalCategoryPricing[selectedGsm] || globalCategoryPricing['260'] || globalCategoryPricing['standard'] || 150;
    }
    return globalCategoryPricing;
  }

  return 150; // Final safety fallback
};

export const ProductCard: React.FC<ProductCardProps> = ({ product, isAdmin, onDelete, onUpdatePrice, isNew }) => {
  const [tags, setTags] = React.useState<string[]>([]);
  const [loadingTags, setLoadingTags] = React.useState(false);
  
  const gsmOptions = React.useMemo(() => {
    if (product.gsmOptions && product.gsmOptions.length > 0) {
      return product.gsmOptions as GSM[];
    }
    if (product.category === 'T-Shirts') {
      return ['230', '260', '320'] as GSM[];
    }
    return ['standard'] as GSM[];
  }, [product.gsmOptions, product.category]);

  const [selectedGsm, setSelectedGsm] = React.useState<GSM>(gsmOptions[0] || '260');

  const currentPrice = React.useMemo(() => {
    return getProductPrice(product, selectedGsm);
  }, [product, selectedGsm]);

  React.useEffect(() => {
    const fetchTags = async () => {
      setLoadingTags(true);
      const generatedTags = await generateProductTags(product.name, product.category, product.description || '');
      setTags(generatedTags);
      setLoadingTags(false);
    };

    if (product.name) {
      fetchTags();
    }
  }, [product.name, product.category, product.description]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative"
    >
      <Link to={`/product/${product.id}?gsm=${selectedGsm}`} className="block space-y-6">
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-[#1A1A1B] group-hover:shadow-[0_0_50px_rgba(242,125,38,0.1)] transition-all duration-700">
          <img 
            src={product.mockupImage} 
            alt={product.name} 
            className="w-full h-full object-cover grayscale brightness-75 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-1000 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
          
          <div className="absolute top-6 left-6 p-1 bg-background/50 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
             <div className="px-3 py-1 flex items-center space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <p className="text-[8px] font-black uppercase tracking-widest text-white">
                  {product.category} Collection
                </p>
                {isNew && (
                  <span className="ml-2 bg-accent text-black text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">NEW</span>
                )}
             </div>
          </div>

          {product.agentName && (
            <div className="absolute bottom-6 left-6 right-6 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
              <div className="glass p-4 rounded-2xl flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-tighter text-white/60">Designed by <span className="text-accent underline decoration-accent/20 italic">{product.agentName}</span></span>
                <ChevronRight className="w-4 h-4 text-accent" />
              </div>
            </div>
          )}

          <div className="absolute top-6 right-6 flex flex-col items-end gap-3">
             <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center backdrop-blur-xl group-hover:border-accent/40 transition-colors">
                <Zap className="w-4 h-4 text-white/20 group-hover:text-accent group-hover:scale-125 transition-all" />
             </div>
             
             {onDelete && (
               <button 
                 onClick={(e) => onDelete(product.id, e)}
                 className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/20 flex items-center justify-center backdrop-blur-xl hover:bg-red-500 hover:text-white transition-all scale-0 group-hover:scale-100"
                 title="Delete Design"
               >
                 <Trash2 className="w-4 h-4" />
               </button>
             )}
          </div>
        </div>

        <div className="flex items-end gap-2 px-2">
          <div className="space-y-2 flex-1">
            <h3 className="text-sm md:text-xl font-display font-black uppercase italic tracking-tight group-hover:text-accent transition-colors leading-none truncate">
              {product.name}
            </h3>
            
            {/* AI Tags Section */}
            <div className="flex flex-wrap gap-1.5 pt-2 min-h-[24px]">
              {loadingTags ? (
                <div className="flex gap-2">
                  <motion.div 
                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="h-3.5 w-12 bg-white/5 rounded-full" 
                  />
                  <motion.div 
                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                    className="h-3.5 w-16 bg-white/5 rounded-full" 
                  />
                </div>
              ) : (
                tags.map((tag, i) => (
                  <motion.span 
                    key={i} 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="text-[7px] font-black uppercase tracking-[0.2em] text-white/30 px-2.5 py-1 border border-white/5 rounded-full flex items-center gap-1 group-hover:border-accent/30 group-hover:bg-accent/5 group-hover:text-accent transition-all duration-300"
                  >
                    {i === 0 && <Sparkles className="w-2 h-2 text-accent" />}
                    {tag}
                  </motion.span>
                ))
              )}
            </div>

            <p className="text-[7px] md:text-[9px] font-medium text-white/30 uppercase tracking-[0.3em] font-sans pt-1">
               EST. ACCRA • 2026
            </p>
          </div>
            <div className="flex flex-col items-end">
              {gsmOptions.length > 1 && (
                <div className="flex gap-1 mb-2 bg-white/5 p-1 rounded-full border border-white/5">
                  {gsmOptions.map(gsm => (
                    <button
                      key={gsm}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedGsm(gsm);
                      }}
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-tighter transition-all",
                        selectedGsm === gsm 
                          ? "bg-accent text-black shadow-lg" 
                          : "text-white/40 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {gsm}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                 <p className="text-accent font-mono font-black text-sm md:text-lg tracking-tighter">
                   {formatGHC(currentPrice)}
                 </p>
                 {isAdmin && onUpdatePrice && (
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const price = prompt('Enter new base price (GHS):', currentPrice.toString());
                        if (price && !isNaN(Number(price))) {
                          onUpdatePrice(product.id, Number(price), e);
                        }
                      }}
                      className="p-1 hover:text-white text-white/20 transition-all scale-0 group-hover:scale-100"
                      title="Edit Price"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                 )}
              </div>
            </div>
        </div>
      </Link>
    </motion.div>
  );
}
