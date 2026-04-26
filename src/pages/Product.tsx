import { useState, useMemo, useEffect, FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ShoppingCart, 
  Zap, 
  ShieldCheck, 
  Truck, 
  Maximize2, 
  Share2,
  RefreshCw,
  Phone,
  ChevronRight,
  ShoppingBag,
  X,
  Facebook,
  Twitter,
  MessageCircle,
  Link as LinkIcon,
  Wand2,
  Star,
  MessageSquare,
  Grid3X3,
  Camera,
  Wind,
  Layers
} from 'lucide-react';
import { doc, getDoc, addDoc, collection, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { useCart } from '../lib/CartContext';
import { CATEGORIES, PRICING, FABRIC_COLORS, SIZES, DEPOSIT_PERCENTAGE, MOMO_NUMBER } from '@/src/constants';
import { formatGHC, cn } from '@/src/lib/utils';
import { toast } from 'react-hot-toast';
import { GSM } from '@/src/types';

import { useRecentlyViewed } from '../hooks/useRecentlyViewed';

const ProductSkeleton = () => (
  <div className="bg-background min-h-screen py-16 md:py-24 px-4 sm:px-6 lg:px-8 animate-pulse">
    <div className="max-w-7xl mx-auto">
      <div className="h-4 w-48 bg-white/5 rounded-full mb-20" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-start">
        <div className="lg:col-span-7 lg:sticky lg:top-24 space-y-10">
          <div className="aspect-[4/5] bg-white/5 rounded-[3.5rem]" />
          <div className="flex justify-center space-x-4">
            <div className="w-20 h-24 bg-white/5 rounded-2xl" />
            <div className="w-20 h-24 bg-white/5 rounded-2xl" />
          </div>
        </div>
        <div className="lg:col-span-5 space-y-12">
          <div className="space-y-8">
            <div className="h-4 w-24 bg-accent/10 rounded-full" />
            <div className="h-32 w-full bg-white/5 rounded-3xl" />
            <div className="space-y-4">
              <div className="h-4 w-full bg-white/5 rounded-full" />
              <div className="h-4 w-5/6 bg-white/5 rounded-full" />
            </div>
          </div>
          <div className="h-56 w-full bg-white/5 rounded-[3rem]" />
          <div className="space-y-8">
            <div className="h-32 w-full bg-white/5 rounded-3xl" />
            <div className="flex gap-4">
              <div className="h-20 flex-1 bg-white/5 rounded-full" />
              <div className="h-20 flex-1 bg-white/5 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const GSM_PROFILES: Record<string, { label: string; sub: string; icon: any }> = {
  '230': { 
    label: 'Precision', 
    sub: 'Structural Efficiency',
    icon: Wind
  },
  '260': { 
    label: 'Standard', 
    sub: 'Command Presence',
    icon: Layers
  },
  '320': { 
    label: 'Armor', 
    sub: 'Ultima Weight',
    icon: ShieldCheck
  },
  'standard': { 
    label: 'Standard', 
    sub: 'Factory Grade',
    icon: Layers
  }
};

export function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isBrandOwner } = useAuth();
  const { addItem } = useCart();
  const { addProduct } = useRecentlyViewed();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'mockup' | 'studio'>('studio');
  const [selectedGsm, setSelectedGsm] = useState<GSM>('260');
  const [selectedColor, setSelectedColor] = useState(FABRIC_COLORS[0]);
  const [selectedSize, setSelectedSize] = useState('L');
  const [isOrdering, setIsOrdering] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedDescription, setEnhancedDescription] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [referralId, setReferralId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    if (!id) return;
    const q = query(collection(db, 'products', id, 'reviews'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [id]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
  }, [reviews]);

  useEffect(() => {
    if (!id) return;
    setImageLoading(true); // Reset image loading on ID change
    const fetchProduct = async () => {
      try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const fetchedProduct = { id: docSnap.id, ...docSnap.data() };
          setProduct(fetchedProduct);
          addProduct(docSnap.id);
        } else {
          // Fallback if not in DB yet (for dev)
          const fallbackProduct = {
            id: id,
            name: "The Dynasty Tee",
            category: "T-Shirts",
            description: "Our signature heavyweight tee, featuring a reinforced collar and premium stitching. Designed for the leaders who refuse to settle.",
            mockupImage: "https://picsum.photos/seed/k1/800/1000",
            studioImage: "https://picsum.photos/seed/studio/800/1000",
            gsmOptions: ['230', '260', '320']
          };
          setProduct(fallbackProduct);
          addProduct(id);
        }
      } catch (error) {
        toast.error('Failed to load product');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();

    // Capture referral ID
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferralId(ref);
      sessionStorage.setItem('last_referral_id', ref);
    } else {
      const storedRef = sessionStorage.getItem('last_referral_id');
      if (storedRef) setReferralId(storedRef);
    }
  }, [id, navigate]);

  const price = useMemo(() => {
    if (!product) return 0;
    
    // 1. Check for gsmPrices on the product itself (custom designs)
    if (product.gsmPrices && product.gsmPrices[selectedGsm]) {
      return product.gsmPrices[selectedGsm];
    }

    // 2. Fallback to global PRICING constants
    const globalCategoryPricing = (PRICING as any)[product.category];
    
    if (globalCategoryPricing) {
      if (typeof globalCategoryPricing === 'object') {
        return globalCategoryPricing[selectedGsm] || globalCategoryPricing['260'] || 150;
      }
      return globalCategoryPricing;
    }

    return 180; // Absolute fallback
  }, [product, selectedGsm]);

  const deposit = price * DEPOSIT_PERCENTAGE;
  const balance = price - deposit;

  const availableColors = useMemo(() => {
    if (product?.allowedColors && Array.isArray(product.allowedColors) && product.allowedColors.length > 0) {
      return FABRIC_COLORS.filter(color => product.allowedColors.includes(color.name));
    }
    return FABRIC_COLORS;
  }, [product]);

  // Set initial color when product or available colors change
  useEffect(() => {
    if (availableColors.length > 0) {
      const currentExists = availableColors.find(c => c.name === selectedColor.name);
      if (!currentExists) {
        setSelectedColor(availableColors[0]);
      }
    }
  }, [availableColors, product]);

  const activeImage = useMemo(() => {
    if (!product) return '';
    
    if (viewMode === 'studio') {
      // 1. High Priority Match: Colour-specific studio shot from the ledger
      if (product.colorStudioImages?.[selectedColor.name]) {
        return product.colorStudioImages[selectedColor.name];
      }
      
      return product.studioImage;
    }

    // Mockup Mode (Blueprint)
    // 2. Secondary Match: Colour-specific pre-rendered mockup
    if (product.colorImages?.[selectedColor.name]) {
      return product.colorImages[selectedColor.name];
    }

    // 3. Authority Directive: Fallback to neutral blueprint with CSS color injection
    return product.mockupImage;
  }, [product, selectedColor, viewMode]);

  // Sync view mode indicator with selected shade asset availability
  useEffect(() => {
    setImageLoading(true); // Trigger loading for any asset transition
    if (product?.colorStudioImages?.[selectedColor.name]) {
      setViewMode('studio');
    } else {
      setViewMode('mockup');
    }
  }, [selectedColor, product]);

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      id: product.id,
      name: product.name,
      price: price,
      image: activeImage,
      size: selectedSize,
      color: selectedColor.name,
      gsm: selectedGsm,
      quantity: quantity,
      category: product.category,
    });
    toast.success(`Success: ${product.name} (x${quantity}) locked into cart`);
  };

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to authority ledger');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const sharePlatforms = [
    { 
      name: 'WhatsApp', 
      icon: MessageCircle, 
      color: 'hover:text-green-500 hover:bg-green-500/10 hover:border-green-500/20',
      href: `https://wa.me/?text=${encodeURIComponent(`Check out ${product?.name} from Kings Clothing: ${window.location.href}`)}` 
    },
    { 
      name: 'Twitter', 
      icon: Twitter, 
      color: 'hover:text-sky-400 hover:bg-sky-400/10 hover:border-sky-400/20',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Forging new authority with ${product?.name} from Kings Clothing.`) }&url=${encodeURIComponent(window.location.href)}` 
    },
    { 
      name: 'Facebook', 
      icon: Facebook, 
      color: 'hover:text-blue-600 hover:bg-blue-600/10 hover:border-blue-600/20',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}` 
    },
  ];

  const handleEnhanceDescription = async () => {
    if (!product) return;
    setIsEnhancing(true);

    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('AI API Key not configured');
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `
        You are a high-end luxury streetwear copywriter for "Kings Clothing Brand". 
        Your mission is to forge a unique, commanding product narrative for "${product.name}".
        
        Product Details:
        - Category: ${product.category}
        - Fabric Shade: ${selectedColor.name}
        - Structural Sizing: ${selectedSize}
        - Fabric Weight: ${selectedGsm} GSM
        - Base Blueprint: ${product.description}
        
        Brand Guidelines:
        - Theme: "Ghanaian Craftsmanship" (soul of Accra, precision of heritage) meets "Streetwear Authority" (unapologetic leadership).
        - Vocabulary: Architectural, authoritative, evocative, rhythmic.
        - Length: Exactly one punchy, high-impact paragraph (approx 40-60 words).
        - Goal: Make the customer feel like they are commissioning a royal asset.
        
        Note: Specifically reference the color "${selectedColor.name}" and the "${selectedGsm} GSM" weight to make the narrative feel custom-forged for this specific selection.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      if (response.text) {
        setEnhancedDescription(response.text.trim());
        toast.success('Narrative Forged');
        
        // Authority Directive: Focus the viewport on the newly forged narrative
        setTimeout(() => {
          const section = document.getElementById('ai-narrative-section');
          if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      }
    } catch (error: any) {
      console.error('Enhancement Error:', error);
      toast.error('Failed to forge narrative');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      toast.error('Please sign in to order');
      navigate('/auth');
      return;
    }

    setIsOrdering(true);
    try {
      const orderData = {
        customerId: user.uid,
        customerName: user.displayName,
        items: [{
          productId: product.id,
          name: product.name,
          gsm: selectedGsm,
          color: selectedColor.name,
          size: selectedSize,
          price: price,
          quantity: quantity
        }],
        totalAmount: price * quantity,
        depositAmount: deposit * quantity,
        status: 'pending',
        referralAgentId: referralId || null,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      toast.success('Order Initialized!');
      navigate(`/order/${docRef.id}`);

    } catch (error: any) {
      toast.error('Order failed: ' + error.message);
    } finally {
      setIsOrdering(false);
    }
  };

  const handleSubmitReview = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Identity Verification Required');
      return;
    }
    if (!newComment.trim()) return;

    setIsSubmittingReview(true);
    try {
      await addDoc(collection(db, 'products', id!, 'reviews'), {
        userId: user.uid,
        userName: user.displayName || 'Anonymous King',
        rating: newRating,
        comment: newComment,
        createdAt: serverTimestamp()
      });
      setNewComment('');
      setNewRating(5);
      toast.success('Review Injected into Ledger');
    } catch (error: any) {
      toast.error('Submission failed');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading) return <ProductSkeleton />;
  if (!product) return null;

  if (product.isPrivate && !isBrandOwner) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8 text-center space-y-6 bg-background">
         <ShieldCheck className="w-16 h-16 text-accent animate-pulse" />
         <h1 className="text-4xl font-display font-black uppercase italic tracking-tighter text-white">Access <br/> Restricted</h1>
         <p className="text-white/40 uppercase font-black tracking-widest text-[10px] max-w-xs leading-relaxed">
            This asset belongs to the Private Collection. Only the Brand Owner has authorization to view this blueprint.
         </p>
         <Link to="/shop" className="mt-8 bg-white text-black px-12 py-5 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-accent transition-all">
            Return to Public Catalog
         </Link>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen py-16 md:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        <nav className="flex items-center space-x-3 text-[9px] font-black uppercase tracking-editorial text-white/30 mb-20 px-2 lg:px-0">
          <Link to="/" className="hover:text-accent transition-colors">Origins</Link>
          <ChevronRight className="w-2.5 h-2.5" />
          <Link to="/shop" className="hover:text-accent transition-colors">Collection</Link>
          <ChevronRight className="w-2.5 h-2.5" />
          <span className="text-white/60">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-start">
          {/* Left: Image Gallery (Span 7) - Sticky on Desktop */}
          <div className="lg:col-span-7 lg:sticky lg:top-24 space-y-10">
            <div 
              className="relative aspect-[4/5] overflow-hidden rounded-[3rem] bg-[#1A1A1B] shadow-[0_0_80px_rgba(0,0,0,0.5)] cursor-zoom-in group/main"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                setMousePos({ x, y });
              }}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => {
                setIsHovering(false);
                setMousePos({ x: 50, y: 50 }); // Reset to center
              }}
              onClick={() => setIsFullScreen(true)}
            >
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0F0F10] z-30 transition-all duration-700">
                  <div className="relative">
                    <motion.div 
                      animate={{ 
                        rotate: 360,
                        scale: [1, 1.1, 1],
                      }}
                      transition={{ 
                        rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                        scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                      }}
                      className="w-24 h-24 border-4 border-accent/10 border-t-accent rounded-full"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <RefreshCw className="w-8 h-8 text-accent animate-spin" />
                    </div>
                  </div>
                  <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center space-y-2">
                     <p className="text-[10px] font-black uppercase tracking-[0.5em] text-accent animate-pulse">Syncing Asset</p>
                     <p className="text-[7px] font-black uppercase tracking-widest text-white/20 italic">Resolving High-Def Blueprint</p>
                  </div>
                </div>
              )}
              <AnimatePresence mode="wait">
                <motion.div
                  key={viewMode + selectedColor.name} // Include color in key for fresh transitions
                  className="w-full h-full relative"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.img
                    src={activeImage}
                    onLoad={() => setImageLoading(false)}
                    alt={product.name}
                    className="w-full h-full object-cover transition-all duration-300 ease-out"
                    style={{
                      transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
                      scale: isHovering ? 1.8 : 1,
                      filter: isHovering ? 'grayscale(0) brightness(1)' : 'grayscale(0.5) brightness(0.9)'
                    }}
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Digital Fabric Dye Overlay - Activates when no color-specific image assets are detected in the ledger */}
                  {!product.colorStudioImages?.[selectedColor.name] && !product.colorImages?.[selectedColor.name] && (
                    <motion.div 
                      key={`overlay-${selectedColor.name}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: selectedColor.name === 'Noir Black' ? 0.8 : 0.4 }}
                      className="absolute inset-0 pointer-events-none mix-blend-multiply transition-colors duration-700"
                      style={{ backgroundColor: selectedColor.hex }}
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Zoom Trigger Button Overlay */}
              <div className="absolute top-8 right-8 z-20 opacity-0 group-hover/main:opacity-100 transition-opacity">
                <div className="bg-background/40 backdrop-blur-xl p-4 rounded-2xl border border-white/10 text-white">
                  <Maximize2 className="w-5 h-5" />
                </div>
              </div>

              {/* View Mode Toggle - Architectural Style */}
              <div className="absolute top-1/2 -translate-y-1/2 left-8 flex flex-col gap-3 py-4 z-20">
                <div className="flex flex-col gap-2 p-1.5 glass rounded-2xl border border-white/10 shadow-2xl">
                  <button
                    onClick={() => setViewMode('mockup')}
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-all group/btn",
                      viewMode === 'mockup' ? "bg-accent text-black scale-105" : "text-white/30 hover:text-white hover:bg-white/5"
                    )}
                    title="Mockup Mode"
                  >
                    <Grid3X3 className="w-5 h-5" />
                    <span className="absolute left-full ml-4 px-3 py-1 bg-black/80 backdrop-blur-xl border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-white opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-all whitespace-nowrap">
                      Blueprint Mode
                    </span>
                  </button>
                  <button
                    onClick={() => setViewMode('studio')}
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-all group/btn",
                      viewMode === 'studio' ? "bg-accent text-black scale-105" : "text-white/30 hover:text-white hover:bg-white/5"
                    )}
                    title="Studio Mode"
                  >
                    <Camera className="w-5 h-5" />
                    <span className="absolute left-full ml-4 px-3 py-1 bg-black/80 backdrop-blur-xl border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-white opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-all whitespace-nowrap">
                      Studio Calibration
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Thumbnail Gallery */}
            {product.studioImage && (
              <div className="flex justify-center space-x-4">
                <button 
                  onClick={() => setViewMode('mockup')}
                  className={cn(
                    "w-20 h-24 rounded-2xl overflow-hidden border-2 transition-all duration-500 relative group/thumb",
                    viewMode === 'mockup' ? "border-accent shadow-lg scale-105" : "border-white/5 opacity-40 hover:opacity-100 hover:border-white/20"
                  )}
                >
                  <img 
                    src={product.colorImages?.[selectedColor.name] || product.mockupImage} 
                    alt="Mockup" 
                    className="w-full h-full object-cover transition-transform group-hover/thumb:scale-110" 
                    referrerPolicy="no-referrer" 
                  />
                  <div className="absolute inset-x-0 bottom-0 py-1 bg-black/60 text-center">
                    <span className="text-[6px] font-black uppercase tracking-widest text-white">Blueprint</span>
                  </div>
                </button>
                <button 
                  onClick={() => setViewMode('studio')}
                  className={cn(
                    "w-20 h-24 rounded-2xl overflow-hidden border-2 transition-all duration-500 relative group/thumb",
                    viewMode === 'studio' ? "border-accent shadow-lg scale-105" : "border-white/5 opacity-40 hover:opacity-100 hover:border-white/20"
                  )}
                >
                  <img 
                    src={product.colorStudioImages?.[selectedColor.name] || product.studioImage} 
                    alt="Studio" 
                    className="w-full h-full object-cover transition-transform group-hover/thumb:scale-110" 
                    referrerPolicy="no-referrer" 
                  />
                  <div className="absolute inset-x-0 bottom-0 py-1 bg-black/60 text-center">
                    <span className="text-[6px] font-black uppercase tracking-widest text-white">Studio</span>
                  </div>
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6 pt-4">
               <div className="glass p-6 rounded-3xl flex items-center space-x-4">
                  <div className="bg-accent/10 p-3 rounded-2xl">
                    <ShieldCheck className="w-5 h-5 text-accent" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-editorial text-white/60 leading-tight">Heavyweight<br/>Quality Guard</span>
               </div>
               <div className="glass p-6 rounded-3xl flex items-center space-x-4">
                  <div className="bg-accent/10 p-3 rounded-2xl">
                    <Truck className="w-5 h-5 text-accent" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-editorial text-white/60 leading-tight">Accra Region<br/>Verified Ship</span>
               </div>
            </div>
          </div>

          {/* Right: Info & Config (Span 5) */}
          <div className="lg:col-span-5 flex flex-col pt-4">
            <div className="mb-12 relative">
              <span className="text-accent text-[10px] font-black uppercase tracking-editorial mb-4 block">
                  {product.category} Series
              </span>
              <h1 className="text-6xl md:text-8xl font-display font-black tracking-tighter uppercase italic leading-[0.8] mb-8 relative z-10">
                {product.name}
              </h1>
              <div className="absolute top-0 right-0 opacity-5 pointer-events-none -translate-y-1/2">
                 <span className="text-[120px] font-display font-black uppercase italic tracking-tighter">KNGS</span>
              </div>
              <p className="text-white/40 text-lg leading-relaxed font-light font-sans max-w-md">
                {product.description}
              </p>

              {/* Social Sharing Section */}
              <div className="mt-12 flex flex-col space-y-4">
                <div className="flex items-center space-x-3">
                  <Share2 className="w-3 h-3 text-accent" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Broadcast Authority</span>
                </div>
                <div className="flex items-center space-x-4">
                  {sharePlatforms.map((platform) => (
                    <motion.a
                      key={platform.name}
                      href={platform.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.1, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 transition-all",
                        platform.color
                      )}
                      title={`Share on ${platform.name}`}
                    >
                      <platform.icon className="w-5 h-5" />
                    </motion.a>
                  ))}
                  <motion.button
                    onClick={copyToClipboard}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-accent hover:border-accent/40 transition-all"
                    title="Copy Link to Clipboard"
                  >
                    <LinkIcon className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>

              {/* AI Narrative Button (Simplified) */}
              <div className="mt-8">
                 <AnimatePresence mode="wait">
                    {isEnhancing ? (
                       <motion.div 
                         key="enhancing"
                         initial={{ opacity: 0, scale: 0.95 }}
                         animate={{ opacity: 1, scale: 1 }}
                         exit={{ opacity: 0, scale: 1.05 }}
                         className="p-10 rounded-[2.5rem] border-2 border-accent bg-accent/5 backdrop-blur-xl relative overflow-hidden group/enhancing shadow-[0_0_50px_rgba(242,125,38,0.1)]"
                       >
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                             <Wand2 className="w-24 h-24 text-accent" />
                          </div>
                          <div className="relative z-10 flex items-center space-x-8">
                             <div className="relative">
                                <motion.div 
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                  className="w-16 h-16 border-4 border-dashed border-accent rounded-full"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                   <RefreshCw className="w-6 h-6 text-accent animate-spin" />
                                </div>
                             </div>
                             <div className="space-y-2">
                                <h4 className="text-sm font-black uppercase tracking-editorial italic text-accent">Neural Engine Active</h4>
                                <div className="flex items-center space-x-2">
                                   <div className="w-1.5 h-1.5 bg-accent rounded-full animate-ping" />
                                   <p className="text-[8px] font-black uppercase tracking-widest text-white/40 italic">Forging Ghanaian Streetwear Narrative...</p>
                                </div>
                             </div>
                          </div>
                          
                          <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5 overflow-hidden">
                             <motion.div 
                               initial={{ x: "-100%" }}
                               animate={{ x: "0%" }}
                               transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                               className="w-full h-full bg-gradient-to-r from-transparent via-accent to-transparent opacity-40"
                             />
                          </div>
                       </motion.div>
                    ) : !enhancedDescription ? (
                       <motion.button
                         key="btn"
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         onClick={handleEnhanceDescription}
                         className="flex items-center space-x-3 text-[10px] font-black uppercase tracking-[0.2em] text-accent hover:text-white transition-all group px-4 py-2 bg-accent/5 rounded-full hover:bg-accent/10"
                       >
                          <Wand2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                          <span>Forge Royal Narrative</span>
                       </motion.button>
                    ) : null}
                 </AnimatePresence>
              </div>
            </div>

            {/* View Architecture Switcher */}
            <div className="mb-12">
               <div className="flex items-center space-x-2 mb-4">
                  <Maximize2 className="w-3 h-3 text-accent" />
                  <span className="text-[10px] font-black uppercase tracking-editorial text-white/40">Visual Calibration</span>
               </div>
               <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5 space-x-1">
                  <button
                    onClick={() => setViewMode('mockup')}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                      viewMode === 'mockup' ? "bg-accent text-black shadow-xl" : "text-white/40 hover:text-white"
                    )}
                  >
                    <Grid3X3 className="w-3.5 h-3.5" />
                    Blueprint
                  </button>
                  <button
                    onClick={() => setViewMode('studio')}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                      viewMode === 'studio' ? "bg-accent text-black shadow-xl" : "text-white/40 hover:text-white"
                    )}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Studio Shot
                  </button>
               </div>
            </div>

            {/* Price Card */}
            <div className="mb-12 glass p-10 rounded-[3rem] relative overflow-hidden group hover:border-accent/40 transition-all duration-500">
               <div className="absolute top-0 right-0 w-1/3 h-full opacity-5 group-hover:opacity-10 transition-opacity">
                   <Zap className="w-full h-full text-white" strokeWidth={1} />
               </div>
               <div className="relative z-10">
                  <p className="text-[9px] uppercase font-black tracking-editorial text-white/30 mb-3">Investment</p>
                  <h2 className="text-6xl font-display font-black text-white italic tracking-tighter mb-8 group-hover:text-accent transition-colors">
                    {formatGHC(price)}
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/5">
                     <div className="space-y-1">
                        <p className="text-[10px] uppercase font-black text-white/20 tracking-widest">Deposit (50%)</p>
                        <p className="text-2xl font-display font-black text-accent">{formatGHC(deposit)}</p>
                     </div>
                     <div className="space-y-1">
                        <p className="text-[10px] uppercase font-black text-white/20 tracking-widest">Delivery (50%)</p>
                        <p className="text-2xl font-display font-black text-white/60 tracking-tighter">{formatGHC(balance)}</p>
                     </div>
                  </div>
               </div>
            </div>

            {/* Controls */}
            <div className="space-y-16">
              {/* GSM Selector */}
              {(product.category === 'T-Shirts' || (product.gsmOptions && product.gsmOptions.length > 1)) && (
                <div>
                   <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-2">
                        <ShieldCheck className="w-3 h-3 text-accent" />
                        <label className="text-[10px] font-black uppercase tracking-editorial text-white/40">Blueprint Weight (GSM)</label>
                      </div>
                      <span className="text-[8px] font-black text-accent uppercase tracking-widest italic">Industrial Grade</span>
                   </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {(product.gsmOptions || ['230', '260', '320']).map(gsm => {
                      const profile = GSM_PROFILES[gsm as string] || { label: gsm, sub: 'Specific Weight', icon: Layers };
                      const Icon = profile.icon;
                      const isActive = selectedGsm === gsm;

                      return (
                        <button
                          key={gsm}
                          onClick={() => setSelectedGsm(gsm as GSM)}
                          className={cn(
                            "group relative py-8 px-6 rounded-[2.5rem] border-2 transition-all duration-500 overflow-hidden flex flex-col items-center text-center",
                            isActive 
                              ? "border-accent bg-accent/5 shadow-[0_0_50px_rgba(242,125,38,0.15)] scale-105" 
                              : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10"
                          )}
                        >
                          {/* Background Accent */}
                          <div className={cn(
                            "absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 transition-opacity duration-700",
                            isActive ? "opacity-100" : "group-hover:opacity-50"
                          )} />
                          
                          <div className={cn(
                            "p-4 rounded-2xl mb-4 bg-white/5 border border-white/5 transition-all duration-500",
                            isActive ? "bg-accent/20 border-accent/20 scale-110" : "group-hover:scale-110"
                          )}>
                            <Icon className={cn(
                              "w-6 h-6 transition-all duration-500",
                              isActive ? "text-accent" : "text-white/20 group-hover:text-white/40"
                            )} />
                          </div>

                          <div className="relative z-10 space-y-1">
                            <span className={cn(
                              "block font-display font-black text-lg uppercase italic tracking-tighter transition-colors",
                              isActive ? "text-white" : "text-white/40 group-hover:text-white/60"
                            )}>
                              {profile.label}
                            </span>
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-black uppercase tracking-widest text-accent mb-1">
                                {gsm} GSM
                              </span>
                              <span className="text-[7px] font-black uppercase tracking-widest text-white/20 leading-none">
                                {profile.sub}
                              </span>
                            </div>
                          </div>

                          {isActive && (
                            <motion.div 
                              layoutId="gsm-active-highlight"
                              className="absolute bottom-0 left-0 right-0 h-1 bg-accent"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Color Swatches */}
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-6">
                    <label className="text-[10px] font-black uppercase tracking-editorial text-white/40">Fabric Shade</label>
                    <span className="text-[9px] font-black text-white italic tracking-widest uppercase">{selectedColor.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-5">
                    {availableColors.map(color => (
                      <button
                        key={color.name}
                        onClick={() => setSelectedColor(color)}
                        className={cn(
                          "w-14 h-14 rounded-full border-2 transition-all relative group flex items-center justify-center",
                          selectedColor.name === color.name ? "border-accent scale-110" : "border-white/10 hover:border-white/30"
                        )}
                      >
                        <div 
                          className="w-10 h-10 rounded-full shadow-inner relative flex items-center justify-center"
                          style={{ backgroundColor: color.hex }}
                        >
                           {selectedColor.name === color.name && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                              >
                                 <ShieldCheck className={cn(
                                   "w-4 h-4",
                                   color.name === 'Pure White' ? "text-black" : "text-white"
                                 )} />
                              </motion.div>
                           )}
                        </div>
                        {selectedColor.name === color.name && (
                           <div className="absolute -inset-1 border border-accent rounded-full animate-pulse" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Size Controls */}
                <div className="lg:min-w-[240px]">
                   <div className="flex justify-between items-center mb-6">
                      <label className="text-[10px] font-black uppercase tracking-editorial text-white/40">Structural Sizing</label>
                      <button className="text-[8px] font-black uppercase tracking-widest text-accent hover:underline decoration-accent/20 transition-all italic">Blueprint Specs</button>
                   </div>
                   <div className="flex flex-wrap gap-3">
                      {SIZES.map(size => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={cn(
                            "w-14 h-14 rounded-2xl border-2 transition-all font-black text-[12px] flex items-center justify-center tracking-tighter",
                            selectedSize === size 
                              ? "border-accent bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] scale-105" 
                              : "border-white/5 text-white/20 hover:border-white/40"
                          )}
                        >
                          {size}
                        </button>
                      ))}
                   </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-6 mt-20">
               <div className="flex items-center gap-4">
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-full p-2 h-[84px] w-48 shrink-0">
                     <button 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-12 h-12 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                     >
                        <X className="w-4 h-4 rotate-45" />
                     </button>
                     <div className="flex-1 text-center">
                        <span className="text-[14px] font-black font-mono text-white tracking-widest">{quantity.toString().padStart(2, '0')}</span>
                        <p className="text-[7px] font-black uppercase text-white/20 tracking-widest leading-none mt-1">Units</p>
                     </div>
                     <button 
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-12 h-12 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                     >
                        <X className="w-4 h-4" />
                     </button>
                  </div>
                  <button 
                    onClick={handleAddToCart}
                    className="flex-1 bg-white/5 border border-white/10 text-white/60 py-7 h-[84px] rounded-full font-black uppercase tracking-[0.3em] text-[11px] hover:bg-white/10 hover:text-white transition-all flex items-center justify-center space-x-3 group active:scale-95 shadow-xl"
                  >
                     <ShoppingCart className="w-5 h-5 transition-transform group-hover:scale-110" />
                     <span>Add to Cart</span>
                  </button>
               </div>
               <button 
                 onClick={handleBuyNow}
                 disabled={isOrdering}
                 className="w-full bg-white text-black py-7 rounded-full font-black uppercase tracking-[0.3em] text-[11px] hover:bg-accent transition-all flex items-center justify-center space-x-3 shadow-2xl disabled:opacity-50 group active:scale-95"
               >
                  {isOrdering ? <RefreshCw className="animate-spin w-5 h-5" /> : <Zap className="w-5 h-5 transition-transform group-hover:scale-110 group-hover:rotate-12" />}
                  <span>Initialize Build (Deposit)</span>
               </button>
            </div>

            {/* Meta Info */}
            <div className="mt-16 pt-10 border-t border-white/5 flex items-center justify-between">
               <div>
                  <p className="text-[9px] font-black uppercase tracking-editorial text-white/20 mb-1">Production Ethos</p>
                  <p className="text-[9px] text-white/40 italic font-medium uppercase tracking-tight">Authentic Ghanaian Streetwear Heritage.</p>
               </div>
               <div className="flex space-x-4">
                  <a 
                    href={`https://wa.me/${MOMO_NUMBER.replace(/\+/, '')}`} 
                    className="p-5 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all text-white/60 hover:text-accent group"
                  >
                     <Phone className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  </a>
                  <button 
                    onClick={handleShare}
                    className="p-5 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all text-white/60 hover:text-accent group"
                  >
                     <Share2 className="w-5 h-5" />
                  </button>
               </div>
            </div>
          </div>
        </div>

        {/* AI Enhanced Narrative Section */}
        <AnimatePresence>
          {enhancedDescription && (
            <motion.div 
              id="ai-narrative-section"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="mt-32 relative py-20 px-4 md:px-20 overflow-hidden rounded-[4rem] group"
            >
               <div className="absolute inset-0 bg-accent/5 backdrop-blur-3xl -z-10" />
               <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
               
               <div className="max-w-4xl mx-auto text-center space-y-10">
                  <div className="flex flex-col items-center space-y-4">
                     <div className="bg-accent/20 p-4 rounded-2xl">
                        <Wand2 className="w-6 h-6 text-accent" />
                     </div>
                     <span className="text-accent text-[10px] font-black uppercase tracking-[0.4em]">Royal Essence Archetype</span>
                  </div>

                  <h2 className="text-4xl md:text-6xl font-display font-black text-white italic tracking-tighter leading-tight">
                     "{enhancedDescription}"
                  </h2>

                  <div className="pt-10 flex flex-col items-center space-y-6">
                     <div className="h-px w-24 bg-accent/20" />
                     <p className="text-[9px] font-black uppercase tracking-widest text-white/40 max-w-xs leading-relaxed">
                        Forged through neural synthesis. This narrative represents the absolute streetwear authority of the Kings Clothing Brand.
                     </p>
                     <button 
                       onClick={() => setEnhancedDescription(null)}
                       className="text-[8px] font-black uppercase tracking-widest text-accent hover:text-white transition-colors"
                     >
                       Restore Original Blueprint
                     </button>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reviews Section */}
        <div className="mt-32 pt-20 border-t border-white/5">
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
              {/* Review Form (Terminal) */}
              <div className="lg:col-span-5">
                 <div className="glass p-10 rounded-[3rem] border border-white/5 space-y-10">
                    <div className="space-y-4">
                       <div className="flex items-center space-x-3">
                          <MessageSquare className="w-5 h-5 text-accent" />
                          <span className="text-accent text-[10px] font-black uppercase tracking-editorial">Citizen Feedback</span>
                       </div>
                       <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter text-white">Broadcast <br/> Sentiment</h2>
                       <p className="text-white/40 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                          Your authority matters. Rate the quality of this asset for the Kingdom.
                       </p>
                    </div>

                    <form onSubmit={handleSubmitReview} className="space-y-8">
                       <div className="space-y-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-white/20 italic ml-4">Quality Rating</p>
                          <div className="flex space-x-4">
                             {[1, 2, 3, 4, 5].map((star) => (
                               <button
                                 key={star}
                                 type="button"
                                 onClick={() => setNewRating(star)}
                                 className={cn(
                                   "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border",
                                   newRating >= star ? "border-accent bg-accent/10 text-accent shadow-[0_0_20px_rgba(242,125,38,0.2)]" : "border-white/5 text-white/10"
                                 )}
                               >
                                 <Star className={cn("w-5 h-5", newRating >= star && "fill-accent")} />
                               </button>
                             ))}
                          </div>
                       </div>

                       <div className="space-y-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-white/20 italic ml-4">Detailed Sentiment</p>
                          <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Describe the threads..."
                            className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-[11px] font-medium uppercase tracking-widest text-white outline-none focus:border-accent transition-all min-h-[120px] resize-none"
                          />
                       </div>

                       <button
                         type="submit"
                         disabled={isSubmittingReview || !newComment.trim()}
                         className="w-full bg-white text-black py-6 rounded-full font-black uppercase tracking-widest text-[11px] hover:bg-accent transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
                       >
                          {isSubmittingReview ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                          <span>Inject Review</span>
                       </button>
                    </form>
                 </div>
              </div>

              {/* Review Ledger */}
              <div className="lg:col-span-7">
                 <div className="space-y-12">
                    <div className="flex items-center justify-between">
                       <div className="space-y-2">
                          <h3 className="text-sm font-black uppercase tracking-editorial italic">The Pulse Ledger</h3>
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">{reviews.length} Verified Broadcasts</p>
                       </div>
                       
                       {reviews.length > 0 && (
                         <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-editorial text-white/40 mb-1">Avg Authority</p>
                            <div className="flex items-center space-x-2 justify-end">
                               <span className="text-2xl font-display font-black text-white">{averageRating.toFixed(1)}</span>
                               <Star className="w-4 h-4 text-accent fill-accent" />
                            </div>
                         </div>
                       )}
                    </div>

                    <div className="space-y-8">
                       {reviews.map((review) => (
                         <motion.div
                           initial={{ opacity: 0, y: 20 }}
                           whileInView={{ opacity: 1, y: 0 }}
                           key={review.id}
                           className="glass p-8 rounded-[2.5rem] border border-white/5 space-y-6"
                         >
                            <div className="flex justify-between items-start">
                               <div className="flex items-center space-x-4">
                                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center font-black text-[12px] text-accent">
                                     {review.userName.charAt(0)}
                                  </div>
                                  <div>
                                     <p className="text-[10px] font-black uppercase tracking-widest text-white leading-none mb-1">{review.userName}</p>
                                     <p className="text-[8px] font-black uppercase tracking-widest text-white/20 italic">Verified Citizen</p>
                                  </div>
                               </div>
                               <div className="flex space-x-1">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star key={s} className={cn("w-3 h-3", s <= review.rating ? "text-accent fill-accent" : "text-white/5")} />
                                  ))}
                               </div>
                            </div>
                            
                            <p className="text-[12px] font-medium leading-relaxed uppercase tracking-tight text-white/60">
                               {review.comment}
                            </p>
                            
                            <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                               <div className="flex items-center space-x-2 px-2 py-1 bg-white/5 rounded-lg border border-white/5">
                                  <ShieldCheck className="w-3 h-3 text-green-500" />
                                  <span className="text-[7px] font-black uppercase tracking-widest text-white/40 italic">Asset Ownership Confirmed</span>
                               </div>
                               <span className="text-[8px] font-black uppercase tracking-widest text-white/20">
                                  {review.createdAt ? new Date(review.createdAt.seconds * 1000).toLocaleDateString() : 'Active Transmission'}
                               </span>
                            </div>
                         </motion.div>
                       ))}

                       {reviews.length === 0 && (
                         <div className="py-24 text-center glass rounded-[3rem] border border-dashed border-white/10 opacity-40">
                            <MessageCircle className="w-12 h-12 text-white/5 mx-auto mb-6" />
                            <p className="text-[10px] font-black uppercase tracking-editorial text-white/20">Ledger silent. Be the first to broadcast.</p>
                         </div>
                       )}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Full Screen Overlay */}
      <AnimatePresence>
        {isFullScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-2xl flex items-center justify-center p-4 md:p-12"
            onClick={() => setIsFullScreen(false)}
          >
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-8 right-8 z-[110] bg-white text-black p-4 rounded-full shadow-2xl hover:bg-accent transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setIsFullScreen(false);
              }}
            >
              <X className="w-6 h-6" />
            </motion.button>

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative max-w-5xl w-full aspect-[4/5] md:aspect-auto md:max-h-full overflow-hidden rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] cursor-zoom-out group"
              onClick={(e) => e.stopPropagation()}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                setMousePos({ x, y });
              }}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => {
                setIsHovering(false);
                setMousePos({ x: 50, y: 50 });
              }}
            >
              <motion.img
                src={activeImage}
                alt={product.name}
                className="w-full h-full object-contain transition-transform duration-300 ease-out"
                style={{
                  transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
                  scale: isHovering ? 2.5 : 1,
                }}
                referrerPolicy="no-referrer"
              />
              
              <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end pointer-events-none">
                <div className="glass p-6 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity">
                  <h2 className="text-2xl font-display font-black uppercase italic text-white mb-2">{product.name}</h2>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">
                    {viewMode === 'mockup' ? 'Blueprint Data Visualization' : 'Studio Heritage Shot'}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                        "flex flex-col items-center space-y-3 p-6 bg-white/5 rounded-3xl border border-white/5 transition-all group",
                        platform.color
                      )}
                    >
                      <platform.icon className="w-6 h-6 transition-transform group-hover:scale-110" />
                      <span className="text-[8px] font-black uppercase tracking-widest text-white/40">{platform.name}</span>
                    </a>
                  ))}
               </div>

               <div className="space-y-4">
                  <p className="text-[8px] font-black uppercase tracking-editorial text-white/20 italic ml-4">Terminal Link</p>
                  <div className="flex items-center space-x-3 bg-black/40 p-2 pl-6 rounded-2xl border border-white/5 group">
                     <p className="text-[9px] font-mono text-white/30 truncate flex-1">{window.location.href}</p>
                     <button 
                       onClick={copyToClipboard}
                       className="p-4 bg-white text-black rounded-xl hover:bg-accent transition-colors"
                     >
                        <LinkIcon className="w-4 h-4" />
                     </button>
                  </div>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
