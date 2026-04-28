import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  Wallet, 
  Palette, 
  Link as LinkIcon, 
  Upload, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Copy,
  Plus,
  Zap,
  RefreshCw,
  Image as ImageIcon,
  Star,
  Verified,
  ChevronRight,
  CreditCard,
  Package,
  Users,
  Sparkles,
  ShieldCheck,
  Grid3X3,
  Maximize2,
  Trash2,
  Twitter,
  MessageCircle,
  Share2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import React from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, getDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { GSM } from '../types';
import { compressImage } from '../lib/imageUtils';
import { Link, useNavigate } from 'react-router-dom';
import { cn, formatGHC } from '@/src/lib/utils';
import { FABRIC_COLORS, GSM_OPTIONS } from '../constants';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';

// Model alias from skill: 'gemini-3-flash-preview' for basic text/image tasks
const MODEL_NAME = 'gemini-3-flash-preview';

interface DesignAuthorityCardProps {
  design: any;
  isUpdatingAsset: boolean;
  handleUpdateAsset: (productId: string, file: File, type: 'mockupImage' | 'studioImage' | 'blueprintImage') => Promise<void>;
  handleUpdateProductStatus: (productId: string, newStatus: 'approved' | 'rejected') => Promise<void>;
  handleDeleteProduct: (productId: string) => Promise<void>;
}

const DesignAuthorityCard: React.FC<DesignAuthorityCardProps> = ({ design, isUpdatingAsset, handleUpdateAsset, handleUpdateProductStatus, handleDeleteProduct }) => {
  const [view, setView] = useState<'mockup' | 'studio' | 'blueprint'>('mockup');
  const updateInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  return (
    <motion.div 
      key={design.id}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="glass p-6 rounded-[2rem] border border-white/5 hover:border-accent/20 transition-all flex flex-col group"
    >
      <div className="relative aspect-square rounded-2xl overflow-hidden mb-6 bg-black/40">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            <img 
              referrerPolicy="no-referrer"
              src={
                view === 'mockup' ? design.mockupImage : 
                view === 'studio' ? (design.studioImage || design.mockupImage) :
                (design.blueprintImage || design.mockupImage)
              } 
              alt="" 
              className={cn(
                "w-full h-full object-cover transition-all",
                view === 'mockup' ? "grayscale group-hover:grayscale-0" : ""
              )} 
            />
            {/* Upload Trigger for specific view */}
            <button 
              onClick={() => updateInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <div className="bg-accent p-3 rounded-full shadow-2xl">
                <Upload className={cn("w-6 h-6 text-black", isUpdatingAsset && "animate-spin")} />
              </div>
            </button>
          </motion.div>
        </AnimatePresence>

        <input 
          type="file" 
          hidden 
          ref={updateInputRef} 
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const typeMap = {
                'mockup': 'mockupImage',
                'studio': 'studioImage',
                'blueprint': 'blueprintImage'
              } as const;
              handleUpdateAsset(design.id, file, typeMap[view]);
            }
          }}
          accept="image/*"
        />

        <div className="absolute top-4 right-4 flex space-x-2">
          <button 
            onClick={() => setView('mockup')}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-xl border transition-all",
              view === 'mockup' ? "bg-accent border-accent text-black" : "bg-black/40 border-white/10 text-white/40"
            )}
          >
            <Grid3X3 className="w-3 h-3" />
          </button>
          <button 
            onClick={() => setView('studio')}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-xl border transition-all",
              view === 'studio' ? "bg-accent border-accent text-black" : "bg-black/40 border-white/10 text-white/40"
            )}
          >
            <Sparkles className="w-3 h-3" />
          </button>
          <button 
            onClick={() => setView('blueprint')}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-xl border transition-all",
              view === 'blueprint' ? "bg-accent border-accent text-black" : "bg-black/40 border-white/10 text-white/40"
            )}
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-6 pt-12">
          <p className="text-[8px] font-black uppercase tracking-widest text-accent mb-1">
            {view === 'mockup' ? 'Creative Blueprint' : view === 'studio' ? 'Studio Calibration' : 'Technical Blueprint'}
          </p>
          <p className="text-[10px] font-medium text-white/60 line-clamp-2 leading-relaxed">{design.description}</p>
        </div>
      </div>
      
      <div className="mb-8 px-2">
         <p className="text-lg font-display font-black uppercase italic text-white truncate mb-1">{design.name}</p>
         <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase text-accent tracking-tighter italic">by {design.agentName || 'Unknown'}</p>
              {design.studioImage && (
                <p className="text-[7px] font-black uppercase text-green-500 tracking-widest flex items-center gap-1 mt-1">
                  <ShieldCheck className="w-2 h-2" /> Studio Shoot Uploaded
                </p>
              )}
            </div>
            <p className="text-[10px] font-mono font-bold text-white/40">{formatGHC(design.basePrice)}</p>
         </div>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-3">
         <button 
           onClick={() => handleUpdateProductStatus(design.id, 'approved')}
           className="py-4 bg-accent text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_10px_20px_rgba(242,125,38,0.2)]"
         >
           Sanctify
         </button>
         <button 
           onClick={() => handleDeleteProduct(design.id)}
           className="py-4 bg-white/5 text-red-500 text-[9px] font-black uppercase tracking-widest rounded-xl border border-red-500/10 hover:bg-red-500 hover:text-white transition-all shadow-xl"
         >
           Purge
         </button>
      </div>
    </motion.div>
  );
};

export function AgentPortal() {
  const { user, agentProfile, loading, isBrandOwner } = useAuth();
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [isOwnerUploading, setIsOwnerUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ownerForm, setOwnerForm] = useState({
    name: '',
    description: '',
    basePrice: 150,
    category: 'T-Shirts',
    isPrivate: true,
    allowedColors: FABRIC_COLORS.map(c => c.name),
    gsmOptions: ['260'] as GSM[],
    gsmPrices: { '260': 150 } as Record<string, number>,
    colorImages: {} as Record<string, string>,
    colorStudioImages: {} as Record<string, string>,
    colorBlueprints: {} as Record<string, string>
  });
  const [activeColorTab, setActiveColorTab] = useState(FABRIC_COLORS[0].name);
  const [ownerPreview, setOwnerPreview] = useState<string | null>(null);
  const [ownerStudioPreview, setOwnerStudioPreview] = useState<string | null>(null);
  const [ownerBlueprintPreview, setOwnerBlueprintPreview] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'scanning' | 'pending' | 'success' | 'rejected'>('idle');
  const [scanResults, setScanResults] = useState<string | null>(null);
  const [myDesigns, setMyDesigns] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [totalCommission, setTotalCommission] = useState(0);
  const [referredAgents, setReferredAgents] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [allAgents, setAllAgents] = useState<any[]>([]);
  const [allDesigns, setAllDesigns] = useState<any[]>([]);
  const [momoNumber, setMomoNumber] = useState(agentProfile?.momoNumber || '');
  const [referralCode, setReferralCode] = useState(agentProfile?.referralCode || '');

  // Sync state with profile data
  useEffect(() => {
    if (agentProfile?.momoNumber) setMomoNumber(agentProfile.momoNumber);
    if (agentProfile?.referralCode) setReferralCode(agentProfile.referralCode);
  }, [agentProfile]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isUpdatingAsset, setIsUpdatingAsset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ownerFileInputRef = useRef<HTMLInputElement>(null);
  const ownerStudioInputRef = useRef<HTMLInputElement>(null);
  const ownerBlueprintInputRef = useRef<HTMLInputElement>(null);
  const colorMockupInputRef = useRef<HTMLInputElement>(null);
  const colorStudioInputRef = useRef<HTMLInputElement>(null);
  const colorBlueprintInputRef = useRef<HTMLInputElement>(null);

  const handleGenerateDesign = async () => {
    if (!genPrompt.trim() || !user) return;
    setIsGenerating(true);
    setGeneratedPreview(null);

    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('AI API Key not configured');
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const systemContext = `
        You are a specialized Streetwear Design AI for "Kings Clothing Brand". 
        Create a high-resolution, premium streetwear mockup image based on the user's concept.
        The design should feel heavy, authoritative, and regal. 
        Focus on bold typography, royal emblems, and minimalist but powerful aesthetics.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: `${systemContext}\n\nUser Concept: ${genPrompt}` }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      // Find the image part in the response candidates
      let foundImage = false;
      const candidates = (response as any).candidates;
      if (candidates && candidates[0]?.content?.parts) {
        for (const part of candidates[0].content.parts) {
          if (part.inlineData) {
            const base64Data = part.inlineData.data;
            setGeneratedPreview(`data:image/png;base64,${base64Data}`);
            foundImage = true;
            toast.success('Royal Design Forged!');
            break;
          }
        }
      }

      if (!foundImage) {
        throw new Error('AI failed to produce a visual blueprint. Refine your prompt.');
      }

    } catch (error: any) {
      console.error('Generation Error:', error);
      toast.error('Forge Failed: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleForgeIntoBlueprint = async () => {
    if (!generatedPreview || !user) return;
    
    try {
      await addDoc(collection(db, 'products'), {
        name: genPrompt.slice(0, 20) + '...',
        category: 'T-Shirts',
        description: `AI Generated concept: ${genPrompt}`,
        basePrice: 150,
        status: 'pending',
        agentId: user.uid,
        agentName: user.displayName,
        mockupImage: await compressImage(generatedPreview),
        allowedColors: FABRIC_COLORS.map(c => c.name),
        gsmOptions: ['260'],
        createdAt: serverTimestamp()
      });
      toast.success('Design Injected into Ledger!');
      setGeneratedPreview(null);
      setGenPrompt('');
    } catch (error: any) {
      toast.error('Injection failed: ' + error.message);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    // Fetch user's designs
    const qDesigns = query(collection(db, 'products'), where('agentId', '==', user.uid));
    const unsubscribeDesigns = onSnapshot(qDesigns, (snapshot) => {
      const designs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMyDesigns(designs);
    });

    // Fetch user's orders
    const qOrders = query(collection(db, 'orders'), where('customerId', '==', user.uid));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMyOrders(orders);
    });

    // Fetch referred agents
    const qReferred = query(collection(db, 'agents'), where('referredBy', '==', user.uid));
    const unsubscribeReferred = onSnapshot(qReferred, (snapshot) => {
      const agents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReferredAgents(agents);
    });

    // Fetch payouts
    const qPayouts = query(collection(db, 'payouts'), where('agentId', '==', user.uid));
    const unsubscribePayouts = onSnapshot(qPayouts, (snapshot) => {
      const p = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPayouts(p);
    });

    // Fetch Referrals (New tracking logic)
    const ordersQuery = isBrandOwner 
      ? query(collection(db, 'orders'), where('referralAgentId', '!=', null))
      : query(collection(db, 'orders'), where('referralAgentId', '==', user.uid));

    const unsubscribeReferrals = onSnapshot(ordersQuery, (snapshot) => {
      const referralList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReferrals(referralList);
      
      // Calculate commissions (10% of deposit for agents)
      const commission = referralList.reduce((acc, order: any) => {
        return acc + (order.depositAmount || 0) * 0.1;
      }, 0);
      setTotalCommission(commission);
    });

    // Fetch all orders for brand owner for management
    let unsubscribeAllOrders = () => {};
    if (isBrandOwner) {
      const allOrdersQuery = query(collection(db, 'orders'));
      unsubscribeAllOrders = onSnapshot(allOrdersQuery, (snapshot) => {
        setAllOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    // Fetch all agents for brand owner to track performance
    let unsubscribeAllAgents = () => {};
    let unsubscribeAllDesigns = () => {};
    if (isBrandOwner) {
      const agentsQuery = query(collection(db, 'agents'));
      unsubscribeAllAgents = onSnapshot(agentsQuery, (snapshot) => {
        setAllAgents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const designsQuery = query(collection(db, 'products'));
      unsubscribeAllDesigns = onSnapshot(designsQuery, (snapshot) => {
        setAllDesigns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    return () => {
      unsubscribeDesigns();
      unsubscribeOrders();
      unsubscribeReferred();
      unsubscribePayouts();
      unsubscribeReferrals();
      unsubscribeAllAgents();
      unsubscribeAllDesigns();
      unsubscribeAllOrders();
    };
  }, [user, isBrandOwner]);

  const totalReferredSales = useMemo(() => {
    return referredAgents.reduce((acc, agent) => acc + (agent.stats?.totalSales || 0), 0);
  }, [referredAgents]);

  const agentPerformance = useMemo(() => {
    if (!isBrandOwner) return [];
    return allAgents.map(agent => {
      // 1. Referral Stats (Marketing performance)
      const agentReferrals = referrals.filter(r => r.referralAgentId === agent.id);
      const successfulReferrals = agentReferrals.filter(r => r.status === 'completed');
      const referralRevenue = agentReferrals.reduce((acc, r) => acc + (r.totalAmount || 0), 0);
      const commissionPaid = agentReferrals.reduce((acc, r) => acc + (r.depositAmount || 0) * 0.1, 0);
      
      // 2. Design Stats (Creative performance)
      const agentDesigns = allDesigns.filter(d => d.agentId === agent.id);
      const approvedDesigns = agentDesigns.filter(d => d.status === 'approved');
      const approvalRate = agentDesigns.length > 0 
        ? (approvedDesigns.length / agentDesigns.length) * 100 
        : 0;

      // 3. Design Sales (Direct product interest)
      // Attribute sales specifically from designs this agent uploaded
      const designIds = new Set(agentDesigns.map(d => d.id));
      const salesFromDesigns = allOrders.filter(order => 
        order.items?.some((item: any) => designIds.has(item.productId))
      );
      const designRevenue = salesFromDesigns.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
      
      // 4. Overall Growth/Utility Score
      const growthRate = (referralRevenue + (designRevenue * 0.5)) > 0 
        ? ((referralRevenue + designRevenue) / 1000) * 100 // Arbitrary but based on volume
        : 0;

      return {
        ...agent,
        referralCount: agentReferrals.length,
        successfulCount: successfulReferrals.length,
        totalRevenue: referralRevenue + designRevenue, // Combined impact
        referralRevenue,
        designRevenue,
        commissionPaid,
        designCount: agentDesigns.length,
        approvedDesigns: approvedDesigns.length,
        approvalRate,
        growthRate: Math.min(100, growthRate)
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [allAgents, referrals, allDesigns, allOrders, isBrandOwner]);

  const pendingDesigns = useMemo(() => {
    if (!isBrandOwner) return [];
    return allDesigns.filter(d => d.status === 'pending');
  }, [allDesigns, isBrandOwner]);

  const stats = [
    { label: 'Total Sales', value: formatGHC(agentProfile?.stats?.totalSales || 0), icon: BarChart3, color: 'text-blue-500' },
    { label: 'Commission', value: formatGHC(agentProfile?.stats?.commissionEarned || 0), icon: Wallet, color: 'text-green-500' },
    { label: 'Network Revenue', value: formatGHC(totalReferredSales), icon: Zap, color: 'text-accent' },
    { label: 'Designs', value: agentProfile?.stats?.designsApproved || '0', icon: Palette, color: 'text-accent' },
    { label: 'Referred Signups', value: referredAgents.length.toString(), icon: Users, color: 'text-purple-500' },
  ];

  const chartData = useMemo(() => {
    // Standardize timeline for last 6 months
    const data = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = date.toLocaleString('default', { month: 'short' }).toUpperCase();
      data.push({
        name: monthLabel,
        sales: 0,
        commission: 0,
        designs: 0,
        month: date.getMonth(),
        year: date.getFullYear()
      });
    }

    // Map referrals (orders) into timeline
    referrals.forEach(order => {
      if (!order.createdAt) return;
      const date = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
      const entry = data.find(d => d.month === date.getMonth() && d.year === date.getFullYear());
      if (entry) {
        entry.sales += (order.totalAmount || 0);
        entry.commission += (order.depositAmount || 0) * 0.1;
      }
    });

    // Map designs into timeline
    myDesigns.forEach(design => {
      if (!design.createdAt || design.status !== 'approved') return;
      const date = design.createdAt.toDate ? design.createdAt.toDate() : new Date(design.createdAt);
      const entry = data.find(d => d.month === date.getMonth() && d.year === date.getFullYear());
      if (entry) {
        entry.designs += 1;
      }
    });

    return data;
  }, [referrals, myDesigns]);

  const shareLinks = useMemo(() => {
    if (!user) return { twitter: '', whatsapp: '' };
    const code = referralCode || user.uid;
    const link = `${window.location.origin}/shop?ref=${code}`;
    const text = "Armor for the Ambitious. Join Kings Clothing Brand through my referral link:";
    return {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + link)}`
    };
  }, [user, referralCode]);

  const handleCopyLink = () => {
    if (!user) return;
    const code = referralCode || user.uid;
    const link = `${window.location.origin}/shop?ref=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success('Referral Authority Link Copied', {
      icon: '🔗',
      style: {
        background: '#0a0a0a',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '1rem',
        fontSize: '10px',
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: '0.1em'
      }
    });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOwnerFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'mockup' | 'studio' | 'blueprint' | 'colorMockup' | 'colorStudio' | 'colorBlueprint' = 'mockup') => {
    const file = e.target.files?.[0];
    if (!file || !user || !isBrandOwner) return;

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;
      
      if (type === 'mockup') {
        setOwnerPreview(base64Data);
      } else if (type === 'studio') {
        setOwnerStudioPreview(base64Data);
      } else if (type === 'blueprint') {
        setOwnerBlueprintPreview(base64Data);
      } else if (type === 'colorMockup') {
        setOwnerForm(prev => ({
          ...prev,
          colorImages: { ...prev.colorImages, [activeColorTab]: base64Data }
        }));
      } else if (type === 'colorStudio') {
        setOwnerForm(prev => ({
          ...prev,
          colorStudioImages: { ...prev.colorStudioImages, [activeColorTab]: base64Data }
        }));
      } else if (type === 'colorBlueprint') {
        setOwnerForm(prev => ({
          ...prev,
          colorBlueprints: { ...prev.colorBlueprints, [activeColorTab]: base64Data }
        }));
      }
    } catch (error: any) {
      toast.error('Preview failed: ' + error.message);
    }
  };

  const handleOwnerFileUpload = async () => {
    if (!ownerPreview || !user || !isBrandOwner) return;
    if (!ownerForm.name.trim()) {
      toast.error('Identity required (Name)');
      return;
    }

    setIsOwnerUploading(true);
    setUploadProgress(5);
    try {
      setUploadProgress(15);
      const compressedMockup = await compressImage(ownerPreview);
      
      let finalStudioImage = ownerStudioPreview;
      let finalBlueprintImage = ownerBlueprintPreview;
      
      if (!finalStudioImage) {
        setUploadProgress(25);
        // AI Generation protocol for missing studio vision
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
          const studioPrompt = `
            High-end luxury studio photography of a premium streetwear ${ownerForm.category} product.
            Product Identity: ${ownerForm.name}.
            Aesthetic Vision: ${ownerForm.description}.
            Mood: Authoritative, minimalist, architectural lighting, sharp focus, clean urban studio background.
            Display: Professional flat lay or lifestyle presentation.
          `;

          const genResults = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: studioPrompt }] },
            config: { imageConfig: { aspectRatio: "4:3" } }
          });

          // Extract image from parts
          const candidates = (genResults as any).candidates;
          if (candidates && candidates[0]?.content?.parts) {
            for (const part of candidates[0].content.parts) {
              if (part.inlineData) {
                finalStudioImage = `data:image/png;base64,${part.inlineData.data}`;
                toast.success('AI Studio Vision Forged');
                break;
              }
            }
          }
        } catch (genError: any) {
          console.error('Studio Gen Error:', genError);
          toast.error('AI Vision Failed: Using Mockup for Studio');
        }
      }

      setUploadProgress(65);
      const compressedStudio = finalStudioImage ? await compressImage(finalStudioImage) : null;
      const compressedBlueprint = finalBlueprintImage ? await compressImage(finalBlueprintImage) : null;
      setUploadProgress(75);

      // Compress color-specific images
      const colorImages: Record<string, string> = {};
      const colorStudioImages: Record<string, string> = {};
      const colorBlueprints: Record<string, string> = {};

      for (const color of ownerForm.allowedColors) {
        if (ownerForm.colorImages[color]) {
          colorImages[color] = await compressImage(ownerForm.colorImages[color]);
        }
        if (ownerForm.colorStudioImages[color]) {
          colorStudioImages[color] = await compressImage(ownerForm.colorStudioImages[color]);
        }
        if (ownerForm.colorBlueprints[color]) {
          colorBlueprints[color] = await compressImage(ownerForm.colorBlueprints[color]);
        }
      }

      setUploadProgress(90);

      await addDoc(collection(db, 'products'), {
        name: ownerForm.name,
        category: ownerForm.category,
        description: ownerForm.description || 'Authorized Brand Owner Submission',
        basePrice: Number(ownerForm.basePrice),
        status: 'approved',
        agentId: user.uid,
        agentName: 'Kings Brand Owner',
        mockupImage: compressedMockup,
        studioImage: compressedStudio,
        blueprintImage: compressedBlueprint,
        isPrivate: ownerForm.isPrivate,
        allowedColors: ownerForm.allowedColors,
        gsmOptions: ownerForm.gsmOptions,
        gsmPrices: ownerForm.gsmPrices,
        colorImages,
        colorStudioImages,
        colorBlueprints,
        createdAt: serverTimestamp()
      });
      setUploadProgress(100);
      toast.success('Exclusive Authority Injected');
      setTimeout(() => {
        setOwnerPreview(null);
        setOwnerStudioPreview(null);
        setOwnerBlueprintPreview(null);
        setOwnerForm({
          name: '',
          description: '',
          basePrice: 150,
          category: 'T-Shirts',
          isPrivate: true,
          allowedColors: FABRIC_COLORS.map(c => c.name)
        });
        setUploadProgress(0);
      }, 500);
    } catch (error: any) {
      toast.error('Owner injection failed: ' + error.message);
      setUploadProgress(0);
    } finally {
      setIsOwnerUploading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'agents', user.uid), {
        momoNumber: momoNumber,
        referralCode: referralCode.toUpperCase().trim()
      });
      toast.success('Agent profile updated');
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!isBrandOwner) return;
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast.success(`Order ${orderId.slice(0, 8)} status updated to ${newStatus}`);
    } catch (error: any) {
      toast.error('Update failed: ' + error.message);
    }
  };

  const handleUpdateProductStatus = async (productId: string, newStatus: 'approved' | 'rejected') => {
    if (!isBrandOwner) return;
    try {
      const productDoc = await getDoc(doc(db, 'products', productId));
      const agentId = productDoc.data()?.agentId;

      await updateDoc(doc(db, 'products', productId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      if (newStatus === 'approved' && agentId) {
        await updateDoc(doc(db, 'agents', agentId), {
          'stats.designsApproved': increment(1)
        });
      }

      toast.success(`Design ${newStatus === 'approved' ? 'Sanctified' : 'Rejected'}`);
    } catch (error: any) {
      toast.error('Authority Override Failed: ' + error.message);
    }
  };

  const handleUpdateAsset = async (productId: string, file: File, type: 'mockupImage' | 'studioImage' | 'blueprintImage') => {
    if (!isBrandOwner || !user) return;
    setIsUpdatingAsset(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;
      const compressed = await compressImage(base64Data);

      await updateDoc(doc(db, 'products', productId), {
        [type]: compressed,
        updatedAt: serverTimestamp()
      });
      toast.success(`Product ${type.replace('Image', '')} Updated`);
    } catch (error: any) {
      toast.error('Update failed: ' + error.message);
    } finally {
      setIsUpdatingAsset(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to purge this design from the ledger? This action is irreversible.')) return;
    
    try {
      await deleteDoc(doc(db, 'products', productId));
      toast.success('Design purged from catalog');
    } catch (error: any) {
      console.error('Firestore Error details:', error);
      
      const errorInfo = {
        error: error.message,
        operationType: 'delete',
        path: `products/${productId}`,
        authInfo: {
          userId: user?.uid,
          email: user?.email,
          emailVerified: user?.emailVerified
        }
      };
      
      console.error('Structured Error:', JSON.stringify(errorInfo));
      toast.error('Purge failed: ' + error.message);
      throw new Error(JSON.stringify(errorInfo));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    setUploadStatus('scanning');
    setScanResults(null);

    // AI Verification Logic using Gemini
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('AI API Key not configured');
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const prompt = `
        You are the Kings Clothing Brand AI Validator. 
        Perform a surgical analysis of this design asset for:
        1. STREETWEAR RELEVANCE: Does it align with modern, high-end urban aesthetics?
        2. DESIGN QUALITY: Analysis of resolution, composition, and visual impact.
        3. BRAND ALIGNMENT: Check if it carries the "Kings" authority, mindset, or logo elements.
        
        Provide a verdict on whether this design is worthy of being forged into a blueprint.
      `;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { data: base64Data, mimeType: file.type } }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            required: ["passed", "reasoning", "suggestedName", "category"],
            properties: {
              passed: { type: Type.BOOLEAN, description: "Whether the design meets brand standards." },
              reasoning: { type: Type.STRING, description: "Detailed analysis of relevance, quality, and alignment." },
              suggestedName: { type: Type.STRING, description: "A high-impact name for the design." },
              category: { type: Type.STRING, description: "The most suitable clothing category." },
              score: { type: Type.NUMBER, description: "Authority Score (0-100)." }
            }
          }
        }
      });

      const result = JSON.parse(response.text);
      setScanResults(result.reasoning);

      if (result.passed) {
        setUploadStatus('success');
        // Persist to Firestore
        await addDoc(collection(db, 'products'), {
          name: result.suggestedName || 'Streetwear Concept',
          category: result.category || 'T-Shirts',
          description: result.reasoning,
          basePrice: 150,
          status: 'pending',
          agentId: user.uid,
          agentName: user.displayName,
          mockupImage: await compressImage(`data:${file.type};base64,${base64Data}`),
          allowedColors: FABRIC_COLORS.map(c => c.name),
          gsmOptions: ['260'],
          createdAt: serverTimestamp()
        });
        toast.success(`"${result.suggestedName}" (${result.category}) Injected: Royal Sanity Check Passed`);
      } else {
        setUploadStatus('rejected');
        toast.error('Authority Rejected');
      }

    } catch (error: any) {
      console.error('AI Scan Error:', error);
      toast.error('AI Scan failed: ' + error.message);
      setUploadStatus('idle');
    } finally {
      setIsUploading(false);
      // Auto-reset the console and status after a delay unless it was a success/rejection that needs viewing
      if (uploadStatus === 'scanning') {
         setTimeout(() => setUploadStatus('idle'), 3000);
      }
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black uppercase tracking-widest italic animate-pulse">Loading Identity...</div>;
  if (!user) return <div className="h-screen flex flex-col items-center justify-center space-y-4">
    <p className="text-black/40 font-bold uppercase tracking-widest">Unauthorized Access</p>
    <Link to="/auth" className="bg-black text-white px-8 py-4 rounded-full font-black uppercase tracking-widest text-xs">Initialize Sign In</Link>
  </div>;

  return (
    <main className="bg-background min-h-screen py-16 md:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-24">
        {/* Dashboard Header */}
        <header className="pb-16 border-b border-white/5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="max-w-3xl">
              <span className="text-accent text-[10px] font-black uppercase tracking-editorial mb-4 block">Central Command • {isBrandOwner ? 'Master Authority' : 'Verified Agent Identity'}</span>
              <h1 className="text-6xl sm:text-7xl md:text-9xl font-display font-black tracking-tighter uppercase italic leading-[0.8] mb-6">
                Kingdom Portal<span className="text-accent">.</span>
              </h1>
              {isBrandOwner ? (
                <div className="flex items-center space-x-3 text-accent bg-accent/5 px-6 py-3 rounded-2xl border border-accent/20 w-fit">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] italic">Full Sovereignty Recognized</span>
                </div>
              ) : (
                <div className="flex items-center space-x-3 text-white/40">
                  <Verified className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest italic">{user.email}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-6 bg-white/5 p-6 rounded-[2.5rem] border border-white/10 group hover:border-accent/40 transition-all duration-500">
               <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Session Active</p>
                  <p className="text-sm font-bold text-white group-hover:text-accent transition-colors">{user.displayName || 'Anonymous Agent'}</p>
               </div>
               <div className="w-16 h-16 rounded-[1.5rem] bg-accent flex items-center justify-center font-black text-2xl text-black shadow-xl shadow-accent/20 rotate-3 group-hover:rotate-0 transition-transform">
                  {user.displayName?.charAt(0) || 'K'}
               </div>
            </div>
          </div>
        </header>

        {/* Stats Grid - High Density Data */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { 
              label: 'Global Yield', 
              value: formatGHC(agentProfile?.stats?.totalSales || 0), 
              icon: Wallet, 
              color: 'text-accent',
              sub: 'Total Sales Volume'
            },
            { 
              label: 'Design Sovereignty', 
              value: myDesigns.length, 
              icon: Palette, 
              color: 'text-white',
              sub: 'Uploaded Blueprints'
            },
            { 
              label: 'Authority Network', 
              value: referredAgents.length, 
              icon: Users, 
              color: 'text-white',
              sub: 'Direct Referrals'
            },
            { 
              label: 'Royalty Reserve', 
              value: formatGHC(agentProfile?.stats?.commissionEarned || 0), 
              icon: BarChart3, 
              color: 'text-accent',
              sub: 'Available Commission'
            }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 border border-white/10 p-10 rounded-[2.5rem] relative overflow-hidden group hover:border-accent/30 transition-all"
            >
              <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <stat.icon className="w-24 h-24" strokeWidth={1} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4 italic">{stat.label}</p>
              <div className="flex items-end space-x-3 mb-2">
                <h4 className={cn("text-4xl font-mono font-black tracking-tighter", stat.color)}>{stat.value}</h4>
                <stat.icon className={cn("w-5 h-5 mb-1 opacity-40", stat.color)} />
              </div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/10 italic">{stat.sub}</p>
            </motion.div>
          ))}
        </section>

        {/* Uploaded and Approved Designs (Strategic Flow Replacement) */}
        <section className="space-y-12">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-12">
              <div className="max-w-xl">
                 <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-accent p-2 rounded-lg">
                       <Zap className="w-4 h-4 text-black" />
                    </div>
                    <span className="text-accent text-[10px] font-black uppercase tracking-editorial">Design Majesty Interface</span>
                 </div>
                 <h2 className="text-5xl font-display font-black uppercase italic tracking-tighter text-white">Collection Authority<span className="text-accent">.</span></h2>
                 <p className="text-white/40 text-[11px] leading-relaxed font-black uppercase tracking-tight italic mt-2">
                    Inject sovereign designs into the kingdom's catalog. Your blueprints undergo royal verification for brand alignment.
                 </p>
              </div>
              
              <div className="flex items-center gap-4">
                 <input type="file" hidden ref={fileInputRef} onChange={handleFileUpload} accept="image/*" />
                 <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="bg-white text-black px-12 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-accent transition-all flex items-center justify-center space-x-3 shadow-2xl active:scale-95 disabled:opacity-50"
                 >
                    {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span>{isUploading ? 'Scanning Assets...' : 'Inject New Blueprint'}</span>
                 </button>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
              {/* Design Inventory Ledger */}
              <div className="lg:col-span-3 space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {/* Active/Pending Card View */}
                    {myDesigns.length === 0 ? (
                       <div className="col-span-full py-32 text-center border-4 border-dashed border-white/5 rounded-[3rem] opacity-30">
                          <Palette className="w-16 h-16 mx-auto mb-6 text-white/20" />
                          <p className="text-sm font-black uppercase tracking-[0.3em] italic">No sovereign assets detected in your repository.</p>
                       </div>
                    ) : (
                       myDesigns.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).map((design) => (
                          <motion.div 
                             key={design.id}
                             whileHover={{ y: -8 }}
                             className="group bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col hover:border-accent/40 transition-all duration-500 shadow-xl shadow-black/20"
                          >
                             <div className="aspect-[4/5] relative overflow-hidden bg-black/40">
                                <img 
                                   src={design.mockupImage} 
                                   alt={design.name} 
                                   className={cn(
                                      "w-full h-full object-cover transition-all duration-1000 group-hover:scale-110",
                                      design.status === 'pending' ? "grayscale blur-[2px]" : "grayscale-0"
                                   )}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60" />
                                
                                {/* Status Overlay */}
                                <div className={cn(
                                   "absolute top-6 right-6 px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border backdrop-blur-md shadow-2xl",
                                   design.status === 'approved' ? "bg-green-500/10 border-green-500/20 text-green-500" :
                                   design.status === 'rejected' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                                   "bg-accent/10 border-accent/20 text-accent animate-pulse"
                                )}>
                                   {design.status}
                                </div>

                                <div className="absolute bottom-6 left-6 right-6 space-y-2">
                                   <p className="text-white text-lg font-black uppercase italic tracking-tighter leading-none truncate">{design.name}</p>
                                   <div className="flex items-center justify-between">
                                      <p className="text-accent font-mono font-black text-xs">{formatGHC(design.basePrice || 150)}</p>
                                      <span className="text-[8px] font-black uppercase text-white/20 tracking-widest">{design.category}</span>
                                   </div>
                                </div>
                             </div>

                             <div className="p-6 bg-white/5 grid grid-cols-2 gap-4">
                                <button
                                   onClick={() => navigate(`/product/${design.id}`)}
                                   className="py-3 rounded-xl border border-white/10 text-[8px] font-black uppercase tracking-widest text-white/40 hover:bg-white hover:text-black transition-all"
                                >
                                   Inspect
                                </button>
                                <button
                                   onClick={() => handleDeleteProduct(design.id)}
                                   className="py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[8px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                                >
                                   <Trash2 className="w-3.5 h-3.5" />
                                </button>
                             </div>
                          </motion.div>
                       ))
                    )}
                 </div>
              </div>

              {/* Authority Summary Sidebar (Within Section) */}
              <div className="space-y-8">
                 <div className="bg-accent/5 border border-accent/20 p-8 rounded-[2.5rem] space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-editorial text-accent italic">Authority Status</h3>
                    <div className="space-y-6">
                       <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-white/40">
                          <span>Verified Designs</span>
                          <span className="text-white">{myDesigns.filter(d => d.status === 'approved').length}</span>
                       </div>
                       <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-white/40">
                          <span>Pending Review</span>
                          <span className="text-accent">{myDesigns.filter(d => d.status === 'pending').length}</span>
                       </div>
                       <div className="pt-4 border-t border-accent/10">
                          <div className="flex items-center space-x-3 mb-2">
                             <ShieldCheck className="w-4 h-4 text-accent" />
                             <span className="text-[10px] font-black uppercase tracking-widest text-white">Trust Quotient</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                             <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(myDesigns.filter(d => d.status === 'approved').length / (myDesigns.length || 1)) * 100}%` }}
                                className="h-full bg-accent" 
                             />
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] text-center">
                    <ImageIcon className="w-8 h-8 text-white/10 mx-auto mb-4" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/20 leading-relaxed italic">
                       Professional high-resolution assets result in 40% faster verification cycles.
                    </p>
                 </div>
              </div>
           </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-8 space-y-24">
            {/* Master Studio Terminal (Brand Owner Only) */}
            {isBrandOwner && (
              <section className="bg-white p-8 md:p-16 rounded-[4rem] text-black relative border-8 border-black shadow-[0_40px_80px_rgba(0,0,0,0.5)] overflow-hidden">
                <div className="absolute -right-8 -top-8 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col lg:flex-row gap-16">
                  <div className="lg:w-3/5 space-y-12">
                    <div className="flex items-center space-x-6">
                      <div className="bg-black p-5 rounded-[2rem] shadow-xl">
                        <Palette className="w-10 h-10 text-white" />
                      </div>
                      <div>
                        <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter leading-none mb-2">Master Studio<span className="text-accent">.</span></h2>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Direct Injection Protocol • Authority Level: Absolute</p>
                      </div>
                    </div>
                    
                    <div className="space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-3">
                             <label className="text-[10px] font-black uppercase tracking-widest text-black/40 px-2 italic">Blueprint Identity</label>
                             <input 
                               type="text"
                               value={ownerForm.name}
                               onChange={(e) => setOwnerForm({...ownerForm, name: e.target.value})}
                               placeholder="e.g. Royal Syndicate Tee"
                               className="w-full bg-black/5 border-2 border-black/5 rounded-2xl p-5 text-sm font-bold tracking-tight focus:border-accent focus:bg-white outline-none transition-all"
                             />
                          </div>
                          <div className="space-y-3">
                             <label className="text-[10px] font-black uppercase tracking-widest text-black/40 px-2 italic">Inventory Column</label>
                             <select 
                               value={ownerForm.category}
                               onChange={(e) => setOwnerForm({...ownerForm, category: e.target.value})}
                               className="w-full bg-black/5 border-2 border-black/5 rounded-2xl p-5 text-sm font-bold uppercase tracking-tight focus:border-accent focus:bg-white outline-none appearance-none cursor-pointer transition-all"
                             >
                               <option value="T-Shirts">T-Shirts</option>
                               <option value="Hoodies">Hoodies</option>
                               <option value="Sweatshirts">Sweatshirts</option>
                               <option value="Accessories">Accessories</option>
                               <option value="Exclusive">Exclusive</option>
                               <option value="Streetwear">Streetwear</option>
                             </select>
                          </div>
                       </div>

                       <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-black/40 px-2 italic">Allowed Fabric Spectrum</label>
                          <div className="flex flex-wrap gap-4 p-4 bg-black/5 rounded-2xl border-2 border-black/5">
                             {FABRIC_COLORS.map(color => (
                                <button
                                   key={color.name}
                                   type="button"
                                   onClick={() => {
                                      const current = ownerForm.allowedColors || [];
                                      if (current.includes(color.name)) {
                                         if (current.length > 1) {
                                            setOwnerForm({...ownerForm, allowedColors: current.filter(c => c !== color.name)});
                                         } else {
                                            toast.error('Identity requires at least one shade');
                                         }
                                      } else {
                                         setOwnerForm({...ownerForm, allowedColors: [...current, color.name]});
                                      }
                                   }}
                                   className={cn(
                                      "group relative flex items-center space-x-3 px-4 py-3 rounded-xl border-2 transition-all",
                                      ownerForm.allowedColors?.includes(color.name) 
                                       ? "border-accent bg-accent/10 shadow-[0_0_15px_rgba(242,125,38,0.1)]" 
                                       : "border-black/5 hover:border-black/10"
                                   )}
                                >
                                   <div className="w-4 h-4 rounded-full shadow-inner border border-black/10" style={{ backgroundColor: color.hex }} />
                                   <span className={cn(
                                      "text-[10px] font-black uppercase tracking-widest transition-colors",
                                      ownerForm.allowedColors?.includes(color.name) ? "text-accent" : "text-black/40"
                                   )}>{color.name}</span>
                                   {ownerForm.allowedColors?.includes(color.name) && (
                                      <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-accent rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                                         <CheckCircle2 className="w-2.5 h-2.5 text-black" strokeWidth={4} />
                                      </div>
                                   )}
                                </button>
                             ))}
                          </div>
                       </div>

                       {/* Color Specific Assets */}
                       <div className="space-y-6 p-6 bg-black/5 rounded-[2.5rem] border-4 border-black/5">
                          <div className="flex items-center justify-between px-2">
                             <div className="flex items-center space-x-3">
                                <Palette className="w-4 h-4 text-accent" />
                                <label className="text-[10px] font-black uppercase tracking-widest text-black/40 italic">Color-Specific Assets</label>
                             </div>
                             <span className="text-[8px] font-black text-accent uppercase tracking-widest bg-accent/10 px-3 py-1 rounded-full italic">High Fidelity Protocol</span>
                          </div>

                          <div className="flex flex-wrap gap-2 p-2 bg-white/5 rounded-2xl overflow-x-auto">
                             {ownerForm.allowedColors.map(colorName => (
                                <button
                                   key={colorName}
                                   type="button"
                                   onClick={() => setActiveColorTab(colorName)}
                                   className={cn(
                                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                      activeColorTab === colorName ? "bg-accent text-black shadow-lg" : "text-black/40 hover:text-black"
                                   )}
                                >
                                   {colorName}
                                </button>
                             ))}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <div className="space-y-4">
                                <p className="text-[9px] font-black uppercase tracking-widest text-black/30 px-2">Mockup (Blueprint)</p>
                                <div 
                                   onClick={() => colorMockupInputRef.current?.click()}
                                   className="aspect-square bg-white border-2 border-dashed border-black/10 rounded-2xl overflow-hidden cursor-pointer hover:border-accent transition-all relative group"
                                >
                                   {ownerForm.colorImages[activeColorTab] ? (
                                      <img src={ownerForm.colorImages[activeColorTab]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                   ) : (
                                      <div className="w-full h-full flex flex-col items-center justify-center text-black/20">
                                         <Upload className="w-6 h-6 mb-2" />
                                         <span className="text-[8px] font-black uppercase tracking-widest text-center px-4">Upload Blueprint</span>
                                      </div>
                                   )}
                                </div>
                             </div>

                             <div className="space-y-4">
                                <p className="text-[9px] font-black uppercase tracking-widest text-black/30 px-2">Studio Shoot</p>
                                <div 
                                   onClick={() => colorStudioInputRef.current?.click()}
                                   className="aspect-square bg-white border-2 border-dashed border-black/10 rounded-2xl overflow-hidden cursor-pointer hover:border-accent transition-all relative group"
                                >
                                   {ownerForm.colorStudioImages[activeColorTab] ? (
                                      <img src={ownerForm.colorStudioImages[activeColorTab]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                   ) : (
                                      <div className="w-full h-full flex flex-col items-center justify-center text-black/20">
                                         <Sparkles className="w-6 h-6 mb-2" />
                                         <span className="text-[8px] font-black uppercase tracking-widest text-center px-4">Upload Studio</span>
                                      </div>
                                   )}
                                </div>
                             </div>

                             <div className="space-y-4">
                                <p className="text-[9px] font-black uppercase tracking-widest text-black/30 px-2">Technical Blueprint</p>
                                <div 
                                   onClick={() => colorBlueprintInputRef.current?.click()}
                                   className="aspect-square bg-white border-2 border-dashed border-black/10 rounded-2xl overflow-hidden cursor-pointer hover:border-accent transition-all relative group"
                                >
                                   {ownerForm.colorBlueprints[activeColorTab] ? (
                                      <img src={ownerForm.colorBlueprints[activeColorTab]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                   ) : (
                                      <div className="w-full h-full flex flex-col items-center justify-center text-black/20">
                                         <ImageIcon className="w-6 h-6 mb-2" />
                                         <span className="text-[8px] font-black uppercase tracking-widest text-center px-4">Upload Tech</span>
                                      </div>
                                   )}
                                </div>
                             </div>
                          </div>

                          <input type="file" hidden ref={colorMockupInputRef} onChange={(e) => handleOwnerFileSelect(e, 'colorMockup')} accept="image/*" />
                          <input type="file" hidden ref={colorStudioInputRef} onChange={(e) => handleOwnerFileSelect(e, 'colorStudio')} accept="image/*" />
                          <input type="file" hidden ref={colorBlueprintInputRef} onChange={(e) => handleOwnerFileSelect(e, 'colorBlueprint')} accept="image/*" />
                       </div>

                       <div className="space-y-6 p-6 bg-black/5 rounded-[2.5rem] border-4 border-black/5">
                          <div className="flex items-center justify-between px-2">
                             <div className="flex items-center space-x-3">
                                <ShieldCheck className="w-4 h-4 text-accent" />
                                <label className="text-[10px] font-black uppercase tracking-widest text-black/40 italic">Structural Weights (GSM)</label>
                             </div>
                             <span className="text-[8px] font-black text-accent uppercase tracking-widest bg-accent/10 px-3 py-1 rounded-full italic">High-Security Logic</span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                             {GSM_OPTIONS.map(gsm => (
                                <button
                                   key={gsm}
                                   type="button"
                                   onClick={() => {
                                      const currentOptions = ownerForm.gsmOptions || [];
                                      const currentPrices = ownerForm.gsmPrices || {};
                                      if (currentOptions.includes(gsm as GSM)) {
                                         if (currentOptions.length > 1) {
                                            const nextOptions = currentOptions.filter(o => o !== gsm);
                                            const nextPrices = { ...currentPrices };
                                            delete nextPrices[gsm];
                                            setOwnerForm({ ...ownerForm, gsmOptions: nextOptions, gsmPrices: nextPrices });
                                         } else {
                                            toast.error('Identity requires at least one GSM weight');
                                         }
                                      } else {
                                         setOwnerForm({ 
                                            ...ownerForm, 
                                            gsmOptions: [...currentOptions, gsm as GSM],
                                            gsmPrices: { ...currentPrices, [gsm]: ownerForm.basePrice }
                                         });
                                      }
                                   }}
                                   className={cn(
                                      "group relative flex flex-col items-center p-6 rounded-3xl border-2 transition-all duration-500 overflow-hidden",
                                      ownerForm.gsmOptions?.includes(gsm as GSM)
                                       ? "border-accent bg-accent/5 shadow-2xl scale-105" 
                                       : "border-black/5 hover:border-black/10"
                                   )}
                                >
                                   <div className={cn(
                                      "mb-3 p-3 rounded-xl transition-all duration-500",
                                      ownerForm.gsmOptions?.includes(gsm as GSM) ? "bg-accent text-black shadow-lg" : "bg-black/10 text-black/20"
                                   )}>
                                      <Zap className="w-4 h-4" />
                                   </div>
                                   <span className={cn(
                                      "text-xs font-black uppercase italic tracking-tighter mb-1",
                                      ownerForm.gsmOptions?.includes(gsm as GSM) ? "text-black" : "text-black/40"
                                   )}>{gsm} GSM</span>
                                   {ownerForm.gsmOptions?.includes(gsm as GSM) && (
                                      <div className="absolute top-2 right-2">
                                         <CheckCircle2 className="w-3 h-3 text-accent" />
                                      </div>
                                   )}
                                </button>
                             ))}
                          </div>

                          {/* Dynamic GSM Pricing Console */}
                          <AnimatePresence>
                             {ownerForm.gsmOptions?.length > 1 && (
                                <motion.div 
                                   initial={{ opacity: 0, y: 10 }}
                                   animate={{ opacity: 1, y: 0 }}
                                   exit={{ opacity: 0, y: 10 }}
                                   className="space-y-4 pt-4 border-t border-black/5"
                                >
                                   <div className="flex items-center space-x-2 px-2">
                                      <CreditCard className="w-3 h-3 text-accent" />
                                      <label className="text-[9px] font-black uppercase tracking-widest text-black/40 italic">Economic Authority per GSM</label>
                                   </div>
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {ownerForm.gsmOptions.map(gsm => (
                                         <div key={`price-${gsm}`} className="relative bg-white border-2 border-black/5 rounded-2xl p-4 shadow-sm group hover:border-accent transition-all">
                                            <div className="flex items-center justify-between mb-2">
                                               <span className="text-[8px] font-black uppercase tracking-widest text-black/30 italic">Weight: {gsm} GSM</span>
                                               <span className="text-[10px] font-black text-accent">{formatGHC(ownerForm.gsmPrices[gsm] || 0)}</span>
                                            </div>
                                            <div className="relative">
                                               <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-black/20 text-xs">₵</span>
                                               <input 
                                                  type="number"
                                                  value={ownerForm.gsmPrices[gsm] || ''}
                                                  onChange={(e) => {
                                                     const val = Number(e.target.value);
                                                     setOwnerForm({
                                                        ...ownerForm,
                                                        gsmPrices: { ...ownerForm.gsmPrices, [gsm]: val }
                                                     });
                                                  }}
                                                  className="w-full bg-black/5 border border-transparent rounded-xl p-3 pl-8 text-xs font-black outline-none focus:bg-white focus:border-accent transition-all"
                                               />
                                            </div>
                                         </div>
                                      ))}
                                   </div>
                                </motion.div>
                             )}
                          </AnimatePresence>
                       </div>

                       <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-black/40 px-2 italic">Aesthetic Vision (Description)</label>
                          <textarea 
                             value={ownerForm.description}
                             onChange={(e) => setOwnerForm({...ownerForm, description: e.target.value})}
                             placeholder="Capture the essence of the craftsmanship..."
                             className="w-full bg-black/5 border-2 border-black/5 rounded-2xl p-5 text-sm font-medium leading-relaxed focus:border-accent focus:bg-white outline-none min-h-[120px] resize-none transition-all"
                          />
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-3">
                             <label className="text-[10px] font-black uppercase tracking-widest text-black/40 px-2 italic">Base Valuation (GHS)</label>
                             <div className="relative">
                               <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-black/20">₵</span>
                               <input 
                                 type="number"
                                 value={ownerForm.basePrice}
                                 onChange={(e) => setOwnerForm({...ownerForm, basePrice: Number(e.target.value)})}
                                 className="w-full bg-black/5 border-2 border-black/5 rounded-2xl p-5 pl-12 text-sm font-bold focus:border-accent focus:bg-white outline-none transition-all"
                               />
                             </div>
                          </div>
                          
                          <div 
                             onClick={() => setOwnerForm({...ownerForm, isPrivate: !ownerForm.isPrivate})}
                             className={cn(
                               "flex items-center justify-between p-6 rounded-[2rem] border-4 transition-all cursor-pointer group/toggle relative overflow-hidden",
                               ownerForm.isPrivate 
                                ? "bg-accent/10 border-accent shadow-[0_0_30px_rgba(242,125,38,0.2)]" 
                                : "bg-black/5 border-black/10 hover:border-black/20"
                             )}
                          >
                             {ownerForm.isPrivate && (
                                <motion.div 
                                   initial={{ opacity: 0 }}
                                   animate={{ opacity: 1 }}
                                   className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent pointer-events-none"
                                />
                             )}
                             <div className="flex items-center space-x-5 relative z-10">
                                <div className={cn(
                                   "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                                   ownerForm.isPrivate ? "bg-accent text-black rotate-[360deg]" : "bg-black/10 text-black/40"
                                )}>
                                   {ownerForm.isPrivate ? <ShieldCheck className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                                </div>
                                <div className="flex flex-col">
                                   <span className={cn(
                                      "text-xs font-black uppercase tracking-[0.2em] mb-1 transition-colors",
                                      ownerForm.isPrivate ? "text-accent" : "text-black/40"
                                   )}>
                                      {ownerForm.isPrivate ? "Private Vault" : "Public Market"}
                                   </span>
                                   <span className="text-[8px] font-black uppercase tracking-widest text-black/30">
                                      {ownerForm.isPrivate ? "Authorized Access Only" : "Visible to Global Clients"}
                                   </span>
                                </div>
                             </div>
                             <div className={cn(
                                "w-4 h-4 rounded-full transition-all duration-500",
                                ownerForm.isPrivate ? "bg-accent shadow-[0_0_15px_rgba(242,125,38,0.5)] scale-125" : "bg-black/20"
                             )} />
                          </div>
                       </div>
                    </div>

                    <div className="flex flex-col gap-4 pt-4">
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <input type="file" hidden ref={ownerFileInputRef} onChange={(e) => handleOwnerFileSelect(e, 'mockup')} accept="image/*" />
                          <button
                            onClick={() => ownerFileInputRef.current?.click()}
                            className="bg-black text-white px-6 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-accent hover:text-black transition-all flex items-center justify-center gap-3 active:scale-95 border-2 border-black"
                          >
                            <Upload className="w-4 h-4" />
                            <span>{ownerPreview ? 'Change Mockup' : 'Blueprint Image'}</span>
                          </button>

                          <input type="file" hidden ref={ownerStudioInputRef} onChange={(e) => handleOwnerFileSelect(e, 'studio')} accept="image/*" />
                          <button
                            onClick={() => ownerStudioInputRef.current?.click()}
                            className="bg-black/5 border-2 border-black/10 text-black px-6 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white hover:border-black transition-all flex items-center justify-center gap-3 active:scale-95"
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>{ownerStudioPreview ? 'Change Studio' : 'Studio Image'}</span>
                          </button>

                          <input type="file" hidden ref={ownerBlueprintInputRef} onChange={(e) => handleOwnerFileSelect(e, 'blueprint')} accept="image/*" />
                          <button
                            onClick={() => ownerBlueprintInputRef.current?.click()}
                            className="bg-black/5 border-2 border-black/10 text-black px-6 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white hover:border-black transition-all flex items-center justify-center gap-3 active:scale-95"
                          >
                            <ImageIcon className="w-4 h-4" />
                            <span>{ownerBlueprintPreview ? 'Change Tech' : 'Tech Blueprint'}</span>
                          </button>
                       </div>

                       {ownerPreview && (
                          <div className="space-y-4">
                             {isOwnerUploading && (
                                <div className="p-4 bg-accent/10 border border-accent/20 rounded-2xl">
                                   <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-accent mb-2">
                                      <span>Uploading Authority...</span>
                                      <span>{uploadProgress}%</span>
                                   </div>
                                   <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                                      <motion.div 
                                         className="h-full bg-accent"
                                         initial={{ width: 0 }}
                                         animate={{ width: `${uploadProgress}%` }}
                                      />
                                   </div>
                                </div>
                             )}
                             <button
                               onClick={handleOwnerFileUpload}
                               disabled={isOwnerUploading || !ownerPreview}
                               className="w-full bg-accent text-black px-8 py-6 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black hover:text-white transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-50"
                             >
                               {isOwnerUploading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                               <span>Initialise Direct Injection</span>
                             </button>
                          </div>
                       )}
                    </div>
                  </div>

                  <div className="lg:w-2/5 space-y-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/20 italic">Visual Authentication Check</p>
                    <div className="grid grid-cols-1 gap-6">
                       <div className="aspect-square bg-black/5 rounded-[2.5rem] border-4 border-dashed border-black/10 overflow-hidden relative group/mockup">
                          {ownerPreview ? (
                             <img 
                              src={ownerPreview} 
                              alt="Mockup" 
                              className="w-full h-full object-cover transition-transform duration-700 group-hover/mockup:scale-110" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center text-black/10">
                                <ImageIcon className="w-16 h-16 mb-4" strokeWidth={1} />
                                <span className="text-[10px] font-bold uppercase tracking-tighter">Mockup Missing</span>
                             </div>
                          )}
                          <div className="absolute top-6 left-6 px-3 py-1.5 bg-black text-white text-[8px] font-black uppercase tracking-widest rounded-lg">Blueprint Preview</div>
                       </div>
                       
                       <div className="aspect-[16/9] bg-black/5 rounded-[2rem] border-4 border-dashed border-black/10 overflow-hidden relative group/studio">
                          {ownerStudioPreview ? (
                             <img 
                               src={ownerStudioPreview} 
                               alt="Studio" 
                               className="w-full h-full object-cover transition-transform duration-700 group-hover/studio:scale-110" 
                               referrerPolicy="no-referrer"
                             />
                          ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center text-black/10">
                                <Sparkles className="w-10 h-10 mb-2" strokeWidth={1} />
                                <span className="text-[8px] font-bold uppercase tracking-tighter">Studio Visual Optional</span>
                             </div>
                          )}
                          <div className="absolute top-4 left-4 px-2 py-1 bg-black/40 backdrop-blur-md text-white text-[7px] font-black uppercase tracking-widest rounded-lg">Studio Preview</div>
                       </div>

                       <div className="aspect-[16/9] bg-black/5 rounded-[2rem] border-4 border-dashed border-black/10 overflow-hidden relative group/blueprint">
                          {ownerBlueprintPreview ? (
                             <img 
                               src={ownerBlueprintPreview} 
                               alt="Tech" 
                               className="w-full h-full object-cover transition-transform duration-700 group-hover/blueprint:scale-110" 
                               referrerPolicy="no-referrer"
                             />
                          ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center text-black/10">
                                <ImageIcon className="w-10 h-10 mb-2" strokeWidth={1} />
                                <span className="text-[8px] font-bold uppercase tracking-tighter">Tech Blueprint Optional</span>
                             </div>
                          )}
                          <div className="absolute top-4 left-4 px-2 py-1 bg-black/40 backdrop-blur-md text-white text-[7px] font-black uppercase tracking-widest rounded-lg">Tech Preview</div>
                       </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Product Ledger (Brand Owner Only) */}
            {isBrandOwner && (
               <section className="bg-white/5 border border-white/10 p-8 md:p-16 rounded-[3.5rem] text-white space-y-12 overflow-hidden shadow-2xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-8 pb-8 border-b border-white/5">
                     <div className="flex items-center space-x-6">
                        <div className="bg-accent/20 p-5 rounded-3xl border border-accent/20">
                           <Package className="w-10 h-10 text-accent" />
                        </div>
                        <div>
                           <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter">Private Ledger</h2>
                           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 italic">High-Security Product Vault</p>
                        </div>
                     </div>
                     <div className="flex gap-4">
                        <div className="bg-white/5 border border-white/10 px-8 py-5 rounded-2xl text-center min-w-[140px]">
                           <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mb-1">Vault Inventory</p>
                           <p className="text-3xl font-display font-black text-white">{myDesigns.filter(p => p.isPrivate).length}</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 px-8 py-5 rounded-2xl text-center min-w-[140px]">
                           <p className="text-[8px] font-black uppercase tracking-widest text-white/30 mb-1">Global Active</p>
                           <p className="text-3xl font-display font-black text-accent">{myDesigns.filter(p => !p.isPrivate).length}</p>
                        </div>
                     </div>
                  </div>

                  <div className="bg-black/40 rounded-[2.5rem] border border-white/5 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[800px]">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/5">
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-white/40">Blueprint Identity</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-white/40">Type</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-white/40">Visibility</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-white/40">Base Price</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-white/40 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {myDesigns.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-10 py-32 text-center">
                                <p className="text-sm font-bold uppercase tracking-[0.4em] text-white/10 italic">No blueprints detected in vault.</p>
                              </td>
                            </tr>
                          ) : (
                            myDesigns.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).map((product) => (
                              <tr key={product.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                <td className="px-8 py-6">
                                   <div className="flex items-center space-x-4">
                                      <div className="w-12 h-12 rounded-xl bg-white/5 overflow-hidden border border-white/10 group-hover:border-accent/40 transition-colors">
                            <img 
                             src={product.mockupImage} 
                             alt="" 
                             className="w-full h-full object-cover grayscale brightness-75 group-hover:grayscale-0 group-hover:brightness-100 transition-all" 
                             referrerPolicy="no-referrer"
                           />
                                      </div>
                                      <div>
                                         <p className="text-sm font-bold text-white mb-0.5 group-hover:text-accent transition-colors">{product.name}</p>
                                         <p className="text-[8px] font-black uppercase text-white/20 tracking-tighter italic">ID: {product.id.slice(0, 12).toUpperCase()}</p>
                                      </div>
                                   </div>
                                </td>
                                <td className="px-8 py-6">
                                   <span className="text-[10px] font-bold text-white/60 tracking-tight">{product.category}</span>
                                </td>
                                <td className="px-8 py-6">
                                   <div className="flex items-center space-x-2">
                                      <div className={cn("w-1.5 h-1.5 rounded-full", product.isPrivate ? "bg-accent shadow-[0_0_8px_rgba(242,125,38,0.5)]" : "bg-green-500")} />
                                      <p className="text-[8px] font-black uppercase tracking-widest text-white/40">
                                         {product.isPrivate ? "Vaulted (Private)" : "Global (Public)"}
                                      </p>
                                   </div>
                                </td>
                                <td className="px-8 py-6">
                                   <p className="text-sm font-mono font-black text-accent">{formatGHC(product.basePrice || 0)}</p>
                                </td>
                                <td className="px-8 py-6 text-right">
                                  <div className="flex justify-end items-center space-x-6">
                                     <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {[
                                          { type: 'mockupImage', icon: Grid3X3, label: 'B' },
                                          { type: 'studioImage', icon: Sparkles, label: 'S' },
                                          { type: 'blueprintImage', icon: Maximize2, label: 'T' }
                                        ].map((asset) => (
                                           <div key={asset.type} className="relative group/asset">
                                              <button 
                                                 onClick={() => {
                                                    const input = document.createElement('input');
                                                    input.type = 'file';
                                                    input.accept = 'image/*';
                                                    input.onchange = (e) => {
                                                       const file = (e.target as HTMLInputElement).files?.[0];
                                                       if (file) handleUpdateAsset(product.id, file, asset.type as any);
                                                    };
                                                    input.click();
                                                 }}
                                                 className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-accent hover:border-accent hover:text-black transition-all"
                                              >
                                                 <asset.icon className="w-3 h-3" />
                                              </button>
                                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-[7px] font-black uppercase tracking-widest rounded opacity-0 group-hover/asset:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50">
                                                 Update {asset.label}
                                              </span>
                                           </div>
                                        ))}
                                     </div>
                                     
                                     <div className="flex justify-end space-x-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                           onClick={() => navigate(`/product/${product.id}`)}
                                           className="text-[9px] font-black uppercase tracking-widest text-accent hover:underline"
                                        >
                                           Inspect
                                        </button>
                                      <button 
                                         onClick={async () => {
                                            try {
                                               await updateDoc(doc(db, 'products', product.id), {
                                                  isPrivate: !product.isPrivate,
                                                  updatedAt: serverTimestamp()
                                               });
                                               toast.success('Visibility modified in ledger');
                                            } catch (e: any) {
                                               toast.error('Modification failed: ' + e.message);
                                            }
                                         }}
                                         className="text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white"
                                      >
                                         Toggle Visibility
                                      </button>
                                      <button 
                                         onClick={() => handleDeleteProduct(product.id)}
                                         className="text-[9px] font-black uppercase tracking-widest text-red-500/60 hover:text-red-500"
                                      >
                                         Purge
                                      </button>
                                   </div>
                                 </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
               </section>
            )}

            {/* Referral Tracking Dashboard (Brand Owner Only) */}
            {isBrandOwner && (
              <div className="space-y-12">
                {/* Design Authority Review */}
                <div className="bg-white/5 border border-white/10 p-8 md:p-16 rounded-[3.5rem] text-white">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                      <div className="flex items-center space-x-6">
                         <div className="bg-accent/20 p-5 rounded-3xl border border-accent/20">
                            <ShieldCheck className="w-10 h-10 text-accent" />
                         </div>
                         <div>
                            <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter">Design Authority Review</h2>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Sanctifying Agent Submissions</p>
                         </div>
                      </div>
                      <div className="bg-white/5 border border-white/10 px-8 py-5 rounded-2xl">
                         <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Pending Review</p>
                         <p className="text-2xl font-mono font-black text-white">{pendingDesigns.length} Blueprints</p>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    <AnimatePresence mode="popLayout">
                      {pendingDesigns.length === 0 ? (
                        <div className="col-span-full py-20 text-center glass rounded-[2rem]">
                          <CheckCircle2 className="w-12 h-12 text-white/5 mx-auto mb-4" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">Global catalog is fully synchronized. No pending blueprints.</p>
                        </div>
                      ) : (
                        pendingDesigns.map((design) => (
                          <DesignAuthorityCard 
                            key={design.id}
                            design={design}
                            isUpdatingAsset={isUpdatingAsset}
                            handleUpdateAsset={handleUpdateAsset}
                            handleUpdateProductStatus={handleUpdateProductStatus}
                            handleDeleteProduct={handleDeleteProduct}
                          />
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Approved Designs Management (Brand Owner Only) */}
                <div className="bg-white/5 border border-white/10 p-8 md:p-16 rounded-[3.5rem] text-white space-y-12 mb-20">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-4">
                      <div className="flex items-center space-x-6">
                        <div className="bg-green-500/20 p-5 rounded-3xl border border-green-500/20">
                            <Palette className="w-10 h-10 text-green-500" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter">Approved Catalog</h2>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Master Inventory Guard & Cleanup</p>
                        </div>
                      </div>
                      <div className="bg-white/5 border border-white/10 px-8 py-5 rounded-2xl">
                        <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Total Active</p>
                        <p className="text-2xl font-mono font-black text-white">{allDesigns.filter(d => d.status === 'approved').length} Designs</p>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {allDesigns.filter(d => d.status === 'approved').slice(0, 12).map((design) => (
                      <motion.div 
                        key={design.id}
                        className="glass p-5 rounded-3xl border border-white/5 hover:border-accent/30 transition-all group relative"
                      >
                         <div className="aspect-square bg-black/40 rounded-2xl overflow-hidden mb-4 relative">
                            <img 
                             src={design.mockupImage} 
                             alt="" 
                             className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-grayscale duration-500" 
                             referrerPolicy="no-referrer"
                           />
                            <div className="absolute top-2 right-2">
                               <button 
                                 onClick={() => handleDeleteProduct(design.id)}
                                 className="p-2 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                               >
                                  <Trash2 className="w-4 h-4" />
                               </button>
                            </div>
                         </div>
                         <div>
                            <p className="text-[10px] font-black uppercase text-white truncate">{design.name}</p>
                            <p className="text-[8px] font-black uppercase text-white/20 tracking-tighter italic">by {design.agentName || 'Master'}</p>
                         </div>
                      </motion.div>
                    ))}
                    {allDesigns.filter(d => d.status === 'approved').length > 12 && (
                      <div className="col-span-full text-center py-4">
                         <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20 italic">Showing 12 of {allDesigns.filter(d => d.status === 'approved').length} items. Use the shop to view all.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Agent Performance Leaderboard */}
                <div className="bg-white/5 border border-white/10 p-8 md:p-16 rounded-[3.5rem] text-white">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                     <div className="flex items-center space-x-6">
                        <div className="bg-purple-500/20 p-5 rounded-3xl border border-purple-500/20">
                           <Users className="w-10 h-10 text-purple-400" />
                        </div>
                        <div>
                           <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter">Agent Ecosystem</h2>
                           <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Leaderboard & Network Scalability</p>
                        </div>
                     </div>
                     <div className="bg-white/5 border border-white/10 px-8 py-5 rounded-2xl">
                        <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Active Network</p>
                        <p className="text-2xl font-mono font-black text-white">{allAgents.length} Agents</p>
                     </div>
                  </div>

                  <div className="bg-black/20 rounded-[2.5rem] border border-white/10 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[800px]">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/5">
                            <th className="px-10 py-8 text-[11px] font-black uppercase tracking-widest text-white/60">Agent Authority</th>
                            <th className="px-10 py-8 text-[11px] font-black uppercase tracking-widest text-white/60 text-center">Referral Velocity</th>
                            <th className="px-10 py-8 text-[11px] font-black uppercase tracking-widest text-white/60 text-center">Design Authority</th>
                            <th className="px-10 py-8 text-[11px] font-black uppercase tracking-widest text-white/60">Revenue Breakdown</th>
                            <th className="px-10 py-8 text-[11px] font-black uppercase tracking-widest text-white/60">Total Ecosystem Yield</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agentPerformance.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-10 py-24 text-center">
                                <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/10 italic">No agents active in the network yet.</p>
                              </td>
                            </tr>
                          ) : (
                            agentPerformance.map((agent, index) => (
                              <tr key={agent.id} className="border-b border-white/5 hover:bg-white/10 transition-colors group">
                                <td className="px-10 py-8">
                                  <div className="flex items-center space-x-5">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center font-black text-xs text-white/40 border border-white/10">
                                      {index + 1}
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-white group-hover:text-accent transition-colors">{agent.name || 'Anonymous Agent'}</p>
                                      <p className="text-[8px] font-black uppercase text-white/20 tracking-tighter mb-1">{agent.email}</p>
                                      <div className="flex gap-2">
                                        <span className="text-[7px] font-black uppercase text-accent/40 tracking-widest border border-accent/10 px-1.5 py-0.5 rounded-md bg-accent/5">CODE: {agent.referralCode || 'NONE'}</span>
                                        <span className="text-[7px] font-black uppercase text-white/20 tracking-widest border border-white/5 px-1.5 py-0.5 rounded-md bg-white/2">MOMO: {agent.momoNumber || 'NONE'}</span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-10 py-8 text-center border-x border-white/5">
                                   <div className="flex flex-col items-center">
                                      <p className="text-lg font-mono font-black text-accent">{agent.successfulCount}/{agent.referralCount}</p>
                                      <p className="text-[8px] font-black uppercase text-white/20 tracking-widest mt-1">Closed/Total</p>
                                   </div>
                                </td>
                                <td className="px-10 py-8 text-center border-x border-white/5">
                                   <div className="flex flex-col items-center">
                                      <p className="text-lg font-mono font-black text-white">{agent.approvedDesigns}/{agent.designCount}</p>
                                      <p className="text-[8px] font-black uppercase text-white/20 tracking-widest mt-1">Approved/Total</p>
                                      <div className="mt-2 w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-accent" style={{ width: `${agent.approvalRate}%` }} />
                                      </div>
                                   </div>
                                </td>
                                <td className="px-10 py-8">
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center bg-white/5 px-3 py-1 rounded-lg">
                                      <span className="text-[8px] font-black uppercase text-white/40">Referral</span>
                                      <span className="text-[10px] font-mono font-bold text-white">{formatGHC(agent.referralRevenue)}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white/5 px-3 py-1 rounded-lg">
                                      <span className="text-[8px] font-black uppercase text-white/40">Design Sales</span>
                                      <span className="text-[10px] font-mono font-bold text-accent">{formatGHC(agent.designRevenue)}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-10 py-8">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-lg font-mono font-black text-white">{formatGHC(agent.totalRevenue)}</p>
                                    <span className="text-[10px] font-black text-accent">{Math.round(agent.growthRate)}% Score</span>
                                  </div>
                                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                     <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${agent.growthRate}%` }}
                                        className="h-full bg-accent" 
                                     />
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-8 md:p-16 rounded-[3rem] text-white">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                     <div className="flex items-center space-x-4">
                        <div className="bg-accent p-4 rounded-2xl">
                           <BarChart3 className="w-8 h-8 text-black" />
                        </div>
                        <div>
                           <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter">Referral Intelligence</h2>
                           <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Global Network Conversion Stats</p>
                        </div>
                     </div>
                   <div className="flex gap-4">
                      <div className="bg-white/5 border border-white/10 px-8 py-5 rounded-2xl">
                         <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Total Referral Revenue</p>
                         <p className="text-2xl font-mono font-black text-accent">{formatGHC(referrals.reduce((acc, r) => acc + r.totalAmount, 0))}</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 px-8 py-5 rounded-2xl">
                         <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Total Referrals</p>
                         <p className="text-2xl font-mono font-black text-white">{referrals.length}</p>
                      </div>
                   </div>
                </div>

                <div className="bg-black/20 rounded-[2rem] border border-white/10 overflow-hidden">
                   <table className="w-full text-left">
                      <thead>
                         <tr className="border-b border-white/10">
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-white/40">Agent Identity</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-white/40">Customer</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-white/40">Amount</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-white/40">Status</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-white/40">Date</th>
                         </tr>
                      </thead>
                      <tbody>
                         {referrals.length === 0 ? (
                            <tr>
                               <td colSpan={5} className="px-8 py-20 text-center text-sm font-medium text-white/20 uppercase tracking-widest">
                                  No referral data found in the records.
                               </td>
                            </tr>
                         ) : (
                            referrals.map((referral) => (
                               <tr key={referral.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                  <td className="px-8 py-6">
                                     <p className="text-sm font-bold font-mono text-accent">
                                        {allAgents.find(a => a.id === referral.referralAgentId)?.name || referral.referralAgentId}
                                     </p>
                                     <p className="text-[8px] font-black uppercase text-white/20 tracking-tighter">Verified Agent Identity</p>
                                  </td>
                                  <td className="px-8 py-6">
                                     <p className="text-sm font-bold text-white">{referral.customerName}</p>
                                     <p className="text-[8px] font-black uppercase text-white/20">{referral.userEmail}</p>
                                  </td>
                                  <td className="px-8 py-6 text-sm font-mono font-bold text-white">{formatGHC(referral.totalAmount)}</td>
                                  <td className="px-8 py-6">
                                     <span className={cn(
                                        "px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                                        referral.status === 'completed' ? "bg-accent/20 text-accent" : "bg-white/5 text-white/40"
                                     )}>
                                        {referral.status}
                                     </span>
                                  </td>
                                  <td className="px-8 py-6 text-[10px] font-bold text-white/40">
                                     {referral.createdAt?.toDate().toLocaleDateString()}
                                  </td>
                               </tr>
                            ))
                         )}
                      </tbody>
                   </table>
                </div>
              </div>
            </div>
          )}

            {/* Fulfillment Ledger (Brand Owner Only) */}
            {isBrandOwner && (
               <section className="bg-[#0F0F10] border border-white/10 p-8 md:p-16 rounded-[3.5rem] text-white space-y-12 shadow-[0_0_80px_rgba(242,125,38,0.05)]">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-4">
                     <div className="flex items-center space-x-6">
                        <div className="bg-orange-500/20 p-5 rounded-3xl border border-orange-500/20">
                           <Package className="w-10 h-10 text-accent" />
                        </div>
                        <div>
                           <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter">Fulfillment Ledger</h2>
                           <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Global Order Dispatch & Verification</p>
                        </div>
                     </div>
                     <div className="flex gap-4">
                        <div className="bg-white/5 border border-white/10 px-8 py-5 rounded-2xl">
                           <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Total Orders</p>
                           <p className="text-2xl font-mono font-black text-white">{allOrders.length}</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 px-8 py-5 rounded-2xl text-right">
                           <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Pending Shipment</p>
                           <p className="text-2xl font-mono font-black text-accent">{allOrders.filter(o => o.status !== 'delivered' && o.status !== 'completed').length}</p>
                        </div>
                     </div>
                  </div>

                  <div className="bg-black/20 rounded-[2.5rem] border border-white/10 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[800px]">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/5">
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-white/40">Order Ref</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-white/40">Product</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-white/40">Customer</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-white/40">Status</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-white/40 text-right">Fulfillment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allOrders.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-10 py-24 text-center">
                                <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/10 italic">No global orders detected.</p>
                              </td>
                            </tr>
                          ) : (
                            allOrders.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).map((order) => (
                              <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                <td className="px-8 py-6">
                                   <p className="text-sm font-bold font-mono text-white mb-0.5">{order.id.slice(0, 8).toUpperCase()}</p>
                                   <p className="text-[8px] font-black uppercase text-white/20 tracking-tighter">
                                      {order.createdAt?.toDate().toLocaleDateString()}
                                   </p>
                                </td>
                                <td className="px-8 py-6">
                                   <div className="flex items-center space-x-3">
                                      <p className="text-sm font-bold text-white">{order.items?.[0]?.name}</p>
                                      <span className="text-[9px] font-black text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20">{order.items?.[0]?.size}</span>
                                   </div>
                                   <p className="text-[8px] font-black uppercase text-white/20">{order.items?.[0]?.color} • {order.items?.[0]?.gsm} GSM</p>
                                </td>
                                <td className="px-8 py-6">
                                   <p className="text-sm font-bold text-accent">{order.customerName}</p>
                                   <p className="text-[8px] font-black uppercase text-white/20">{order.userEmail || order.customerId.slice(0, 5)}</p>
                                </td>
                                <td className="px-8 py-6">
                                   <span className={cn(
                                      "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                                      order.status === 'delivered' ? "bg-green-500/20 text-green-500" :
                                      order.status === 'completed' ? "bg-accent/20 text-accent" : "bg-white/5 text-white/20"
                                   )}>
                                      {order.status}
                                   </span>
                                </td>
                                <td className="px-8 py-6 text-right">
                                   <div className="flex justify-end space-x-2">
                                      {order.status !== 'delivered' && order.status !== 'completed' && (
                                         <button 
                                            onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                                            className="bg-accent/10 hover:bg-accent text-accent hover:text-black border border-accent/20 px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg"
                                         >
                                            Confirm Dispatch
                                         </button>
                                      )}
                                      <button 
                                         onClick={() => navigate(`/order/${order.id}`)}
                                         className="bg-white/5 hover:bg-white text-white/40 hover:text-black border border-white/10 px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all"
                                      >
                                         View Details
                                      </button>
                                   </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
               </section>
            )}

            {/* Design Studio Terminal */}
            <section className="bg-[#0F0F10] rounded-[3.5rem] p-12 md:p-20 border-8 border-black text-white relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                 <Palette className="w-48 h-48" strokeWidth={1} />
              </div>
              
              <div className="relative z-10 space-y-12">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-3 mb-6">
                     <div className="bg-white p-2 rounded-lg">
                        <Plus className="w-4 h-4 text-black" />
                     </div>
                     <h2 className="text-5xl font-display font-black uppercase italic tracking-tighter leading-none">Submission Terminal<span className="text-accent">_</span></h2>
                  </div>
                  <p className="text-white/40 text-sm leading-relaxed font-black uppercase tracking-tight italic">
                    Inject your original blueprints into the royal ecosystem. Our neural system validates aesthetic integrity and resolution before official ledger entry.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <input type="file" hidden ref={fileInputRef} onChange={handleFileUpload} accept="image/*" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full sm:w-auto bg-white text-black px-12 py-7 rounded-3xl font-black uppercase tracking-editorial text-[11px] hover:bg-accent transition-all flex items-center justify-center space-x-3 shadow-[0_20px_40px_rgba(255,255,255,0.05)] active:scale-95 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Scanning Matrix...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>Upload Creative Blueprint</span>
                      </>
                    )}
                  </button>
                  
                  <div className="flex items-center space-x-4 px-8 py-4 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-accent">
                     <Star className="w-4 h-4 fill-accent animate-pulse" />
                     <span>Sovereign Royalty Tier: 10%</span>
                  </div>
                </div>

                {/* Status Console */}
                <AnimatePresence>
                  {uploadStatus !== 'idle' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="pt-10 border-t border-white/5 space-y-8"
                    >
                      <div className="grid grid-cols-3 gap-4">
                         {[
                           { 
                             label: 'Scanning', 
                             status: uploadStatus === 'scanning' ? 'active' : 'complete', 
                             icon: Zap 
                           },
                           { 
                             label: 'Verifying', 
                             status: (uploadStatus === 'pending' || uploadStatus === 'scanning') ? 'idle' : 
                                     (uploadStatus === 'rejected' ? 'failed' : 'complete'), 
                             icon: uploadStatus === 'rejected' ? AlertCircle : Clock 
                           },
                           { 
                             label: 'Injected', 
                             status: uploadStatus === 'success' ? 'complete' : 'idle', 
                             icon: CheckCircle2 
                           }
                         ].map((step, i) => (
                           <div key={i} className="flex flex-col items-center space-y-3">
                              <div className={cn(
                                "w-12 h-12 rounded-full border flex items-center justify-center transition-all duration-700",
                                step.status === 'active' ? "border-accent bg-accent text-black shadow-[0_0_20px_rgba(242,125,38,0.4)] scale-110" :
                                step.status === 'complete' ? "border-white/20 bg-white/10 text-accent" : 
                                step.status === 'failed' ? "border-red-500/50 bg-red-500/10 text-red-500" :
                                "border-white/5 text-white/10"
                              )}>
                                <step.icon className={cn("w-5 h-5", step.status === 'active' && "animate-pulse")} />
                              </div>
                              <span className={cn("text-[8px] font-black uppercase tracking-widest", 
                                step.status === 'active' ? "text-accent" : 
                                step.status === 'failed' ? "text-red-500" :
                                "text-white/20"
                              )}>{step.label}</span>
                           </div>
                         ))}
                      </div>

                      <div className={cn(
                        "p-6 rounded-3xl border font-mono text-[10px] transition-colors duration-500",
                        uploadStatus === 'rejected' ? "bg-red-500/5 border-red-500/20" : "bg-white/5 border-white/10"
                      )}>
                         <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4">
                               <div className={cn("text-accent", uploadStatus === 'rejected' && "text-red-500")}> [CONSOLE] </div>
                               <div className="space-y-1">
                                  <p className={cn("uppercase font-bold", uploadStatus === 'rejected' ? "text-red-400" : "text-white/60")}>
                                     {uploadStatus === 'scanning' ? 'Scanning design matrix...' : 
                                      uploadStatus === 'rejected' ? 'Verification failed: Sovereignty Violation' :
                                      'Verification output successful'}
                                  </p>
                                  <p className="text-white/30 italic max-w-lg leading-relaxed">
                                     {" >> "} {scanResults || 'Reviewing resolution, contrast, and streetwear semantics...'}
                                  </p>
                               </div>
                            </div>
                            {(uploadStatus === 'success' || uploadStatus === 'rejected') && (
                               <button 
                                 onClick={() => setUploadStatus('idle')}
                                 className="text-[8px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-colors"
                               >
                                  Clear
                               </button>
                            )}
                         </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>

            {/* AI Forge - High Intensity Section */}
            <section className="bg-[#0F0F10] rounded-[3.5rem] p-12 md:p-20 border-2 border-accent/40 relative overflow-hidden group shadow-2xl">
               <div className="absolute bottom-0 right-0 p-12 opacity-10 pointer-events-none">
                  <Sparkles className="w-48 h-48 text-accent" strokeWidth={1} />
               </div>
               
               <div className="relative z-10 space-y-12">
                  <div className="max-w-2xl">
                     <div className="flex items-center gap-3 mb-6">
                        <Sparkles className="w-6 h-6 text-accent animate-pulse" />
                        <span className="text-accent text-[11px] font-black uppercase tracking-editorial italic">Experimental Forge v2.0</span>
                     </div>
                     <h2 className="text-5xl font-display font-black uppercase italic tracking-tighter leading-none text-white">Neural Forge<span className="text-accent">_</span></h2>
                     <p className="text-white/40 text-sm leading-relaxed font-black uppercase tracking-tight italic mt-6">
                        Convert vision into tangible authority. Describe your kingdom's aesthetic and our neural network will engineer a professional streetwear blueprint.
                     </p>
                  </div>

                  <div className="space-y-8">
                     <div className="relative group">
                        <textarea 
                           value={genPrompt}
                           onChange={(e) => setGenPrompt(e.target.value)}
                           placeholder="Describe the aesthetic (e.g., 'A cyberpunk ronin emblem with neon accents on a heavyweight oversized tee')..."
                           className="w-full bg-black/60 border-2 border-white/5 rounded-[2.5rem] p-10 text-[13px] font-black uppercase tracking-widest text-white outline-none focus:border-accent transition-all min-h-[180px] resize-none shadow-inner"
                        />
                        <div className="absolute right-8 bottom-8 flex items-center gap-2 opacity-20 italic">
                           <Zap className="w-3 h-3" />
                           <span className="text-[8px] font-black uppercase tracking-widest">Neural Input Area</span>
                        </div>
                     </div>
                     
                     <div className="flex flex-col sm:flex-row items-center gap-8 px-4">
                        <button
                           onClick={handleGenerateDesign}
                           disabled={isGenerating || !genPrompt.trim()}
                           className="w-full sm:w-auto bg-accent text-black px-16 py-8 rounded-3xl font-black uppercase tracking-editorial text-[12px] hover:bg-white hover:scale-[1.02] transition-all flex items-center justify-center space-x-4 shadow-[0_20px_40px_rgba(242,125,38,0.1)] active:scale-95 disabled:opacity-50"
                        >
                           {isGenerating ? (
                              <>
                                 <RefreshCw className="w-5 h-5 animate-spin" />
                                 <span>Neural Engineering...</span>
                              </>
                           ) : (
                              <>
                                 <Zap className="w-5 h-5" />
                                 <span>Initialise Forge</span>
                              </>
                           )}
                        </button>
                        <div className="flex flex-col">
                           <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">Processing Cycle: ~20-30s</p>
                           <p className="text-[8px] font-black uppercase tracking-widest text-accent/40 italic">High Intensity Operation Required</p>
                        </div>
                     </div>
                  </div>

                  {/* Generated Preview */}
                  <AnimatePresence>
                     {generatedPreview && (
                        <motion.div
                           initial={{ opacity: 0, scale: 0.95 }}
                           animate={{ opacity: 1, scale: 1 }}
                           className="pt-16 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-12"
                        >
                           <div className="aspect-square rounded-[3rem] overflow-hidden border-4 border-accent relative group shadow-2xl">
                              <img 
                               src={generatedPreview} 
                               alt="Neural Output" 
                               className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                               referrerPolicy="no-referrer"
                             />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 p-8">
                                 <span className="text-[9px] font-black uppercase tracking-widest text-accent bg-accent/10 px-4 py-2 rounded-xl border border-accent/20 backdrop-blur-md">Forge Output Verified</span>
                              </div>
                           </div>
                           <div className="flex flex-col justify-center space-y-10 px-4">
                              <div className="space-y-6">
                                 <h4 className="text-3xl font-display font-black uppercase italic text-white tracking-tighter">Asset Calibrated<span className="text-accent">.</span></h4>
                                 <p className="text-[12px] text-white/30 leading-relaxed font-black uppercase tracking-tight italic">
                                    Our neural forge has formalised your concept. The aesthetic DNA is 98% aligned with protocol. Finalize the injection into your official blueprint ledger?
                                 </p>
                              </div>
                              <button
                                 onClick={handleForgeIntoBlueprint}
                                 className="w-full bg-white text-black py-8 rounded-[2rem] font-black uppercase tracking-widest text-[12px] hover:bg-accent transition-all flex items-center justify-center space-x-4 shadow-[0_20px_40px_rgba(255,255,255,0.05)] active:scale-95 group"
                              >
                                 <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                                 <span>Inject into Ledger</span>
                              </button>
                           </div>
                        </motion.div>
                     )}
                  </AnimatePresence>
               </div>
            </section>

            {/* Procurement Ledger */}
            <section className="space-y-10">
               <div className="flex justify-between items-end px-6">
                  <div className="space-y-1">
                     <h3 className="text-xl font-display font-black uppercase tracking-editorial italic text-accent">Purchase Ledger</h3>
                     <p className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">Historical Procurement Data</p>
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">Total Logs</p>
                     <p className="text-2xl font-mono font-black text-white">{myOrders.length}</p>
                  </div>
               </div>
               
               <div className="space-y-4">
                  {myOrders.length === 0 ? (
                    <div className="py-24 text-center bg-white/2 rounded-[3.5rem] border-4 border-dashed border-white/5 opacity-50">
                       <Package className="w-16 h-16 text-white/5 mx-auto mb-6" strokeWidth={1} />
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/10 italic">No historical data in procurement ledger.</p>
                    </div>
                  ) : (
                     myOrders.map((order) => (
                        <motion.div 
                          key={order.id} 
                          onClick={() => navigate(`/order/${order.id}`)}
                          className="bg-white/2 border border-white/10 p-8 rounded-[2.5rem] hover:border-accent/40 transition-all flex items-center justify-between cursor-pointer group hover:bg-white/5"
                        >
                           <div className="flex items-center space-x-8">
                              <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center text-white/20 group-hover:text-accent transition-all border border-white/5">
                                 <CreditCard className="w-6 h-6" />
                              </div>
                              <div>
                                 <p className="text-sm font-black uppercase tracking-tighter text-white mb-2 italic">
                                    {order.items?.[0]?.name || 'Kings Collection Blueprints'}
                                 </p>
                                 <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-white/20 italic">
                                    <span className="text-accent underline">UID: {order.id.slice(0, 10).toUpperCase()}</span>
                                    <span>•</span>
                                    <span>{new Date(order.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                                 </div>
                              </div>
                           </div>
                           <div className="flex items-center space-x-10">
                              <div className="text-right">
                                 <p className="text-[10px] font-black uppercase text-accent mb-1 italic">{order.status}</p>
                                 <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Protocol Status</p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-accent group-hover:translate-x-2 transition-all" />
                           </div>
                        </motion.div>
                     ))
                  )}
               </div>
            </section>

            {/* Network Intelligence Ledger */}
            <section className="space-y-12 pt-16">
               <div className="flex justify-between items-end px-8">
                  <div className="space-y-2">
                     <h3 className="text-3xl font-display font-black uppercase tracking-tighter italic text-white leading-none">Network Intelligence<span className="text-accent">_</span></h3>
                     <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic">Agent Ecosystem Analytics Platform</p>
                  </div>
                  <div className="text-right">
                     <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mb-2">Verified Agents</p>
                     <p className="text-3xl font-mono font-black text-white">{isBrandOwner ? allAgents.length : referredAgents.length}</p>
                  </div>
               </div>

               <div className="bg-black/60 p-12 md:p-20 rounded-[4rem] border-8 border-black relative overflow-hidden group shadow-2xl">
                  <div className="absolute top-0 right-0 p-16 opacity-5 pointer-events-none">
                     <Users className="w-80 h-80 text-accent" strokeWidth={1} />
                  </div>
                  
                  <div className="relative z-10 space-y-16">
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                        <div className="space-y-12">
                           <div className="p-12 bg-white/5 rounded-[3.5rem] border-2 border-white/5 relative overflow-hidden group/card shadow-2xl backdrop-blur-3xl">
                               <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent pointer-events-none opacity-50" />
                               <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white/20 mb-8 italic leading-none">Total Network Liquidity</p>
                               <h4 className="text-8xl font-display font-black text-accent tracking-tighter leading-none mb-4">
                                 {isBrandOwner ? formatGHC(referrals.reduce((acc, r) => acc + (r.totalAmount || 0), 0)) : formatGHC(totalReferredSales)}
                               </h4>
                               <div className="mt-12 pt-12 border-t border-white/10 flex gap-12">
                                  <div>
                                     <p className="text-[10px] font-black uppercase text-white/20 tracking-widest mb-2 italic">Protocol Status</p>
                                     <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <p className="text-[14px] font-black text-white uppercase italic">{isBrandOwner ? "Sovereign Node" : "Branch Authority"}</p>
                                     </div>
                                  </div>
                                  <div>
                                     <p className="text-[10px] font-black uppercase text-white/20 tracking-widest mb-2 italic">Network Nodes</p>
                                     <p className="text-[14px] font-black text-white uppercase italic">{isBrandOwner ? allAgents.length : referredAgents.length} Active</p>
                                  </div>
                               </div>
                           </div>
                        </div>

                        <div className="flex flex-col justify-center space-y-10">
                           <div className="flex items-center gap-4 px-6">
                              <RefreshCw className="w-4 h-4 text-accent animate-spin-slow" />
                              <p className="text-[12px] font-black uppercase tracking-[0.4em] text-white/30 italic leading-none">Ecosystem Live Feed</p>
                           </div>
                           <div className="space-y-4">
                              {(isBrandOwner ? allAgents : referredAgents).slice(0, 3).length === 0 ? (
                                <div className="p-16 bg-white/2 rounded-[3rem] text-center border-2 border-dashed border-white/5">
                                   <p className="text-[11px] text-white/10 uppercase tracking-[0.2em] font-black italic mt-4">Awaiting network pulses...</p>
                                </div>
                              ) : (
                                (isBrandOwner ? allAgents : referredAgents).slice(0, 3).map((agent) => (
                                   <div key={agent.id} className="flex items-center justify-between p-8 bg-white/2 rounded-[2.5rem] border border-white/5 group/row hover:border-accent/40 transition-all hover:bg-white/5 hover:scale-[1.02]">
                                      <div className="flex items-center space-x-6">
                                         <div className="w-14 h-14 rounded-2xl bg-black border border-white/10 flex items-center justify-center font-black text-lg text-white/20 group-hover/row:text-black group-hover/row:bg-accent group-hover/row:border-accent transition-all shadow-2xl">
                                            {agent.name?.charAt(0) || 'U'}
                                         </div>
                                         <div>
                                            <p className="text-[14px] font-black uppercase tracking-widest text-white transition-colors truncate mb-1 italic leading-none">{agent.name}</p>
                                            <p className="text-[9px] font-black uppercase text-white/20 tracking-tighter italic">
                                               UID: {agent.id.slice(0, 12).toUpperCase()}
                                            </p>
                                         </div>
                                      </div>
                                      <div className="text-right">
                                         <p className="text-xl font-mono font-black text-accent">{formatGHC(agent.stats?.totalSales || 0)}</p>
                                         <p className="text-[8px] font-black text-white/10 uppercase tracking-[0.3em] mt-1">Confirmed Yield</p>
                                      </div>
                                   </div>
                                ))
                              )}
                           </div>
                        </div>
                     </div>

                     {isBrandOwner && (
                        <div className="pt-20 border-t border-white/10">
                           <div className="flex justify-between items-center mb-12 px-8">
                              <p className="text-[14px] font-black uppercase tracking-[0.6em] text-white/30 italic">Collective Audit Terminal</p>
                              <div className="flex items-center gap-4 bg-accent/10 border border-accent/20 px-6 py-3 rounded-2xl">
                                 <ShieldCheck className="w-4 h-4 text-accent" />
                                 <span className="text-[10px] font-black uppercase text-accent tracking-widest italic">Auth: Level Sovereign</span>
                              </div>
                           </div>
                           <div className="bg-black/40 rounded-[3.5rem] border-4 border-white/5 overflow-hidden shadow-2xl">
                              <div className="overflow-x-auto">
                                 <table className="w-full text-left min-w-[800px]">
                                    <thead>
                                       <tr className="border-b-2 border-black bg-white/2">
                                          <th className="px-12 py-10 text-[11px] font-black uppercase tracking-widest text-white/30">Node Identity</th>
                                          <th className="px-12 py-10 text-[11px] font-black uppercase tracking-widest text-white/30 text-center">Operational Metrics</th>
                                          <th className="px-12 py-10 text-[11px] font-black uppercase tracking-widest text-white/30 text-right">Net Liquidity</th>
                                       </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                       {agentPerformance.length === 0 ? (
                                          <tr>
                                             <td colSpan={3} className="px-12 py-24 text-center text-sm font-black uppercase tracking-[0.4em] text-white/5 italic">No operational data detected.</td>
                                          </tr>
                                       ) : (
                                          agentPerformance.map((performance: any) => (
                                             <tr key={performance.id} className="hover:bg-white/5 transition-all group/tab">
                                                <td className="px-12 py-10">
                                                   <p className="text-lg font-black text-white mb-1 group-hover/tab:text-accent transition-all leading-none italic uppercase tracking-tighter">{performance.name}</p>
                                                   <div className="flex items-center gap-3 mb-2">
                                                      <span className="text-[8px] font-black text-accent/60 uppercase tracking-widest">{performance.referralCode || 'NO_REF'}</span>
                                                      <span className="text-[8px] font-black text-white/10 uppercase tracking-widest">{performance.momoNumber || 'NO_MOMO'}</span>
                                                   </div>
                                                   <p className="text-[10px] font-black font-mono text-white/20 tracking-[0.1em]">#{performance.id.toUpperCase().slice(0, 16)}</p>
                                                </td>
                                                <td className="px-12 py-10">
                                                   <div className="flex justify-center gap-16">
                                                      <div className="text-center">
                                                         <p className="text-[18px] font-mono font-black text-white/80 mb-1 leading-none">{performance.referralCount}</p>
                                                         <p className="text-[9px] font-black uppercase text-white/10 tracking-widest">Refs</p>
                                                      </div>
                                                      <div className="text-center">
                                                         <p className="text-[18px] font-mono font-black text-accent mb-1 leading-none">{formatGHC(performance.totalReferralValue)}</p>
                                                         <p className="text-[9px] font-black uppercase text-white/10 tracking-widest">Gross</p>
                                                      </div>
                                                   </div>
                                                </td>
                                                <td className="px-12 py-10 text-right">
                                                   <p className="text-xl font-mono font-black text-white leading-none mb-1">{formatGHC(performance.netCommission)}</p>
                                                   <p className="text-[9px] font-black uppercase text-white/10 tracking-widest italic leading-none">Net Commission Yield</p>
                                                </td>
                                             </tr>
                                          ))
                                       )}
                                    </tbody>
                                 </table>
                              </div>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </section>
          </div>

          <aside className="lg:col-span-4 space-y-12">
            {/* Identity Authority Tool */}
            <section className="bg-white p-12 rounded-[4rem] text-black relative overflow-hidden group hover:shadow-[0_0_80px_rgba(255,255,255,0.2)] shadow-2xl transition-all border-[12px] border-black">
               <div className="absolute -right-20 -top-20 w-64 h-64 bg-accent/20 rounded-full blur-[80px] pointer-events-none" />
               <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-8">
                     <div className="bg-black p-3 rounded-xl shadow-lg">
                        <LinkIcon className="w-5 h-5 text-white" />
                     </div>
                     <h3 className="text-4xl font-display font-black uppercase italic tracking-tighter leading-none">Identity<br/>Authority<span className="text-accent">_</span></h3>
                  </div>
                  <p className="text-[13px] text-black/50 leading-relaxed font-black uppercase tracking-tight italic mb-12">Deploy your unique sovereign link. Accumulate royalty through every verified transition within the ecosystem.</p>
                  
                  <div className="space-y-6">
                     <button 
                       onClick={handleCopyLink}
                       className={cn(
                         "w-full p-8 rounded-3xl flex items-center justify-between group/btn transition-all active:scale-95 shadow-2xl relative overflow-hidden",
                         copiedLink 
                           ? "bg-accent text-black shadow-[0_20px_40px_rgba(242,125,38,0.3)]" 
                           : "bg-black text-white hover:bg-black/90 shadow-[0_20px_40px_rgba(0,0,0,0.3)]"
                       )}
                     >
                        {copiedLink && (
                           <motion.div 
                              initial={{ x: '-100%' }}
                              animate={{ x: '100%' }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                              className="absolute inset-y-0 w-full bg-white/20 skew-x-[-20deg]"
                           />
                        )}
                        <div className="flex items-center space-x-6 relative z-10">
                           <div className={cn("p-2 rounded-lg", copiedLink ? "bg-black/10" : "bg-white/10")}>
                              {copiedLink ? <ShieldCheck className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                           </div>
                           <span className="text-[13px] font-black uppercase tracking-widest italic">
                             {copiedLink ? 'Verified Correct' : 'Copy Authority'}
                           </span>
                        </div>
                        <Copy className={cn("w-6 h-6 transition-all relative z-10", !copiedLink && "group-hover/btn:scale-125 text-accent")} />
                     </button>

                     <div className="grid grid-cols-2 gap-4">
                        <a 
                          href={shareLinks.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center gap-3 py-6 bg-black/5 border-2 border-black/5 rounded-[2rem] hover:bg-black hover:text-white transition-all text-[11px] font-black uppercase tracking-widest italic group/share"
                        >
                           <Twitter className="w-5 h-5 group-hover/share:scale-125 transition-transform" />
                           Dispatch
                        </a>
                        <a 
                          href={shareLinks.whatsapp}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center gap-3 py-6 bg-black/5 border-2 border-black/5 rounded-[2rem] hover:bg-[#25D366] hover:text-white hover:border-[#25D366] transition-all text-[11px] font-black uppercase tracking-widest italic group/share"
                        >
                           <MessageCircle className="w-5 h-5 group-hover/share:scale-125 transition-transform" />
                           Broadcast
                        </a>
                     </div>
                  </div>
               </div>
            </section>

            {/* Logistics Verification */}
            <section className="bg-[#0F0F10] p-10 rounded-[3.5rem] border-4 border-white/10 shadow-2xl">
               <div className="flex items-center gap-4 mb-8">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                     <Package className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="text-xl font-display font-black uppercase italic tracking-tighter text-white">Logistics Verification<span className="text-accent">_</span></h3>
               </div>
               <div className="space-y-6">
                  <div className="relative">
                     <input 
                        type="text" 
                        placeholder="ORDER_REF_ID" 
                        className="w-full bg-black/60 border-2 border-white/5 rounded-2xl p-6 text-[12px] font-black uppercase tracking-[0.3em] text-accent outline-none focus:border-accent shadow-inner placeholder:opacity-20"
                        id="orderTrackInput"
                     />
                     <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20">
                        <Zap className="w-4 h-4" />
                     </div>
                  </div>
                  <button 
                    onClick={() => {
                      const id = (document.getElementById('orderTrackInput') as HTMLInputElement).value;
                      if(id) navigate(`/order/${id}`);
                    }}
                    className="w-full bg-white text-black py-6 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-accent transition-all active:scale-95 shadow-xl"
                  >
                    Locate Assets
                  </button>
               </div>
            </section>

            {/* Identity Configuration */}
            <section className="bg-[#0F0F10] p-10 rounded-[3.5rem] border-4 border-white/10 shadow-2xl">
               <div className="flex items-center gap-4 mb-10">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                     <ShieldCheck className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="text-xl font-display font-black uppercase italic tracking-tighter text-white">Identity Config<span className="text-accent">_</span></h3>
               </div>
               <div className="space-y-10">
                  <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic px-2 block">Referral Identity Overlay</label>
                     <div className="relative group">
                        <input 
                           type="text" 
                           value={referralCode}
                           onChange={(e) => setReferralCode(e.target.value)}
                           placeholder="KING_2026" 
                           className="w-full bg-black/60 border-2 border-white/5 rounded-2xl p-6 text-[14px] font-mono font-black text-white focus:border-accent outline-none transition-all uppercase tracking-widest"
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-accent/20">
                           <Sparkles className="w-5 h-5" />
                        </div>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic px-2 block">Verified MoMo Instance</label>
                     <div className="relative group">
                        <input 
                           type="text" 
                           value={momoNumber}
                           onChange={(e) => setMomoNumber(e.target.value)}
                           placeholder="DASH_NETWORK_ID" 
                           className="w-full bg-black/60 border-2 border-white/5 rounded-2xl p-6 text-[14px] font-mono font-black text-accent focus:border-accent outline-none transition-all"
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-accent/20">
                           <CreditCard className="w-5 h-5" />
                        </div>
                     </div>
                  </div>
                  
                  <div className="pt-4">
                     <button 
                       onClick={handleUpdateProfile}
                       className="w-full bg-accent text-black py-7 rounded-[2rem] font-black uppercase tracking-editorial text-[12px] hover:bg-white transition-all active:scale-95 shadow-[0_20px_40px_rgba(242,125,38,0.2)]"
                     >
                        Update Protocol
                     </button>
                  </div>
               </div>
            </section>

            {/* Payout Logs Ledger */}
            <section className="bg-[#0F0F10] p-10 rounded-[3.5rem] border-4 border-white/10 shadow-2xl overflow-hidden relative">
               <div className="absolute right-0 top-0 p-8 opacity-5">
                  <CreditCard className="w-32 h-32 text-accent" strokeWidth={1} />
               </div>
               <div className="relative z-10">
                  <div className="flex items-center justify-between mb-10">
                     <div className="flex items-center gap-4">
                        <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-white/40">
                           <Clock className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-display font-black uppercase italic tracking-tighter text-white">Payout History<span className="text-accent">_</span></h3>
                     </div>
                     <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{payouts.length} Logs</span>
                  </div>

                  <div className="space-y-5">
                     {payouts.length > 0 ? (
                        payouts.slice(0, 4).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).map((payout) => (
                           <div key={payout.id} className="p-6 bg-white/2 rounded-3xl border border-white/5 group hover:border-accent/30 transition-all hover:bg-white/5">
                              <div className="flex items-start justify-between mb-4">
                                 <p className="text-xl font-mono font-black text-white leading-none italic">{formatGHC(payout.amount)}</p>
                                 <span className={cn(
                                    "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em]",
                                    payout.status === 'Completed' ? "bg-green-500/20 text-green-500" : "bg-accent/20 text-accent"
                                 )}>
                                    {payout.status}
                                 </span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/20 italic">
                                 <span>{payout.createdAt ? new Date(payout.createdAt.seconds * 1000).toLocaleDateString() : 'Awaiting confirmation'}</span>
                                 <span>REF: {payout.id.toUpperCase().slice(0, 8)}</span>
                              </div>
                           </div>
                        ))
                     ) : (
                        <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] bg-white/2">
                           <CreditCard className="w-12 h-12 text-white/5 mx-auto mb-4" strokeWidth={1} />
                           <p className="text-[11px] font-black uppercase tracking-widest text-white/10 italic">No historical logs detected.</p>
                        </div>
                     )}
                  </div>
                  
                  <div className="mt-10 p-6 bg-accent/5 rounded-2xl border border-accent/10 flex items-start gap-4">
                     <AlertCircle className="w-5 h-5 text-accent mt-0.5" />
                     <p className="text-[10px] text-accent font-black leading-relaxed uppercase tracking-tight italic">
                        Weekly disbursement protocol initiated every Friday at 12:00 GMT for all verified network gains.
                     </p>
                  </div>
               </div>
            </section>

          </aside>
        </div>
      </div>
    </main>
  );
}

