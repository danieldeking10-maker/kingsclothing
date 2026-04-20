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
  MessageSquare
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

export function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'mockup' | 'studio'>('studio');
  const [selectedGsm, setSelectedGsm] = useState<GSM>('260');
  const [selectedColor, setSelectedColor] = useState(FABRIC_COLORS[0]);
  const [selectedSize, setSelectedSize] = useState('L');
  const [isOrdering, setIsOrdering] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedDescription, setEnhancedDescription] = useState<string | null>(null);
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
    const fetchProduct = async () => {
      try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() });
        } else {
          // Fallback if not in DB yet (for dev)
          setProduct({
            id: id,
            name: "The Dynasty Tee",
            category: "T-Shirts",
            description: "Our signature heavyweight tee, featuring a reinforced collar and premium stitching. Designed for the leaders who refuse to settle.",
            mockupImage: "https://picsum.photos/seed/k1/800/1000",
            studioImage: "https://picsum.photos/seed/studio/800/1000",
            gsmOptions: ['230', '260', '320']
          });
        }
      } catch (error) {
        toast.error('Failed to load product');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, navigate]);

  const price = useMemo(() => {
    if (!product) return 0;
    if (product.category === 'T-Shirts') {
      return (PRICING['T-Shirts'] as any)[selectedGsm] || 150;
    }
    return (PRICING as any)[product.category] || 180;
  }, [product, selectedGsm]);

  const deposit = price * DEPOSIT_PERCENTAGE;
  const balance = price - deposit;

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      id: product.id,
      name: product.name,
      price: price,
      image: product.mockupImage,
      size: selectedSize,
      color: selectedColor.name,
      gsm: selectedGsm,
      quantity: 1,
      category: product.category,
    });
    toast.success(`Success: ${product.name} locked into cart`);
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
      color: 'hover:text-green-500',
      href: `https://wa.me/?text=${encodeURIComponent(`Check out ${product?.name} from Kings Clothing: ${window.location.href}`)}` 
    },
    { 
      name: 'Twitter', 
      icon: Twitter, 
      color: 'hover:text-blue-400',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Forging new authority with ${product?.name} from Kings Clothing.`) }&url=${encodeURIComponent(window.location.href)}` 
    },
    { 
      name: 'Facebook', 
      icon: Facebook, 
      color: 'hover:text-blue-600',
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
        You are a luxury streetwear brand copywriter for "Kings Clothing Brand". 
        Take the following product description and transform it into a more evocative, authoritative, and regal brand narrative.
        
        Requirements:
        1. Incorporate the spirit of "Ghanaian craftsmanship".
        2. Establish "streetwear authority".
        3. Use powerful, high-impact language.
        4. Keep it concise (max 3-4 sentences).
        
        Original Description: ${product.description}
        Product Name: ${product.name}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
      });

      if (response.text) {
        setEnhancedDescription(response.text.trim());
        toast.success('Narrative Forged');
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
          price: price
        }],
        totalAmount: price,
        depositAmount: deposit,
        status: 'pending',
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

  if (loading) return <div className="h-screen flex items-center justify-center font-black uppercase italic tracking-widest animate-pulse">Scanning Blueprint...</div>;
  if (!product) return null;

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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
          {/* Left: Image Gallery (Span 7) */}
          <div className="lg:col-span-7 space-y-10">
            <div 
              className="relative aspect-[4/5] overflow-hidden rounded-[3rem] bg-[#1A1A1B] shadow-[0_0_80px_rgba(0,0,0,0.5)] cursor-zoom-in group/main"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                setMousePos({ x, y });
              }}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              onClick={() => setIsFullScreen(true)}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={viewMode}
                  className="w-full h-full relative"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.img
                    src={viewMode === 'mockup' ? product.mockupImage : (product.studioImage || product.mockupImage)}
                    alt={product.name}
                    className="w-full h-full object-cover transition-all duration-1000 origin-center"
                    style={{
                      transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
                      scale: isHovering ? 1.5 : 1,
                      filter: isHovering ? 'grayscale(0) brightness(1)' : 'grayscale(1) brightness(0.9)'
                    }}
                    referrerPolicy="no-referrer"
                  />
                </motion.div>
              </AnimatePresence>

              {/* Zoom Trigger Button Overlay */}
              <div className="absolute top-8 right-8 z-20 opacity-0 group-hover/main:opacity-100 transition-opacity">
                <div className="bg-background/40 backdrop-blur-xl p-4 rounded-2xl border border-white/10 text-white">
                  <Maximize2 className="w-5 h-5" />
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex p-1.5 bg-background/40 backdrop-blur-3xl rounded-full border border-white/10 shadow-2xl z-20">
                <button
                  onClick={() => setViewMode('mockup')}
                  className={cn(
                    "px-8 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                    viewMode === 'mockup' ? "bg-white text-black shadow-xl" : "text-white/60 hover:text-white"
                  )}
                >
                  Blueprint
                </button>
                <button
                  onClick={() => setViewMode('studio')}
                  className={cn(
                    "px-8 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                    viewMode === 'studio' ? "bg-white text-black shadow-xl" : "text-white/60 hover:text-white"
                  )}
                >
                  Studio
                </button>
              </div>
            </div>

            {/* Thumbnail Gallery */}
            {product.studioImage && (
              <div className="flex justify-center space-x-6">
                <button 
                  onClick={() => setViewMode('mockup')}
                  className={cn(
                    "w-24 h-32 rounded-[2rem] overflow-hidden border-2 transition-all duration-500 relative group/thumb",
                    viewMode === 'mockup' ? "border-accent shadow-[0_0_30px_rgba(242,125,38,0.2)] scale-105" : "border-white/5 opacity-40 hover:opacity-100"
                  )}
                >
                  <img src={product.mockupImage} alt="Mockup" className="w-full h-full object-cover transition-transform group-hover/thumb:scale-110" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/20 group-hover/thumb:bg-transparent transition-colors" />
                  <div className="absolute bottom-2 inset-x-0 text-center">
                    <span className="text-[7px] font-black uppercase tracking-widest text-white drop-shadow-md">Blueprint</span>
                  </div>
                </button>
                <button 
                  onClick={() => setViewMode('studio')}
                  className={cn(
                    "w-24 h-32 rounded-[2rem] overflow-hidden border-2 transition-all duration-500 relative group/thumb",
                    viewMode === 'studio' ? "border-accent shadow-[0_0_30px_rgba(242,125,38,0.2)] scale-105" : "border-white/5 opacity-40 hover:opacity-100"
                  )}
                >
                  <img src={product.studioImage} alt="Studio" className="w-full h-full object-cover transition-transform group-hover/thumb:scale-110" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/20 group-hover/thumb:bg-transparent transition-colors" />
                  <div className="absolute bottom-2 inset-x-0 text-center">
                    <span className="text-[7px] font-black uppercase tracking-widest text-white drop-shadow-md">Studio</span>
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
          <div className="lg:col-span-5 flex flex-col justify-center">
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

              {/* AI Narrative Toggle */}
              <div className="mt-8">
                 {!enhancedDescription ? (
                    <button
                      onClick={handleEnhanceDescription}
                      disabled={isEnhancing}
                      className="flex items-center space-x-2 text-[9px] font-black uppercase tracking-widest text-accent hover:text-white transition-colors group"
                    >
                       {isEnhancing ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                       ) : (
                          <Wand2 className="w-3 h-3 group-hover:rotate-12 transition-transform" />
                       )}
                       <span>Forge Royal Narrative</span>
                    </button>
                 ) : (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                       <div className="flex items-center justify-between">
                          <span className="text-accent text-[8px] font-black uppercase tracking-editorial italic">Neural Blueprint Verified</span>
                          <button 
                            onClick={() => setEnhancedDescription(null)}
                            className="text-[8px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-colors"
                          >
                            Reset Narrative
                          </button>
                       </div>
                       <p className="text-white text-xl md:text-2xl font-display font-black leading-relaxed italic tracking-tighter">
                          "{enhancedDescription}"
                       </p>
                    </motion.div>
                 )}
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
            <div className="space-y-12">
              {/* GSM Selector */}
              {product.category === 'T-Shirts' && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-editorial mb-6 block text-white/40">Blueprint Weight</label>
                  <div className="grid grid-cols-3 gap-4">
                    {(['230', '260', '320'] as const).map(gsm => (
                      <button
                        key={gsm}
                        onClick={() => setSelectedGsm(gsm)}
                        className={cn(
                          "py-5 rounded-2xl border-2 transition-all font-black text-[11px] uppercase tracking-widest",
                          selectedGsm === gsm 
                            ? "border-accent bg-white text-black" 
                            : "border-white/5 bg-white/5 text-white/40 hover:border-white/20"
                        )}
                      >
                        {gsm} GSM
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Color Swatches */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-editorial mb-6 block text-white/40">Fabric Shade: {selectedColor.name}</label>
                  <div className="flex flex-wrap gap-4">
                    {FABRIC_COLORS.map(color => (
                      <button
                        key={color.name}
                        onClick={() => setSelectedColor(color)}
                        className={cn(
                          "w-12 h-12 rounded-full border border-white/10 transition-all shadow-2xl relative group",
                          selectedColor.name === color.name ? "ring-2 ring-accent ring-offset-4 ring-offset-background scale-110" : "hover:scale-105"
                        )}
                        style={{ backgroundColor: color.hex }}
                      >
                        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all text-[8px] font-black uppercase tracking-widest text-accent whitespace-nowrap">
                          {color.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Size Controls */}
                <div className="lg:min-w-[200px]">
                   <div className="flex justify-between items-center mb-6">
                      <label className="text-[10px] font-black uppercase tracking-editorial text-white/40">Sizing</label>
                      <button className="text-[9px] font-black uppercase tracking-widest text-accent hover:underline decoration-accent/20 transition-all">Dimensions</button>
                   </div>
                   <div className="flex flex-wrap gap-3">
                      {SIZES.map(size => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={cn(
                            "w-12 h-12 rounded-full border-2 transition-all font-black text-[11px] flex items-center justify-center tracking-tighter",
                            selectedSize === size 
                              ? "border-accent bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
                              : "border-white/5 text-white/20 hover:border-white/20"
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
            <div className="flex flex-col sm:flex-row gap-5 mt-20">
               <button 
                 onClick={handleBuyNow}
                 disabled={isOrdering}
                 className="flex-[2] bg-white text-black py-7 rounded-full font-black uppercase tracking-[0.3em] text-[11px] hover:bg-accent transition-all flex items-center justify-center space-x-3 shadow-2xl disabled:opacity-50 group active:scale-95"
               >
                  {isOrdering ? <RefreshCw className="animate-spin w-5 h-5" /> : <Zap className="w-5 h-5 transition-transform group-hover:scale-110 group-hover:rotate-12" />}
                  <span>Initialize Build (Deposit)</span>
               </button>
               <button 
                 onClick={handleAddToCart}
                 className="flex-1 bg-white/5 border border-white/10 text-white/60 py-7 rounded-full font-black uppercase tracking-[0.3em] text-[11px] hover:bg-white/10 hover:text-white transition-all flex items-center justify-center space-x-3 group active:scale-95 shadow-xl"
               >
                  <ShoppingBag className="w-5 h-5 transition-transform group-hover:scale-110" />
                  <span>Secure to Cart</span>
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
              className="relative max-w-5xl w-full aspect-[4/5] md:aspect-auto md:max-h-full overflow-hidden rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={viewMode === 'mockup' ? product.mockupImage : (product.studioImage || product.mockupImage)}
                alt={product.name}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
              
              <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
                <div className="glass p-6 rounded-3xl">
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
