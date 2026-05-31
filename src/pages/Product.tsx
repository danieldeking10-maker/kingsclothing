import { useState, useMemo, useEffect, FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ShoppingCart, 
  Zap, 
  ShieldCheck, 
  Truck, 
  Share2,
  RefreshCw,
  Phone,
  ChevronRight,
  ShoppingBag,
  X,
  Facebook,
  Twitter,
  MessageCircle,
  Video,
  Link as LinkIcon,
  Wand2,
  Star,
  MessageSquare,
  Grid3X3,
  Camera,
  Wind,
  Layers,
  Edit3
} from 'lucide-react';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, onSnapshot, query, orderBy, increment, arrayUnion, runTransaction, where, getDocs, limit } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { useCart } from '../lib/CartContext';
import { CATEGORIES, PRICING, FABRIC_COLORS, SIZES, DEPOSIT_PERCENTAGE, SUPPORT_INTERACTION_NUMBER } from '@/src/constants';
import { formatGHC, cn } from '@/src/lib/utils';
import { toast } from 'react-hot-toast';
import { GSM } from '@/src/types';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import { RecentlyViewed } from '../components/RecentlyViewed';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { VeoVideoGenerator } from '../components/VeoVideoGenerator';
import { EnhancedImage } from '@/src/components/ui/EnhancedImage';
import { initPaystackMock } from '../lib/paystackMock';

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
  const [viewMode, setViewMode] = useState<'blueprint' | 'studio' | 'mockup'>('mockup');
  const [selectedGsm, setSelectedGsm] = useState<GSM>('260');
  const [selectedColor, setSelectedColor] = useState(FABRIC_COLORS[0]);
  const [selectedSize, setSelectedSize] = useState('L');
  const [isOrdering, setIsOrdering] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [momoNumber, setMomoNumber] = useState('');
  const [momoProvider, setMomoProvider] = useState<'mtn' | 'telecel' | 'airteltigo'>('mtn');
  const [isVeoOpen, setIsVeoOpen] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedDescription, setEnhancedDescription] = useState<string | null>(null);
  const [isSpecsModalOpen, setIsSpecsModalOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [referralId, setReferralId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    if (!id) return;
    const q = query(
      collection(db, 'products', id, 'reviews'), 
      orderBy('createdAt', 'desc'),
      limit(15)
    );
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
    const fetchProduct = () => {
      const docRef = doc(db, 'products', id);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const fetchedProduct = { id: docSnap.id, ...docSnap.data() };
          setProduct(fetchedProduct);
          addProduct(docSnap.id);
          setLoading(false);
        } else if (!product) {
          // If product doesn't exist and we have no state, fallback
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
          setLoading(false);
        }
      }, (error) => {
        console.error('Failed to load product:', error);
        toast.error('Identity of product is currently unreachable');
        setLoading(false);
      });
      return unsubscribe;
    };
    const unsubscribeProduct = fetchProduct();

    // Capture referral ID & GSM
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    const gsmParam = params.get('gsm') as GSM;

    if (gsmParam && ['230', '260', '320', 'standard'].includes(gsmParam)) {
      setSelectedGsm(gsmParam);
    }

    if (ref) {
      setReferralId(ref);
      sessionStorage.setItem('last_referral_id', ref);
    } else {
      const storedRef = sessionStorage.getItem('last_referral_id');
      if (storedRef) setReferralId(storedRef);
    }

    const qPromos = query(
      collection(db, 'promotions'), 
      where('active', '==', true),
      limit(5)
    );
    const unsubscribePromos = onSnapshot(qPromos, (snapshot) => {
      setPromotions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribePromos();
      unsubscribeProduct();
    };
  }, [id, navigate]);

  const activePromotion = useMemo(() => {
    return promotions[0]; // Apply first active campaign if exists
  }, [promotions]);

  const basePrice = useMemo(() => {
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

  const price = useMemo(() => {
    let finalPrice = basePrice;
    
    // 0. Product Specific Sale Protocol
    if (product?.isOnSale && product?.salePrice) {
      finalPrice = product.salePrice;
    } else if (activePromotion) {
      // Apply Global Promotion if no direct product sale
      finalPrice = finalPrice * (1 - (activePromotion.discountPercentage / 100));
    }
    
    // Apply Coupon (Stackable by protocol design)
    if (appliedCoupon) {
      finalPrice = finalPrice * (1 - (appliedCoupon.discountPercentage / 100));
    }
    
    return finalPrice;
  }, [basePrice, activePromotion, appliedCoupon, product?.isOnSale, product?.salePrice]);

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
        
        // Check expiry
        if (couponData.expiryDate && couponData.expiryDate.toDate() < new Date()) {
          toast.error('Coupon has expired');
          return;
        }
        
        // Check usage limit
        if (couponData.usageLimit && (couponData.usageCount || 0) >= couponData.usageLimit) {
          toast.error('Usage terminal reached for this code');
          return;
        }

        setAppliedCoupon({ id: couponId, ...couponData });
        toast.success(`Coupon Applied: ${couponData.discountPercentage}% Off`);
      } else {
        toast.error('Identity of coupon is invalid or inactive');
      }
    } catch (e) {
      toast.error('Verification failure');
    }
  };

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
    
    const colorGsmKey = `${selectedColor.name}-${selectedGsm}`;

    if (viewMode === 'blueprint') {
      // 1. Ultra-Priority: GSM-Color Specific Blueprint Asset
      if (product.colorBlueprints?.[colorGsmKey]) {
        return product.colorBlueprints[colorGsmKey];
      }
      // 2. Technical Blueprint Match
      if (product.colorBlueprints?.[selectedColor.name]) {
        return product.colorBlueprints[selectedColor.name];
      }
      return product.blueprintImage || product.mockupImage;
    }

    if (viewMode === 'studio') {
      // 1. Ultra-Priority: GSM-Color Specific Studio Asset
      if (product.colorStudioImages?.[colorGsmKey]) {
        return product.colorStudioImages[colorGsmKey];
      }
      // 2. High Priority Match: Colour-specific studio shot from the ledger
      if (product.colorStudioImages?.[selectedColor.name]) {
        return product.colorStudioImages[selectedColor.name];
      }
      return product.studioImage || product.mockupImage;
    }

    // Mockup Mode
    // 1. Ultra-Priority: GSM-Color Specific Mockup Asset
    if (product.colorImages?.[colorGsmKey]) {
      return product.colorImages[colorGsmKey];
    }
    // 2. Secondary Match: Colour-specific pre-rendered mockup
    if (product.colorImages?.[selectedColor.name]) {
      return product.colorImages[selectedColor.name];
    }

    return product.mockupImage;
  }, [product, selectedColor, viewMode, selectedGsm]);

  const [prevActiveImage, setPrevActiveImage] = useState(activeImage);

  if (activeImage !== prevActiveImage) {
    setPrevActiveImage(activeImage);
    const img = new Image();
    img.src = activeImage;
    setImageLoading(!img.complete);
  }

  // Sync image loading indicator with actual load events
  useEffect(() => {
    if (!activeImage) return;
    const img = new Image();
    img.src = activeImage;
    if (img.complete) {
      setImageLoading(false);
      return;
    }

    img.onload = () => {
      setImageLoading(false);
    };

    img.onerror = () => {
      setImageLoading(false);
    };
  }, [activeImage]);

  const [showStickyCta, setShowStickyCta] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const buyButton = document.getElementById('main-buy-button');
      if (buyButton) {
        const rect = buyButton.getBoundingClientRect();
        setShowStickyCta(rect.bottom < 0);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      name: 'X', 
      icon: Twitter, 
      color: 'hover:text-white hover:bg-white/10 hover:border-white/20',
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

  const handleSavePromoVideo = async (videoUrl: string) => {
    if (!id || !isBrandOwner) return;
    try {
      await updateDoc(doc(db, 'products', id), {
        promoVideos: arrayUnion(videoUrl)
      });
      toast.success('Kinetic Asset Saved to Product Ledger');
    } catch (error) {
      console.error('Save Video Error:', error);
      // Even if firestore save fails (due to blob URL length or something), we still let them download
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      toast.error('Please sign in to order');
      navigate(`/auth?redirect=/product/${id}`);
      return;
    }
    setIsPaymentModalOpen(true);
  };

  const processPayment = async () => {
    if (!momoNumber || momoNumber.length < 10) {
      toast.error('Invalid Protocol: Mobile Money Number Required');
      return;
    }

    setIsOrdering(true);
    setIsPaymentModalOpen(false);
    const loadingToast = toast.loading('Synchronizing Secure Paystack Gateway...');
    
    const genRef = 'KNGS_DEP_' + Math.random().toString(36).substring(2, 12).toUpperCase();

    const handlePaymentSuccess = async (response: any) => {
      const orderData = {
        customerId: user?.uid,
        customerName: user?.displayName,
        customerEmail: user?.email,
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
        discountApplied: (basePrice - price) * quantity,
        appliedPromotionId: activePromotion?.id || null,
        appliedCouponCode: appliedCoupon?.code || null,
        status: 'pending',
        paymentStatus: 'paid',
        paystackReference: response.reference || response.id || genRef,
        momoNumber: momoNumber,
        momoProvider: momoProvider,
        referralAgentId: referralId || null,
        createdAt: serverTimestamp()
      };

      try {
        const orderRef = doc(collection(db, 'orders'));
        const orderId = orderRef.id;

        await runTransaction(db, async (transaction) => {
          transaction.set(orderRef, orderData);
          transaction.update(doc(db, 'products', product.id), {
            salesCount: increment(quantity)
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

        toast.dismiss(loadingToast);
        toast.success('Capital Asset Secured');
        navigate(`/order/${orderId}`);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'orders');
      }
    };

    const handlePaymentClosed = () => {
      setIsOrdering(false);
      toast.dismiss(loadingToast);
      toast.error('Transaction Terminated by User');
    };

    try {
      const config = {
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email: user?.email || 'customer@kingsclothing.brand',
        amount: Math.round(deposit * quantity * 100), // convert to pesewas
        currency: 'GHS',
        channels: ['mobile_money', 'card'],
        ref: genRef,
        reference: genRef,
        metadata: {
          custom_fields: [
            {
              display_name: "Product",
              variable_name: "product",
              value: product.name
            },
            {
              display_name: "Momo Number",
              variable_name: "momo_number",
              value: momoNumber
            },
            {
              display_name: "Provider",
              variable_name: "provider",
              value: momoProvider
            }
          ]
        },
        callback: handlePaymentSuccess,
        onSuccess: handlePaymentSuccess,
        onClose: handlePaymentClosed,
        onCancel: handlePaymentClosed
      };

      initPaystackMock();
      const handler = (window as any).PaystackPop.setup(config);
      handler.openIframe();
      
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error('Terminal Error: ' + error.message);
      setIsOrdering(false);
    }
  };

  const handleUpdateGsmPrices = async (newGsmPrices: Record<string, number>) => {
    if (!id || !isBrandOwner) return;
    try {
      await updateDoc(doc(db, 'products', id), { 
        gsmPrices: newGsmPrices,
        basePrice: newGsmPrices[selectedGsm] || product.basePrice
      });
      setProduct({ ...product, gsmPrices: newGsmPrices });
      toast.success('Economic Logic Updated');
      setIsPricingModalOpen(false);
    } catch (error) {
      toast.error('Failed to update economic logic');
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
    <>
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
              className="relative aspect-[4/5] overflow-hidden rounded-[3rem] bg-[#1A1A1B] shadow-[0_0_80px_rgba(0,0,0,0.5)] group/main"
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
            >
              {imageLoading && (
                <>
                  {/* Slim Neon-Glow Progress Line at the top of the image frame */}
                  <div className="absolute top-0 inset-x-0 h-1 bg-black/40 z-30 overflow-hidden">
                    <motion.div 
                      style={{ position: 'absolute', top: 0, bottom: 0 }}
                      initial={{ left: "-50%", width: "50%" }}
                      animate={{ left: "100%" }}
                      transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
                      className="bg-gradient-to-r from-transparent via-accent to-transparent"
                    />
                  </div>
                  {/* Subtle HUD Badge in the bottom-middle of the image frame */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/80 backdrop-blur-md border border-white/10 rounded-full z-30 flex items-center space-x-2 shadow-2xl">
                    <RefreshCw className="w-3 h-3 text-accent animate-spin" />
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-accent">Syncing Blueprint</span>
                  </div>
                </>
              )}
              <div className="w-full h-full relative">
                <EnhancedImage
                  src={activeImage}
                  onLoad={() => setImageLoading(false)}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  aspectRatio="aspect-auto"
                  style={{
                    transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
                  }}
                  animate={{
                    scale: isHovering ? 1.15 : 1,
                    filter: isHovering ? 'brightness(1.05) contrast(1.05)' : 'brightness(0.9) contrast(1)',
                  }}
                  transition={{
                    scale: { type: "spring", stiffness: 120, damping: 25 },
                    filter: { duration: 0.3 }
                  }}
                />
                
                {/* Digital Fabric Dye Overlay */}
                {!product.colorStudioImages?.[selectedColor.name] && !product.colorImages?.[selectedColor.name] && (
                  <motion.div 
                    key={`overlay-${selectedColor.name}`}
                    initial={{ opacity: 0 }}
                    animate={{ 
                      opacity: selectedColor.name === 'Noir Black' ? 0.8 : 0.4,
                      scale: isHovering ? 1.15 : 1
                    }}
                    style={{ 
                      backgroundColor: selectedColor.hex,
                      transformOrigin: `${mousePos.x}% ${mousePos.y}%`
                    }}
                    transition={{
                      scale: { type: "spring", stiffness: 120, damping: 25 }
                    }}
                    className="absolute inset-0 pointer-events-none mix-blend-multiply transition-colors duration-700"
                  />
                )}
              </div>


              {/* View Mode Toggle - Architectural Style */}
              <div className="absolute lg:top-1/2 lg:-translate-y-1/2 top-4 left-4 lg:left-8 flex lg:flex-col flex-row gap-3 py-4 z-20">
                <div className="flex lg:flex-col flex-row gap-2 p-1.5 glass rounded-2xl border border-white/10 shadow-2xl">
                  <button
                    onClick={() => setViewMode('blueprint')}
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-all group/btn",
                      viewMode === 'blueprint' ? "bg-accent text-black scale-105" : "text-white/30 hover:text-white hover:bg-white/5"
                    )}
                    title="Blueprint Mode"
                  >
                    <Layers className="w-5 h-5" />
                    <span className="absolute left-full ml-4 px-3 py-1 bg-black/80 backdrop-blur-xl border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-white opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-all whitespace-nowrap">
                      Technical Blueprint
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
                      Visual Mockup
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Thumbnail Gallery */}
            {(product.studioImage || product.colorStudioImages?.[selectedColor.name]) && (
              <div className="flex justify-center space-x-4">
                <button 
                  onClick={() => setViewMode('mockup')}
                  className={cn(
                    "w-20 h-24 rounded-2xl overflow-hidden border-2 transition-all duration-500 relative group/thumb",
                    viewMode === 'mockup' ? "border-accent shadow-lg scale-105" : "border-white/5 opacity-40 hover:opacity-100 hover:border-white/20"
                  )}
                >
                  <EnhancedImage 
                    src={product.colorImages?.[selectedColor.name] || product.mockupImage} 
                    alt="Mockup" 
                    className="group-hover/thumb:scale-110" 
                    aspectRatio="aspect-auto h-full w-full"
                  />
                  <div className="absolute inset-x-0 bottom-0 py-1 bg-black/60 text-center z-10">
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
                  <EnhancedImage 
                    src={product.colorStudioImages?.[selectedColor.name] || product.studioImage} 
                    alt="Studio" 
                    className="group-hover/thumb:scale-110" 
                    aspectRatio="aspect-auto h-full w-full"
                  />
                  <div className="absolute inset-x-0 bottom-0 py-1 bg-black/60 text-center z-10">
                    <span className="text-[6px] font-black uppercase tracking-widest text-white">Studio</span>
                  </div>
                </button>
                {(product.colorBlueprints?.[selectedColor.name]) && (
                  <button 
                    onClick={() => setViewMode('blueprint')}
                    className={cn(
                      "w-20 h-24 rounded-2xl overflow-hidden border-2 transition-all duration-500 relative group/thumb",
                      viewMode === 'blueprint' ? "border-accent shadow-lg scale-105" : "border-white/5 opacity-40 hover:opacity-100 hover:border-white/20"
                    )}
                  >
                    <EnhancedImage 
                      src={product.colorBlueprints[selectedColor.name]} 
                      alt="Tech" 
                      className="group-hover/thumb:scale-110" 
                      aspectRatio="aspect-auto h-full w-full"
                    />
                    <div className="absolute inset-x-0 bottom-0 py-1 bg-black/60 text-center z-10">
                      <span className="text-[6px] font-black uppercase tracking-widest text-white">Tech</span>
                    </div>
                  </button>
                )}
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

            {/* Social Share Authority - Below Gallery */}
            <div className="pt-8 border-t border-white/5">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <Share2 className="w-4 h-4 text-accent" />
                        <span className="text-[12px] font-black uppercase tracking-[0.3em] text-white italic">Broadcast Authority</span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">Share Blueprint</p>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <button
                    onClick={copyToClipboard}
                    className="flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 rounded-3xl hover:bg-accent hover:text-black transition-all group/share"
                  >
                    <LinkIcon className="w-5 h-5 mb-2 group-hover/share:scale-110 transition-transform" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Copy</span>
                  </button>
                  {sharePlatforms.map((platform) => (
                    <a
                      key={platform.name}
                      href={platform.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 rounded-3xl hover:bg-accent hover:text-black transition-all group/share"
                    >
                      <platform.icon className="w-5 h-5 mb-2 group-hover/share:scale-110 transition-transform" />
                      <span className="text-[8px] font-black uppercase tracking-widest">{platform.name}</span>
                    </a>
                  ))}
                </div>
            </div>

            {/* Veo Promotional Video Feature - Restricted to Brand Owner/Admin */}
            {(isBrandOwner || user?.email === 'danieldeking10@gmail.com') && (
              <div className="pt-8 border-t border-white/5">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-3">
                    <Video className="w-4 h-4 text-accent" />
                    <span className="text-[12px] font-black uppercase tracking-[0.3em] text-white italic">Kinetic Creator</span>
                  </div>
                  <button 
                    onClick={() => setIsVeoOpen(!isVeoOpen)}
                    className="text-[9px] font-black uppercase tracking-widest text-accent hover:text-white transition-colors"
                  >
                    {isVeoOpen ? 'Collapse Engine' : 'Deploy Veo R3.1'}
                  </button>
                </div>

                <AnimatePresence>
                  {isVeoOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <VeoVideoGenerator 
                        product={product} 
                        startingImage={activeImage}
                        onVideoGenerated={handleSavePromoVideo}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Right: Info & Config (Span 5) */}
          <div className="lg:col-span-5 flex flex-col pt-4">
            <div className="mb-12 relative">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-accent text-[10px] font-black uppercase tracking-editorial block">
                    {product.category} Series • {product.gender || 'unisex'}
                </span>
                {reviews.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star 
                          key={i} 
                          className={cn(
                            "w-2.5 h-2.5", 
                            i < Math.round(averageRating) ? "text-accent fill-accent" : "text-white/10"
                          )} 
                        />
                      ))}
                    </div>
                    <span className="text-[8px] font-black uppercase text-white/40 tracking-widest">{reviews.length} Broadcasts</span>
                  </div>
                )}
              </div>
              <h1 className="text-5xl sm:text-6xl md:text-8xl font-display font-black tracking-tighter uppercase italic leading-[0.8] mb-8 relative z-10">
                {product.name}
              </h1>
              <div className="absolute top-0 right-0 opacity-5 pointer-events-none -translate-y-1/2">
                 <span className="text-[120px] font-display font-black uppercase italic tracking-tighter">KNGS</span>
              </div>
              <p className="text-white/40 text-lg leading-relaxed font-light font-sans max-w-md">
                {product.description}
              </p>

              {/* Enhanced Social Sharing Feature */}
              <div className="mt-8 flex items-center space-x-6">
                <div className="flex -space-x-2">
                  {sharePlatforms.map((platform) => (
                    <motion.a
                      key={platform.name}
                      href={platform.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ y: -4, zIndex: 20 }}
                      className={cn(
                        "w-12 h-12 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl flex items-center justify-center transition-all shadow-xl hover:border-accent/50 hover:bg-accent/5 hover:text-accent",
                      )}
                      title={`Share on ${platform.name}`}
                    >
                      <platform.icon className="w-5 h-5" />
                    </motion.a>
                  ))}
                  <motion.button
                    whileHover={{ y: -4, zIndex: 20 }}
                    onClick={copyToClipboard}
                    className="w-12 h-12 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl flex items-center justify-center transition-all shadow-xl hover:border-accent/50 hover:bg-accent/5 hover:text-accent"
                    title="Copy Authority Link"
                  >
                    <LinkIcon className="w-5 h-5" />
                  </motion.button>
                </div>
                <div className="h-4 w-px bg-white/10" />
                <span className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">Share Authority</span>
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
                  <Grid3X3 className="w-3 h-3 text-accent" />
                  <span className="text-[10px] font-black uppercase tracking-editorial text-white/40">Visual Calibration</span>
               </div>
               <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5 space-x-1">
                  <button
                    onClick={() => setViewMode('blueprint')}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                      viewMode === 'blueprint' ? "bg-accent text-black shadow-xl" : "text-white/40 hover:text-white"
                    )}
                  >
                    <Layers className="w-3.5 h-3.5" />
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
                    Studio
                  </button>
                  <button
                    onClick={() => setViewMode('mockup')}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                      viewMode === 'mockup' ? "bg-accent text-black shadow-xl" : "text-white/40 hover:text-white"
                    )}
                  >
                    <Grid3X3 className="w-3.5 h-3.5" />
                    Mockup
                  </button>
               </div>
            </div>

            {/* Price Card */}
            <div className="mb-12 glass p-10 rounded-[3rem] relative overflow-hidden group hover:border-accent/40 transition-all duration-500">
               <div className="absolute top-0 right-0 w-1/3 h-full opacity-5 group-hover:opacity-10 transition-opacity">
                   <Zap className="w-full h-full text-white" strokeWidth={1} />
               </div>
               <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                     <p className="text-[9px] uppercase font-black tracking-editorial text-white/30">Investment</p>
                     {(activePromotion || appliedCoupon) && (
                       <span className="bg-accent/20 text-accent text-[8px] font-black uppercase px-2 py-1 rounded-md animate-pulse">
                         {activePromotion ? `${activePromotion.name} Applied` : 'Coupon Validated'}
                       </span>
                     )}
                  </div>
                  <div className="flex items-baseline gap-4 mb-8">
                     <h2 className="text-6xl font-display font-black text-white italic tracking-tighter group-hover:text-accent transition-colors">
                       {formatGHC(price)}
                     </h2>
                     {(activePromotion || appliedCoupon || product?.isOnSale) && (
                       <p className="text-xl font-mono font-bold text-white/20 line-through">
                         {formatGHC(basePrice)}
                       </p>
                     )}
                  </div>
                  
                  {isBrandOwner && (
                    <button 
                      onClick={() => setIsPricingModalOpen(true)}
                      className="absolute top-8 right-8 p-3 rounded-2xl bg-accent text-black hover:scale-110 transition-all shadow-xl flex items-center gap-2 group/edit"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span className="text-[8px] font-black uppercase tracking-widest hidden group-hover/edit:block">Edit Price Logic</span>
                    </button>
                  )}
                  
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
                      <button 
                        onClick={() => setIsSpecsModalOpen(true)}
                        type="button"
                        className="text-[8px] font-black uppercase tracking-widest text-accent hover:underline decoration-accent/20 transition-all italic text-left"
                      >
                        Blueprint Specs
                      </button>
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
               {/* Coupon Terminal */}
               <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-3xl p-4 group transition-all hover:border-accent/40">
                  <div className="p-3 bg-accent/20 rounded-2xl">
                     <Star className="w-5 h-5 text-accent" />
                  </div>
                  <input 
                     type="text"
                     placeholder="ENTER LOYALTY PROTOCOL"
                     value={couponCode}
                     onChange={(e) => setCouponCode(e.target.value)}
                     className="flex-1 bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-white placeholder:text-white/10"
                  />
                  <button 
                     onClick={handleApplyCoupon}
                     className="bg-accent text-black px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:bg-white active:scale-95"
                  >
                     Verify
                  </button>
               </div>

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
                 id="main-buy-button"
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
                    href={`https://wa.me/${SUPPORT_INTERACTION_NUMBER}`} 
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

                    {user ? (
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
                    ) : (
                      <div className="pt-4">
                        <div className="p-8 rounded-[2.5rem] border border-white/5 bg-white/[0.02] text-center space-y-6">
                           <div className="flex justify-center">
                              <div className="bg-white/5 p-4 rounded-2xl">
                                 <MessageSquare className="w-8 h-8 text-white/20" />
                              </div>
                           </div>
                           <div className="space-y-2">
                              <p className="text-[10px] font-black uppercase tracking-widest text-white/40 leading-relaxed">
                                 Identity Verification Required to broadcast your sentiment.
                              </p>
                           </div>
                           <Link 
                             to="/auth" 
                             className="inline-block w-full bg-white text-black py-5 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-accent transition-all shadow-xl active:scale-95"
                           >
                             Verify Identity
                           </Link>
                        </div>
                      </div>
                    )}
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
                                     {review.userName?.charAt(0) || 'K'}
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
        <RecentlyViewed />
      </div>
    </div>

    {/* Sticky Mobile CTA */}
      <AnimatePresence>
        {showStickyCta && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-[100] p-4 bg-background/80 backdrop-blur-3xl border-t border-white/10 md:hidden"
          >
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase text-white truncate">{product.name}</p>
                {product?.isOnSale && (
                  <p className="text-[8px] font-mono font-bold text-white/20 line-through">
                    {formatGHC(basePrice)}
                  </p>
                )}
                <p className="text-[12px] font-mono font-black text-accent">{formatGHC(price)}</p>
              </div>
              <button
                onClick={handleBuyNow}
                disabled={isOrdering}
                className="bg-accent text-black px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2"
              >
                {isOrdering ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                Init Build
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Payment Information Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setIsPaymentModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="glass p-10 rounded-[3rem] w-full max-w-md border border-white/10 relative"
              onClick={(e) => e.stopPropagation()}
            >
               <button 
                 onClick={() => setIsPaymentModalOpen(false)}
                 className="absolute top-8 right-8 text-white/30 hover:text-white transition-colors"
               >
                 <X className="w-5 h-5" />
               </button>

               <div className="mb-10">
                  <div className="flex items-center space-x-3 mb-2">
                    <ShieldCheck className="w-5 h-5 text-accent" />
                    <h3 className="text-3xl font-display font-black uppercase italic tracking-tighter text-white">Payment <br/> Verification</h3>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">Authorize Secure MoMo Deployment</p>
               </div>

               <div className="space-y-8 mb-10">
                  <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase tracking-editorial text-white/40 ml-4">Network Provider</label>
                     <div className="grid grid-cols-3 gap-4">
                        {[
                          { id: 'mtn', label: 'MTN', color: 'bg-[#FFCC00]' },
                          { id: 'telecel', label: 'Telecel', color: 'bg-[#E60000]' },
                          { id: 'airteltigo', label: 'AT', color: 'bg-[#002F6C]' }
                        ].map((provider) => (
                          <button
                            key={provider.id}
                            onClick={() => setMomoProvider(provider.id as any)}
                            className={cn(
                              "relative py-4 rounded-2xl border-2 transition-all overflow-hidden font-black text-[10px] uppercase tracking-widest flex items-center justify-center",
                              momoProvider === provider.id 
                                ? "border-accent bg-accent/10 text-white" 
                                : "border-white/5 bg-white/5 text-white/40 hover:bg-white/10"
                            )}
                          >
                             {provider.label}
                             {momoProvider === provider.id && (
                               <motion.div 
                                 layoutId="provider-dot"
                                 className="absolute bottom-2 w-1 h-1 bg-accent rounded-full" 
                               />
                             )}
                          </button>
                        ))}
                     </div>
                  </div>

                  <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase tracking-editorial text-white/40 ml-4">MoMo Number</label>
                     <div className="relative group">
                        <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-accent transition-colors" />
                        <input 
                          type="tel"
                          placeholder="0XX XXX XXXX"
                          value={momoNumber}
                          onChange={(e) => setMomoNumber(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 pl-14 text-sm font-black text-white outline-none focus:border-accent transition-all placeholder:text-white/10"
                        />
                     </div>
                  </div>
               </div>

               <div className="p-6 bg-accent/5 rounded-3xl border border-accent/10 mb-10">
                  <div className="flex justify-between items-center mb-2">
                     <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Total Secured Deposit</span>
                     <span className="text-xl font-display font-black text-accent">{formatGHC(deposit * quantity)}</span>
                  </div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/20 italic">Payload includes production logistics and fabric sourcing.</p>
               </div>

               <button
                 onClick={processPayment}
                 disabled={isOrdering}
                 className="w-full bg-accent text-black py-6 rounded-full font-black uppercase tracking-widest text-[11px] hover:bg-white transition-all flex items-center justify-center space-x-3 shadow-[0_0_50px_rgba(242,125,38,0.2)]"
               >
                  {isOrdering ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 animate-bounce" />}
                  <span>Forge Payment Request</span>
               </button>
               
               <p className="text-[7px] font-black uppercase tracking-[0.4em] text-white/10 mt-8 text-center">Kings Clothing Authority Verification Protocol</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pricing Management Modal */}
      <AnimatePresence>
        {isPricingModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setIsPricingModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="glass p-10 rounded-[3rem] w-full max-w-lg border border-white/10 relative"
              onClick={(e) => e.stopPropagation()}
            >
               <button 
                 onClick={() => setIsPricingModalOpen(false)}
                 className="absolute top-8 right-8 text-white/30 hover:text-white transition-colors"
               >
                 <X className="w-5 h-5" />
               </button>

               <div className="mb-10">
                  <div className="flex items-center space-x-3 mb-2">
                    <ShieldCheck className="w-5 h-5 text-accent" />
                    <h3 className="text-3xl font-display font-black uppercase italic tracking-tighter text-white">Economic <br/> Sovereignty</h3>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">Update Asset Valuation per GSM Weight</p>
               </div>

               <div className="space-y-6 mb-10">
                  {(product.gsmOptions || ['230', '260', '320']).map((gsm: string) => (
                    <div key={gsm} className="bg-white/5 border border-white/5 rounded-2xl p-6 group hover:border-accent transition-all">
                       <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{gsm} GSM Weight</span>
                          <span className="text-accent font-black text-xs">{formatGHC(product.gsmPrices?.[gsm] || product.basePrice || 150)}</span>
                       </div>
                       <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-white/10 text-xs">₵</span>
                          <input 
                            type="number"
                            defaultValue={product.gsmPrices?.[gsm] || product.basePrice || 150}
                            onChange={(e) => {
                               const val = Number(e.target.value);
                               const newPrices = { ...(product.gsmPrices || {}), [gsm]: val };
                               setProduct({ ...product, gsmPrices: newPrices });
                            }}
                            className="w-full bg-black/40 border border-transparent rounded-xl p-4 pl-8 text-xs font-black text-white outline-none focus:bg-black/60 focus:border-accent transition-all"
                          />
                       </div>
                    </div>
                  ))}
               </div>

               <button
                 onClick={() => handleUpdateGsmPrices(product.gsmPrices)}
                 className="w-full bg-accent text-black py-6 rounded-full font-black uppercase tracking-widest text-[11px] hover:bg-white transition-all flex items-center justify-center space-x-3"
               >
                  <RefreshCw className="w-4 h-4" />
                  <span>Commit Economic Changes</span>
               </button>
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

      {/* Blueprint Sizing & Fabric Specification Manual */}
      <AnimatePresence>
        {isSpecsModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 md:p-6 overflow-y-auto"
            onClick={() => setIsSpecsModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="glass p-8 md:p-12 rounded-[3rem] w-full max-w-4xl border border-white/10 relative my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setIsSpecsModalOpen(false)}
                className="absolute top-8 right-8 text-white/30 hover:text-white transition-colors bg-white/5 p-3 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-8 md:mb-12">
                <span className="text-accent text-[10px] font-black uppercase tracking-[0.3em] mb-3 block">Legion Standard Manual</span>
                <h3 className="text-4xl md:text-5xl font-display font-light italic text-white leading-none">
                  Sizing & <span className="font-sans font-bold not-italic text-accent">Fabric Specifications.</span>
                </h3>
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-2">{product?.category || "T-Shirts"} Engineering Blueprint & Fit Matrix</p>
              </div>

              {/* Grid Content */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Specs Table */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="flex items-center space-x-2">
                    <Grid3X3 className="w-4 h-4 text-accent" />
                    <h4 className="text-[11px] font-black uppercase tracking-editorial text-white/60">Garment Measurement Grid</h4>
                  </div>
                  <div className="overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.02]">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="border-b border-white/15 bg-white/5 text-[9px] font-black uppercase tracking-widest text-white/40">
                          <th className="py-4 px-6">Size Metric</th>
                          <th className="py-4 px-4 text-center">S</th>
                          <th className="py-4 px-4 text-center">M</th>
                          <th className="py-4 px-4 text-center">L</th>
                          <th className="py-4 px-4 text-center">XL</th>
                          <th className="py-4 px-4 text-center">XXL</th>
                        </tr>
                      </thead>
                      <tbody className="text-[10px] font-mono divide-y divide-white/5 text-white/80">
                        <tr className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6 font-sans font-black uppercase text-white tracking-widest text-[9px]">Chest (W)</td>
                          <td className="py-4 px-4 text-center">52 cm</td>
                          <td className="py-4 px-4 text-center">55 cm</td>
                          <td className="py-4 px-4 text-center">58 cm</td>
                          <td className="py-4 px-4 text-center">61 cm</td>
                          <td className="py-4 px-4 text-center">64 cm</td>
                        </tr>
                        <tr className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6 font-sans font-black uppercase text-white tracking-widest text-[9px]">Length (L)</td>
                          <td className="py-4 px-4 text-center">70 cm</td>
                          <td className="py-4 px-4 text-center">72 cm</td>
                          <td className="py-4 px-4 text-center">74 cm</td>
                          <td className="py-4 px-4 text-center">76 cm</td>
                          <td className="py-4 px-4 text-center">78 cm</td>
                        </tr>
                        <tr className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6 font-sans font-black uppercase text-white tracking-widest text-[9px]">Sleeve (S)</td>
                          <td className="py-4 px-4 text-center">21 cm</td>
                          <td className="py-4 px-4 text-center">22 cm</td>
                          <td className="py-4 px-4 text-center">23 cm</td>
                          <td className="py-4 px-4 text-center">24 cm</td>
                          <td className="py-4 px-4 text-center">25 cm</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[8px] text-white/30 uppercase font-black tracking-widest italic pl-2">
                    * Fits slightly oversized for premium streetwear draping. Pick your regular size for standard boxy fit, or size down for tailored fit.
                  </p>
                </div>

                {/* Fabric Weight Specs */}
                <div className="lg:col-span-5 space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-accent" />
                      <h4 className="text-[11px] font-black uppercase tracking-editorial text-white/60">GSM weight index</h4>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-white">230 GSM Weight</span>
                          <span className="text-[8px] font-black bg-white/10 text-white/60 px-2 py-0.5 rounded tracking-widest uppercase">PRECISION</span>
                        </div>
                        <p className="text-[9px] text-white/40 leading-relaxed uppercase">Lightweight & breathable knit weave optimized structured efficiency under warm Accra skies.</p>
                      </div>

                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-white">260 GSM Weight</span>
                          <span className="text-[8px] font-black bg-accent/20 text-accent px-2 py-0.5 rounded tracking-widest uppercase">COMMAND</span>
                        </div>
                        <p className="text-[9px] text-white/40 leading-relaxed uppercase">Premium heavyweight build providing structured posture drop, comfort, and standard command presence.</p>
                      </div>

                      <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-white">320 GSM Weight</span>
                          <span className="text-[8px] font-black bg-white text-black px-2 py-0.5 rounded tracking-widest uppercase">ARMOR</span>
                        </div>
                        <p className="text-[9px] text-white/40 leading-relaxed uppercase">The signature Ultima heavy knit drape. Absolute density shielding, incredible texture depth and long-term frame retention.</p>
                      </div>
                    </div>
                  </div>

                  {/* Garment Care Manual */}
                  <div className="bg-accent/5 rounded-[2rem] p-6 border border-accent/10 space-y-3">
                    <div className="flex items-center space-x-2 text-accent">
                      <ShieldCheck className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Garment Longevity Code</span>
                    </div>
                    <ul className="text-[9px] font-bold text-white/60 uppercase tracking-tight space-y-2 list-none pl-1">
                      <li>• COLD WASH ONLY (Inside out)</li>
                      <li>• AIR DRY (Never tumble dry premium drapes)</li>
                      <li>• IRON STEAM ONLY (Avoid print designs directly)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
