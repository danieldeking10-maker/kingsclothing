import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Trash2, Edit3, ChevronRight, Sparkles, Plus, Share2, Twitter, Facebook, MessageCircle, Settings2, Save, Eye, X as CloseIcon, Clock } from 'lucide-react';
import { formatGHC, cn } from '@/src/lib/utils';
import { PRICING, GSM_OPTIONS, FABRIC_COLORS } from '@/src/constants';
import { GSM } from '@/src/types';
import { generateProductTags } from '../services/geminiService';
import { useCart } from '../lib/CartContext';
import { toast } from 'react-hot-toast';
import { db } from '../lib/firebase';
import { doc, updateDoc, collection, query, where, limit, onSnapshot } from 'firebase/firestore';
import { EnhancedImage } from './ui/EnhancedImage';
import { useProductPreloader } from '../hooks/useProductPreloader';

interface ProductCardProps {
  product: any;
  isAdmin?: boolean;
  onDelete?: (id: string, e: React.MouseEvent) => void;
  onUpdatePrice?: (id: string, newPrice: number, e: React.MouseEvent) => void;
  isNew?: boolean;
}

const getProductPrice = (product: any, selectedGsm: GSM): number => {
  if (product.isOnSale && product.salePrice) return product.salePrice;
  if (product.gsmPrices && product.gsmPrices[selectedGsm]) return product.gsmPrices[selectedGsm];
  const globalCategoryPricing = (PRICING as any)[product.category];
  if (globalCategoryPricing) {
    if (typeof globalCategoryPricing === 'object') {
      return globalCategoryPricing[selectedGsm] || globalCategoryPricing['260'] || globalCategoryPricing['standard'] || 150;
    }
    return globalCategoryPricing;
  }
  return 150;
};

export const ProductCard = memo(({ product, isAdmin, onDelete, onUpdatePrice, isNew }: ProductCardProps) => {
  const { addItem } = useCart();
  const [tags, setTags] = React.useState<string[]>(product.aiTags || []);
  const [loadingTags, setLoadingTags] = React.useState(false);
  const [showShareMenu, setShowShareMenu] = React.useState(false);
  const [isGsmModalOpen, setIsGsmModalOpen] = React.useState(false);
  const [gsmPrices, setGsmPrices] = React.useState<Record<string, string>>({
    '230': product.gsmPrices?.['230']?.toString() || '',
    '260': product.gsmPrices?.['260']?.toString() || '',
    '320': product.gsmPrices?.['320']?.toString() || ''
  });
  const [isSaving, setIsSaving] = React.useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = React.useState(false);

  const { getPreloadHandlers, attachIntersectionPreloader } = useProductPreloader();
  const cardRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (cardRef.current) {
      return attachIntersectionPreloader(cardRef.current, product);
    }
  }, [product, attachIntersectionPreloader]);

  React.useEffect(() => {
    setGsmPrices({
      '230': product.gsmPrices?.['230']?.toString() || '',
      '260': product.gsmPrices?.['260']?.toString() || '',
      '320': product.gsmPrices?.['320']?.toString() || ''
    });
  }, [product.gsmPrices]);

  const availableColors = React.useMemo(() => {
    if (product?.allowedColors && Array.isArray(product.allowedColors) && product.allowedColors.length > 0) {
      return FABRIC_COLORS.filter(color => product.allowedColors.includes(color.name));
    }
    return FABRIC_COLORS;
  }, [product]);

  const [selectedColor, setSelectedColor] = React.useState(availableColors[0] || FABRIC_COLORS[0]);

  React.useEffect(() => {
    if (availableColors.length > 0) {
      const exists = availableColors.find(c => c.name === selectedColor.name);
      if (!exists) setSelectedColor(availableColors[0]);
    }
  }, [availableColors]);
  
  const gsmOptions = React.useMemo(() => {
    if (product.gsmOptions && product.gsmOptions.length > 0) return product.gsmOptions as GSM[];
    if (product.category === 'T-Shirts') return ['230', '260', '320'] as GSM[];
    return ['standard'] as GSM[];
  }, [product.gsmOptions, product.category]);

  const [selectedGsm, setSelectedGsm] = React.useState<GSM>(gsmOptions[0] || '260');

  // Active promotion state & real-time loader
  const [activePromo, setActivePromo] = React.useState<any>(null);
  const [timeRemaining, setTimeRemaining] = React.useState<string>('');

  React.useEffect(() => {
    const q = query(
      collection(db, 'promotions'),
      where('active', '==', true),
      limit(1)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setActivePromo({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setActivePromo(null);
      }
    }, (err) => {
      console.error("Failed to fetch active promotions in ProductCard:", err);
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    const formatCountdown = (ms: number): string => {
      if (ms <= 0) return '00:00:00';
      const totalSeconds = Math.floor(ms / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        seconds.toString().padStart(2, '0')
      ].join(':');
    };

    let targetDate: Date | null = null;
    
    if (product?.saleEndsAt) {
      if (typeof product.saleEndsAt.toDate === 'function') {
        targetDate = product.saleEndsAt.toDate();
      } else {
        targetDate = new Date(product.saleEndsAt);
      }
    } else if (activePromo?.endDate) {
      if (typeof activePromo.endDate.toDate === 'function') {
        targetDate = activePromo.endDate.toDate();
      } else {
        targetDate = new Date(activePromo.endDate);
      }
    } else if (product?.isOnSale || activePromo) {
      // Midnight today fallback
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      targetDate = endOfToday;
    }

    if (!targetDate) {
      setTimeRemaining('');
      return;
    }

    const updateTimer = () => {
      const diff = targetDate!.getTime() - Date.now();
      if (diff <= 0) {
        setTimeRemaining('Expired');
      } else {
        setTimeRemaining(formatCountdown(diff));
      }
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [product?.saleEndsAt, product?.isOnSale, activePromo]);

  const currentPrice = React.useMemo(() => {
    let price = getProductPrice(product, selectedGsm);
    if (!product.isOnSale && activePromo) {
      price = price * (1 - (activePromo.discountPercentage / 100));
    }
    return price;
  }, [product, selectedGsm, activePromo]);

  const activeImage = React.useMemo(() => {
    const colorGsmKey = `${selectedColor.name}-${selectedGsm}`;
    if (product.colorImages?.[colorGsmKey]) return product.colorImages[colorGsmKey];
    if (product.colorImages?.[selectedColor.name]) return product.colorImages[selectedColor.name];
    return product.mockupImage;
  }, [product, selectedColor, selectedGsm]);

  React.useEffect(() => {
    const fetchTags = async () => {
      if (product.aiTags && product.aiTags.length > 0) return;
      setLoadingTags(true);
      try {
        const generatedTags = await generateProductTags(product.name, product.category, product.description || '');
        setTags(generatedTags);
        await updateDoc(doc(db, 'products', product.id), { aiTags: generatedTags });
      } catch (error) {
        console.error('Failed to generate/save tags:', error);
      } finally {
        setLoadingTags(false);
      }
    };
    if (product.name && (!product.aiTags || product.aiTags.length === 0)) {
      fetchTags();
    }
  }, [product.id, product.name, product.category, product.description, product.aiTags]);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    addItem({
      id: product.id,
      name: product.name,
      price: currentPrice,
      quantity: 1,
      image: activeImage,
      category: product.category,
      gsm: selectedGsm,
      size: 'L', // Default size for quick add
      color: selectedColor.name
    });
    
    toast.success('Sanctified: Blueprint added to Cart', {
      icon: '🏛️',
      style: {
        background: '#000',
        color: '#F27D26',
        border: '1px solid #F27D26'
      }
    });
  };

  const shareUrl = `${window.location.origin}/product/${product.id}`;
  const shareText = `Explore the ${product.name} blueprint on Kings Clothing. Authentic Accra Heritage.`;

  const socialLinks = [
    { name: 'WhatsApp', icon: MessageCircle, href: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, color: 'hover:text-[#25D366]' },
    { name: 'X', icon: Twitter, href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, color: 'hover:text-white' },
    { name: 'Facebook', icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, color: 'hover:text-[#1877F2]' }
  ];

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowShareMenu(!showShareMenu);
  };

  const handleSaveGsmPrices = async () => {
    setIsSaving(true);
    try {
      const updatedGsmPrices: Record<string, number> = {};
      Object.entries(gsmPrices).forEach(([key, value]) => {
        if (value && !isNaN(Number(value))) {
          updatedGsmPrices[key] = Number(value);
        }
      });

      const productRef = doc(db, 'products', product.id);
      await updateDoc(productRef, {
        gsmPrices: updatedGsmPrices
      });

      toast.success('GSM Pricing Synchronized');
      setIsGsmModalOpen(false);
      // Note: In a real app, we'd rely on real-time listener or state lift to refresh
    } catch (error) {
      console.error('Failed to update GSM prices:', error);
      toast.error('Sync Protocol Failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative"
    >
      <Link 
        to={`/product/${product.id}?gsm=${selectedGsm}&color=${selectedColor.name}`} 
        className="block space-y-6"
        {...getPreloadHandlers(product)}
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-[#1A1A1B] group-hover:shadow-[0_0_50px_rgba(242,125,38,0.1)] transition-all duration-700">
          <div className="relative w-full h-full">
            <EnhancedImage 
              src={activeImage} 
              alt={product.name} 
              className="grayscale brightness-75 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-1000 group-hover:scale-105"
            />
            
            {/* Color Dye Filter (if no specific image exists) */}
            {!product.colorImages?.[selectedColor.name] && !product.colorImages?.[`${selectedColor.name}-${selectedGsm}`] && (
              <div 
                className="absolute inset-0 pointer-events-none mix-blend-multiply transition-colors duration-700" 
                style={{ 
                  backgroundColor: selectedColor.hex,
                  opacity: selectedColor.name === 'Noir Black' ? 0.8 : 0.4
                }} 
              />
            )}
          </div>
          
          <div className="absolute top-6 left-6 p-1 bg-background/50 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
             <div className="px-3 py-1 flex items-center space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <p className="text-[8px] font-black uppercase tracking-widest text-white">
                  {product.category}{product.gender ? ` • ${product.gender}` : ' • unisex'}
                </p>
                {isNew && (
                  <span className="ml-2 bg-accent text-black text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">NEW</span>
                )}
                {product.isOnSale && (
                  <span className="ml-2 bg-red-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter animate-pulse">SALE</span>
                )}
                {!product.outOfStock && (product.salesCount || 0) >= 3 && (
                  <span className="ml-2 bg-[#FF5A1F] text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter animate-pulse">LIMITED INVENTORY</span>
                )}
                {product.outOfStock && (
                  <span className="ml-2 bg-red-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">OUT OF STOCK</span>
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

          <div className="absolute top-6 right-6 flex flex-col items-end gap-3 z-20">
             {!product.outOfStock && (
               <button 
                 onClick={handleQuickAdd}
                 className="w-10 h-10 rounded-full bg-accent text-black flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 duration-300"
                 title="Quick Add to Cart"
               >
                  <Plus className="w-5 h-5 font-black" />
               </button>
             )}

             <button 
               onClick={(e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 setIsQuickViewOpen(true);
               }}
               className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl text-white flex items-center justify-center shadow-xl hover:bg-white/20 hover:scale-110 active:scale-95 transition-all opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 duration-300"
               title="Quick View Blueprint"
             >
                <Eye className="w-4 h-4" />
             </button>

             <div className="relative flex flex-col items-end">
                <AnimatePresence>
                  {showShareMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, x: 20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.8, x: 20 }}
                      className="absolute right-12 top-0 flex items-center gap-2 bg-black/80 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-2xl"
                    >
                      {socialLinks.map((social) => (
                        <a
                          key={social.name}
                          href={social.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className={cn("p-2 transition-colors", social.color)}
                          title={`Share to ${social.name}`}
                        >
                          <social.icon className="w-4 h-4" />
                        </a>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <button 
                  onClick={handleShare}
                  className={cn(
                    "w-10 h-10 rounded-full border border-white/10 flex items-center justify-center backdrop-blur-xl transition-all",
                    showShareMenu ? "bg-accent text-black border-accent" : "hover:border-accent/40 text-white/20 hover:text-accent"
                  )}
                  title="Share Blueprint"
                >
                   {showShareMenu ? <CloseIcon className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                </button>
             </div>

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

        <div className="px-2 space-y-4">
          {/* Color Swatches */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {availableColors.map((color) => (
              <button
                key={color.name}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedColor(color);
                }}
                className={cn(
                  "relative w-6 h-6 rounded-full border-2 transition-all p-0.5 shrink-0",
                  selectedColor.name === color.name ? "border-accent scale-110" : "border-white/10 hover:border-white/30"
                )}
                title={color.name}
              >
                <div 
                  className="w-full h-full rounded-full" 
                  style={{ backgroundColor: color.hex }}
                />
                {selectedColor.name === color.name && (
                   <motion.div 
                     layoutId="color-marker"
                     className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full border border-black"
                   />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-2">
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
            {!product.outOfStock && (product.salesCount || 0) >= 3 && (
              <p className="text-[7px] font-black uppercase tracking-widest text-[#FF5A1F] flex items-center gap-1 mt-1 animate-pulse">
                <Clock className="w-2.5 h-2.5" />
                <span>Secure blueprint: only {Math.max(1, 15 - (product.salesCount || 0))} left in registry</span>
              </p>
            )}
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
                 <motion.div 
                   initial={{ opacity: 0, y: 20, scale: 1 }}
                   animate={{ opacity: 1, y: 0 }}
                   whileHover={{ scale: 1.05 }}
                   transition={{
                     default: { duration: 0.4, ease: "easeOut" },
                     scale: { type: "spring", stiffness: 400, damping: 15 }
                   }}
                   className="product-price-container flex flex-col items-end cursor-pointer"
                 >
                    {((product.isOnSale && product.salePrice) || (!product.isOnSale && activePromo)) && (
                       <p className="text-[10px] font-mono font-bold text-white/20 line-through tracking-tighter">
                         {formatGHC(getProductPrice({ ...product, isOnSale: false }, selectedGsm))}
                       </p>
                    )}
                    <p className="text-accent font-mono font-black text-sm md:text-lg tracking-tighter">
                      {formatGHC(currentPrice)}
                    </p>
                 
                     {timeRemaining && timeRemaining !== 'Expired' && (
                        <span className="flex items-center gap-1 mt-1.5 bg-accent/20 border border-accent/40 px-2 py-0.5 rounded-full text-[8px] font-mono font-bold text-accent tracking-tighter animate-pulse select-none" title="Active promo campaign end countdown">
                          <Clock className="w-2.5 h-2.5 text-accent animate-spin [animation-duration:8s]" />
                          <span>{timeRemaining}</span>
                        </span>
                     )}</motion.div>
                 {isAdmin && onUpdatePrice && (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsGsmModalOpen(true);
                        }}
                        className="p-1 hover:text-accent text-white/20 transition-all scale-0 group-hover:scale-100"
                        title="Manage GSM Pricing"
                      >
                        <Settings2 className="w-3 h-3" />
                      </button>
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
                    </div>
                 )}
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* GSM Pricing Management Modal */}
      <AnimatePresence>
        {isGsmModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-[#1A1A1B] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-accent" />
              
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white mb-1">GSM Pricing</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Custom weight architecture for {product.name}</p>
                </div>
                <button 
                  onClick={() => setIsGsmModalOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6 mb-10">
                {['230', '260', '320'].map((gsm) => (
                  <div key={gsm} className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-accent flex items-center gap-2">
                      <div className="w-1 h-1 bg-accent rounded-full" />
                      {gsm} GSM Blueprint Price
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 font-mono text-sm group-focus-within:text-accent transition-colors">GHS</div>
                      <input
                        type="number"
                        value={gsmPrices[gsm]}
                        onChange={(e) => setGsmPrices({ ...gsmPrices, [gsm]: e.target.value })}
                        placeholder={(PRICING as any)[product.category]?.[gsm] || '150'}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-4 text-white font-mono placeholder:text-white/10 focus:border-accent focus:bg-accent/5 transition-all outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setIsGsmModalOpen(false)}
                  className="flex-1 py-4 bg-white/5 text-white/40 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-white/10 hover:text-white transition-all"
                >
                  Abort Protocol
                </button>
                <button
                  onClick={handleSaveGsmPrices}
                  disabled={isSaving}
                  className="flex-1 py-4 bg-accent text-black font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-white transition-all flex items-center justify-center gap-2 shadow-xl shadow-accent/20 disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Commit Changes
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick View Modal */}
      <AnimatePresence>
        {isQuickViewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 md:p-8"
            onClick={() => setIsQuickViewOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-5xl bg-[#0A0A0B] border border-white/5 rounded-[3rem] shadow-[0_0_100px_rgba(242,125,38,0.05)] overflow-hidden flex flex-col md:flex-row relative"
            >
              {/* Close Button */}
              <button 
                onClick={() => setIsQuickViewOpen(false)}
                className="absolute top-6 right-6 z-30 p-3 bg-white/5 hover:bg-accent hover:text-black rounded-2xl transition-all border border-white/5 text-white/40"
              >
                <CloseIcon className="w-5 h-5" />
              </button>

              {/* Product Visual Identity */}
              <div className="w-full md:w-1/2 aspect-square md:aspect-auto relative overflow-hidden bg-black flex items-center justify-center group/visual">
                <AnimatePresence mode="wait">
                  <EnhancedImage
                    key={activeImage}
                    src={activeImage}
                    alt={product.name}
                    className="grayscale brightness-50 group-hover/visual:grayscale-0 group-hover/visual:brightness-100 transition-all duration-1000"
                    aspectRatio="aspect-auto h-full w-full"
                  />
                </AnimatePresence>
                
                {/* Visual Overlays */}
                <div className="absolute inset-x-0 bottom-0 p-12 bg-gradient-to-t from-black via-black/50 to-transparent">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-[1px] bg-accent/50" />
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">Blueprint Visualized</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                       {tags.map((tag, i) => (
                         <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[8px] font-black uppercase tracking-widest text-white/40">
                           {tag}
                         </span>
                       ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Intelligence */}
              <div className="w-full md:w-1/2 p-8 md:p-14 flex flex-col justify-center space-y-12 overflow-y-auto max-h-[70vh] md:max-h-none scrollbar-hide">
                <div className="space-y-4">
                  <div className="inline-flex items-center space-x-3 px-4 py-2 bg-accent/10 border border-accent/20 rounded-xl">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">{product.category} COLLECTION</span>
                  </div>
                  
                  <h2 className="text-4xl md:text-6xl font-display font-black uppercase italic tracking-tighter text-white leading-[0.9]">
                    {product.name}
                  </h2>
                </div>

                <div className="space-y-8">
                  {/* Performance Specs */}
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/20">Accession Price</p>
                      <p className="text-3xl font-mono font-black text-accent">{formatGHC(currentPrice)}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/20">Fabric Protocol</p>
                      <p className="text-xl font-black text-white italic">{selectedGsm} GSM Cotton</p>
                    </div>
                  </div>

                  {/* Blueprint Description */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-white/10 rounded-sm" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Structural Notes</p>
                    </div>
                    <p className="text-sm font-medium text-white/50 leading-relaxed max-w-lg">
                      {product.description || "A masterwork of Accra craftsmanship, engineered for the modern vanguard. Every thread reflects heritage, every seam defines excellence."}
                    </p>
                  </div>

                  {/* Configuration Controls */}
                  <div className="space-y-8 pt-4">
                    {/* Color Spectrum */}
                    <div className="space-y-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">Dye Profile</p>
                      <div className="flex flex-wrap gap-3">
                        {availableColors.map((color) => (
                          <button
                            key={color.name}
                            onClick={() => setSelectedColor(color)}
                            className={cn(
                              "w-8 h-8 rounded-full border-2 transition-all p-1",
                              selectedColor.name === color.name ? "border-accent scale-110 shadow-[0_0_15px_rgba(242,125,38,0.3)]" : "border-white/5 hover:border-white/30"
                            )}
                            title={color.name}
                          >
                            <div className="w-full h-full rounded-full" style={{ backgroundColor: color.hex }} />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Weight Options */}
                    {gsmOptions.length > 1 && (
                      <div className="space-y-4">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">GSM Intensity</p>
                        <div className="flex gap-2">
                          {gsmOptions.map(gsm => (
                            <button
                              key={gsm}
                              onClick={() => setSelectedGsm(gsm)}
                              className={cn(
                                "flex-1 py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                                selectedGsm === gsm 
                                  ? "bg-accent text-black border-accent" 
                                  : "bg-white/5 text-white/40 border-white/5 hover:border-white/20 hover:text-white"
                              )}
                            >
                              {gsm}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Final Authorization */}
                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row gap-4">
                  {product.outOfStock ? (
                    <Link
                      to={`/product/${product.id}?gsm=${selectedGsm}&color=${selectedColor.name}`}
                      className="flex-[2] py-6 bg-red-500/10 border border-red-500/20 text-red-500 font-black uppercase text-xs tracking-[0.2em] rounded-3xl hover:bg-red-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-2"
                    >
                      <span>Out Of Stock - Join Notify Queue</span>
                    </Link>
                  ) : (
                    <button
                      onClick={handleQuickAdd}
                      className="flex-[2] py-6 bg-accent text-black font-black uppercase text-xs tracking-[0.3em] rounded-3xl hover:bg-white hover:scale-[1.02] active:scale-95 transition-all shadow-[0_20px_50px_rgba(242,125,38,0.2)] flex items-center justify-center space-x-3"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Authorize Acquisition</span>
                    </button>
                  )}
                  <Link
                    to={`/product/${product.id}?gsm=${selectedGsm}&color=${selectedColor.name}`}
                    className="flex-1 py-6 bg-white/5 text-white font-black uppercase text-[10px] tracking-widest rounded-3xl hover:bg-white/10 flex items-center justify-center border border-white/5"
                  >
                    Details
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
