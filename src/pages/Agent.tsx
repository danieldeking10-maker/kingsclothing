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
  Grid3X3
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import React from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { compressImage } from '../lib/imageUtils';
import { Link, useNavigate } from 'react-router-dom';
import { cn, formatGHC } from '@/src/lib/utils';
import { FABRIC_COLORS } from '../constants';
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
    colorImages: {} as Record<string, string>,
    colorStudioImages: {} as Record<string, string>
  });
  const [ownerPreview, setOwnerPreview] = useState<string | null>(null);
  const [ownerStudioPreview, setOwnerStudioPreview] = useState<string | null>(null);
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ownerFileInputRef = useRef<HTMLInputElement>(null);
  const ownerStudioInputRef = useRef<HTMLInputElement>(null);

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
    const total = agentProfile?.stats?.commissionEarned || 0;
    // High-impact trajectory simulation
    return [
      { name: 'Phase I', value: total * 0.15 },
      { name: 'Phase II', value: total * 0.32 },
      { name: 'Phase III', value: total * 0.48 },
      { name: 'Phase IV', value: total * 0.72 },
      { name: 'Current', value: total },
    ];
  }, [agentProfile?.stats?.commissionEarned]);

  const handleCopyLink = () => {
    const link = `${window.location.origin}/shop?ref=${user?.uid}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied to clipboard!');
  };

  const handleOwnerFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'mockup' | 'studio' = 'mockup') => {
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
      } else {
        setOwnerStudioPreview(base64Data);
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
      setUploadProgress(85);

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
        isPrivate: ownerForm.isPrivate,
        allowedColors: ownerForm.allowedColors,
        createdAt: serverTimestamp()
      });
      setUploadProgress(100);
      toast.success('Exclusive Authority Injected');
      setTimeout(() => {
        setOwnerPreview(null);
        setOwnerStudioPreview(null);
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

  const handleUpdateMomo = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'agents', user.uid), {
        momoNumber: momoNumber
      });
      toast.success('Payout settings updated');
    } catch (error) {
      toast.error('Failed to update settings');
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
      await updateDoc(doc(db, 'products', productId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast.success(`Design ${newStatus === 'approved' ? 'Sanctified' : 'Purged'}`);
    } catch (error: any) {
      toast.error('Authority Override Failed: ' + error.message);
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
    <div className="bg-background min-h-screen py-16 md:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Dashboard Header */}
        <header className="mb-20">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-12 border-b border-white/5">
            <div className="max-w-2xl">
              <span className="text-accent text-[10px] font-black uppercase tracking-editorial mb-4 block">Identity: Verified Agent</span>
              <h1 className="text-6xl md:text-8xl font-display font-black tracking-tighter uppercase italic leading-[0.85]">
                Kingdom Terminal<span className="text-accent">.</span>
              </h1>
              {isBrandOwner && (
                <div className="mt-4 flex items-center space-x-2 text-accent">
                  <Verified className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Master Authority Recognized: kingsclothingbrand7@gmail.com</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4 bg-white/5 p-4 rounded-3xl border border-white/10">
               <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-black text-black">
                  {user.displayName?.charAt(0) || 'K'}
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white leading-none mb-1">{user.displayName}</p>
                  <p className="text-[9px] font-medium text-white/40 uppercase tracking-tighter">Status: Active Authority</p>
               </div>
            </div>
          </div>
        </header>

        {/* Stats Grid - Massive Typography */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8 mb-20">
          {stats.map((stat) => (
            <div key={stat.label} className="glass p-10 rounded-[2.5rem] relative overflow-hidden group hover:border-accent/40 transition-all duration-500">
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <stat.icon className="w-24 h-24" strokeWidth={1} />
              </div>
              <p className="text-white/30 text-[10px] font-black uppercase tracking-editorial mb-6 italic">{stat.label}</p>
              <h3 className="text-6xl font-display font-black tracking-tighter text-white group-hover:text-accent transition-colors">{stat.value}</h3>
              <div className="mt-8 flex items-center space-x-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                 <span className="text-[8px] font-black uppercase tracking-widest text-white/20 uppercase">Realtime Authority Sync</span>
              </div>
            </div>
          ))}
        </div>

        {/* Commission Analytics Chart */}
        <div className="mb-20 glass p-8 md:p-12 rounded-[3.5rem] relative overflow-hidden group border border-white/5 shadow-2xl">
           <div className="absolute top-0 right-0 p-8 opacity-5">
              <Zap className="w-48 h-48 text-accent" strokeWidth={1} />
           </div>
           
           <div className="relative z-10 flex flex-col xl:flex-row gap-12">
              <div className="xl:w-1/4 space-y-6">
                 <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[8px] font-black uppercase tracking-widest leading-none">
                    <Star className="w-3 h-3 fill-accent" />
                    <span>Intelligence Active</span>
                 </div>
                 <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter text-white">Commission Intelligence</h2>
                 <p className="text-white/40 text-sm leading-relaxed font-light uppercase tracking-tight">
                    Visualizing the accumulation of your sovereign wealth. This trajectory tracks verified payouts and pending royalties.
                 </p>
                 <div className="pt-8 border-t border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-2 italic">Current Momentum</p>
                    <p className="text-4xl font-display font-black text-accent">+{formatGHC(agentProfile?.stats?.commissionEarned || 0)}</p>
                 </div>
              </div>
              
              <div className="xl:w-3/4 h-[300px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                       <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#F27D26" stopOpacity={0.3}/>
                             <stop offset="95%" stopColor="#F27D26" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                       <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 900 }}
                          dy={10}
                       />
                       <YAxis hide />
                       <Tooltip 
                          contentStyle={{ 
                             backgroundColor: '#0F0F10', 
                             border: '1px solid rgba(255,255,255,0.1)',
                             borderRadius: '1rem',
                             fontSize: '10px',
                             fontWeight: 900,
                             textTransform: 'uppercase'
                          }}
                          itemStyle={{ color: '#F27D26' }}
                       />
                       <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#F27D26" 
                          strokeWidth={4}
                          fillOpacity={1} 
                          fill="url(#colorValue)" 
                          animationDuration={2000}
                       />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Main Terminal Area (Col 8) */}
          <div className="lg:col-span-8 space-y-20">
            {/* Master Studio Terminal (Brand Owner Only) */}
            {isBrandOwner && (
              <div className="bg-white p-8 md:p-16 rounded-[3rem] text-black relative border-4 border-accent shadow-[0_40px_80px_rgba(242,125,38,0.15)] mb-20 overflow-hidden">
                <div className="absolute -right-8 -top-8 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
                
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
                                       : "border-black/5 hover:border-black/20"
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
                       <div className="grid grid-cols-2 gap-4">
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
                             <img src={ownerPreview} alt="Mockup" className="w-full h-full object-cover transition-transform duration-700 group-hover/mockup:scale-110" />
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
                             <img src={ownerStudioPreview} alt="Studio" className="w-full h-full object-cover transition-transform duration-700 group-hover/studio:scale-110" />
                          ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center text-black/10">
                                <Sparkles className="w-10 h-10 mb-2" strokeWidth={1} />
                                <span className="text-[8px] font-bold uppercase tracking-tighter">Studio Visual Optional</span>
                             </div>
                          )}
                          <div className="absolute top-4 left-4 px-2 py-1 bg-black/40 backdrop-blur-md text-white text-[7px] font-black uppercase tracking-widest rounded-lg">Studio Preview</div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Product Ledger (Brand Owner Only) */}
            {isBrandOwner && (
               <div className="bg-white/5 border border-white/10 p-8 md:p-16 rounded-[3.5rem] text-white space-y-12 mb-20 overflow-hidden">
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
                                         <img src={product.mockupImage} alt="" className="w-full h-full object-cover grayscale brightness-75 group-hover:grayscale-0 group-hover:brightness-100 transition-all" />
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
                        pendingDesigns.map((design) => {
                          const [view, setView] = useState<'mockup' | 'studio'>('mockup');
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
                                  <motion.img 
                                    key={view}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    src={view === 'mockup' ? design.mockupImage : design.studioImage || design.mockupImage} 
                                    alt="" 
                                    className={cn(
                                      "w-full h-full object-cover transition-all",
                                      view === 'mockup' ? "grayscale group-hover:grayscale-0" : ""
                                    )} 
                                  />
                                </AnimatePresence>
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
                                </div>
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-6 pt-12">
                                  <p className="text-[8px] font-black uppercase tracking-widest text-accent mb-1">
                                    {view === 'mockup' ? 'Creative Blueprint' : 'Studio Calibration'}
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
                                   onClick={() => handleUpdateProductStatus(design.id, 'rejected')}
                                   className="py-4 bg-white/5 text-red-500 text-[9px] font-black uppercase tracking-widest rounded-xl border border-red-500/10 hover:bg-red-500 hover:text-white transition-all shadow-xl"
                                 >
                                   Purge
                                 </button>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </AnimatePresence>
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
                                      <p className="text-[8px] font-black uppercase text-white/20 tracking-tighter">{agent.email}</p>
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
               <div className="bg-white/5 border border-white/10 p-8 md:p-16 rounded-[3.5rem] text-white space-y-12 mb-20">
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
               </div>
            )}

            {/* Design Studio Terminal */}
            <div className="bg-[#0F0F10] rounded-[3rem] p-8 md:p-16 border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <Palette className="w-32 h-32" strokeWidth={1} />
              </div>
              
              <div className="relative z-10 space-y-10">
                <div className="max-w-xl">
                  <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter mb-4">Submission Terminal</h2>
                  <p className="text-white/40 text-sm leading-relaxed font-light uppercase tracking-tight">
                    Inject your original streetwear blueprints. Our AI engine verifies aesthetics, resolution, and brand alignment.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <input type="file" hidden ref={fileInputRef} onChange={handleFileUpload} accept="image/*" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full sm:w-auto bg-white text-black px-12 py-6 rounded-full font-black uppercase tracking-editorial text-[11px] hover:bg-accent transition-all flex items-center justify-center space-x-3 shadow-[0_0_40px_rgba(255,255,255,0.1)] active:scale-95 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Scanning Assets...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Upload Blueprint</span>
                      </>
                    )}
                  </button>
                  
                  <div className="flex items-center space-x-2 px-6 py-3 rounded-full border border-white/10 text-[9px] font-black uppercase tracking-widest text-accent">
                     <Star className="w-3 h-3 fill-accent" />
                     <span>+10% Royalty Guaranteed</span>
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
            </div>

            {/* AI Design Engine (New Section) */}
            <div className="bg-[#0F0F10] rounded-[3rem] p-8 md:p-16 border border-accent/20 relative overflow-hidden group shadow-[0_0_50px_rgba(242,125,38,0.05)]">
               <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Sparkles className="w-32 h-32 text-accent" strokeWidth={1} />
               </div>
               
               <div className="relative z-10 space-y-10">
                  <div className="max-w-xl">
                     <div className="flex items-center space-x-3 mb-4">
                        <Sparkles className="w-5 h-5 text-accent animate-pulse" />
                        <span className="text-accent text-[10px] font-black uppercase tracking-editorial">Experimental: AI Forge</span>
                     </div>
                     <h2 className="text-4xl font-display font-black uppercase italic tracking-tighter mb-4 text-white">Royal Design Engine</h2>
                     <p className="text-white/40 text-sm leading-relaxed font-light uppercase tracking-tight">
                        Convert thought into authority. Submit a design concept and our neural network will forge a visual representaton of your kingdom's aesthetic.
                     </p>
                  </div>

                  <div className="space-y-6">
                     <textarea 
                        value={genPrompt}
                        onChange={(e) => setGenPrompt(e.target.value)}
                        placeholder="Describe the aesthetic (e.g., 'A golden lion emblem with gothic typography on a dark heavyweight hoodie')..."
                        className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-8 text-[12px] font-medium uppercase tracking-widest text-white outline-none focus:border-accent transition-all min-h-[150px] resize-none"
                     />
                     
                     <div className="flex flex-col sm:flex-row items-center gap-6">
                        <button
                           onClick={handleGenerateDesign}
                           disabled={isGenerating || !genPrompt.trim()}
                           className="w-full sm:w-auto bg-accent text-black px-12 py-6 rounded-full font-black uppercase tracking-editorial text-[11px] hover:bg-white transition-all flex items-center justify-center space-x-3 shadow-2xl active:scale-95 disabled:opacity-50"
                        >
                           {isGenerating ? (
                              <>
                                 <RefreshCw className="w-4 h-4 animate-spin" />
                                 <span>Forging Blueprint...</span>
                              </>
                           ) : (
                              <>
                                 <Zap className="w-4 h-4" />
                                 <span>Generate Concept</span>
                              </>
                           )}
                        </button>
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">Generation takes ~15-30s</p>
                     </div>
                  </div>

                  {/* Generated Preview */}
                  <AnimatePresence>
                     {generatedPreview && (
                        <motion.div
                           initial={{ opacity: 0, y: 30 }}
                           animate={{ opacity: 1, y: 0 }}
                           className="pt-10 border-t border-white/5 space-y-10"
                        >
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                              <div className="aspect-square rounded-[2rem] overflow-hidden border border-accent/20 relative group">
                                 <img src={generatedPreview} alt="AI Forge" className="w-full h-full object-cover" />
                                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                 <div className="absolute bottom-6 left-6">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-accent bg-accent/10 px-3 py-1 rounded-full border border-accent/20">Forge Output v2.5</span>
                                 </div>
                              </div>
                              <div className="flex flex-col justify-center space-y-8">
                                 <div>
                                    <h4 className="text-xl font-display font-black uppercase italic text-white mb-2">Neural Output Verified</h4>
                                    <p className="text-[10px] text-white/40 leading-relaxed font-bold uppercase tracking-tight">
                                       The concept has been rendered. Review the aesthetics for brand alignment. Ready for official ledger injection?
                                    </p>
                                 </div>
                                 <button
                                    onClick={handleForgeIntoBlueprint}
                                    className="w-full bg-white text-black py-6 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-accent transition-all flex items-center justify-center space-x-3 group"
                                 >
                                    <Plus className="w-4 h-4 group-hover:scale-125 transition-transform" />
                                    <span>Forge into Blueprint</span>
                                 </button>
                              </div>
                           </div>
                        </motion.div>
                     )}
                  </AnimatePresence>
               </div>
            </div>

            {/* Submissions List */}
            <div className="space-y-8 px-2">
               <div className="flex justify-between items-end">
                  <h3 className="text-sm font-black uppercase tracking-editorial italic">Blueprint Ledger</h3>
                  <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Collection: {myDesigns.length} ITEMS</p>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  {myDesigns.map((design) => (
                    <motion.div 
                      key={design.id} 
                      whileHover={{ y: -5 }}
                      className="glass p-5 rounded-3xl border border-white/5 hover:border-accent/30 transition-all flex items-center space-x-6 grayscale hover:grayscale-0"
                    >
                       <div className="w-24 h-28 bg-[#1A1A1B] rounded-2xl overflow-hidden relative border border-white/5 group">
                          <img src={design.mockupImage} alt="Design" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                          <div className={cn(
                             "absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-background/60 backdrop-blur-sm",
                             design.status === 'approved' ? "text-green-500" : 
                             design.status === 'rejected' ? "text-red-500" : "text-accent"
                          )}>
                             {design.status === 'approved' && <CheckCircle2 className="w-8 h-8" />}
                             {design.status === 'rejected' && <AlertCircle className="w-8 h-8" />}
                             {design.status === 'pending' && <Clock className="w-8 h-8 animate-pulse" />}
                          </div>

                          {/* Top Badge Overlay */}
                          <div className={cn(
                            "absolute top-2 left-2 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest border backdrop-blur-md",
                            design.status === 'approved' ? "bg-green-500/10 border-green-500/20 text-green-500" :
                            design.status === 'rejected' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                            "bg-accent/10 border-accent/20 text-accent"
                          )}>
                            {design.status}
                          </div>
                       </div>
                       <div className="flex-1 space-y-4">
                          <div>
                             <p className="text-xs font-black uppercase tracking-tighter truncate leading-none mb-1">{design.name}</p>
                             <p className="text-[8px] font-black uppercase tracking-widest text-white/20">{design.category}</p>
                          </div>
                          <div className={cn(
                            "inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all",
                            design.status === 'approved' ? "bg-green-500/5 border-green-500/10 text-green-500" :
                            design.status === 'rejected' ? "bg-red-500/5 border-red-500/10 text-red-500" :
                            "bg-accent/5 border-accent/10 text-accent"
                          )}>
                             {design.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                             {design.status === 'rejected' && <AlertCircle className="w-3 h-3" />}
                             {design.status === 'pending' && <Clock className="w-3 h-3 animate-pulse" />}
                             <span className="text-[9px] font-black uppercase tracking-widest">{design.status}</span>
                          </div>
                       </div>
                       <div className="text-accent font-mono font-black text-xs h-full flex items-start pt-2">
                          {formatGHC(design.basePrice || 150)}
                       </div>
                    </motion.div>
                  ))}
               </div>
            </div>

            {/* Purchase History Ledger */}
            <div className="space-y-8 px-2 mt-20">
               <div className="flex justify-between items-end">
                  <h3 className="text-sm font-black uppercase tracking-editorial italic text-accent">Procurement Ledger</h3>
                  <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Active Threads: {myOrders.length}</p>
               </div>
               
               <div className="space-y-4">
                  {myOrders.map((order) => (
                    <motion.div 
                      key={order.id} 
                      onClick={() => navigate(`/order/${order.id}`)}
                      className="glass p-6 rounded-3xl border border-white/5 hover:border-accent/40 transition-all flex items-center justify-between cursor-pointer group"
                    >
                       <div className="flex items-center space-x-6">
                          <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/10 group-hover:text-accent group-hover:bg-accent/10 transition-colors">
                             <Package className="w-6 h-6" />
                          </div>
                          <div>
                             <p className="text-xs font-black uppercase tracking-tighter text-white mb-1">
                                {order.items?.[0]?.name || 'Kings Collection Item'}
                             </p>
                             <p className="text-[8px] font-black uppercase tracking-widest text-white/20">
                                Ref: {order.id.slice(0, 8).toUpperCase()} • {new Date(order.createdAt?.seconds * 1000).toLocaleDateString()}
                             </p>
                          </div>
                       </div>
                       <div className="text-right flex items-center space-x-6">
                          <div className="hidden sm:block">
                             <p className="text-[8px] font-black uppercase tracking-widest text-white/20 mb-1 italic">Status</p>
                             <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest",
                                order.status === 'delivered' ? "text-green-500" : "text-accent"
                             )}>{order.status}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-accent transition-colors" />
                       </div>
                    </motion.div>
                  ))}
                  {myOrders.length === 0 && (
                    <div className="py-20 text-center glass rounded-[3rem] border-dashed border-white/5 opacity-50">
                       <CreditCard className="w-12 h-12 text-white/5 mx-auto mb-4" />
                       <p className="text-[10px] font-black uppercase tracking-editorial text-white/10">No Procurement Data Detected.</p>
                    </div>
                  )}
               </div>
            </div>

            {/* Network Intelligence Ledger */}
            <div className="space-y-8 px-2 mt-20">
               <div className="flex justify-between items-end">
                  <h3 className="text-sm font-black uppercase tracking-editorial italic text-white">Network Intelligence</h3>
                  <p className="text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                    {isBrandOwner ? `${allAgents.length} Agents Managed` : `${referredAgents.length} Agents Verified`}
                  </p>
               </div>

               <div className="glass p-10 rounded-[3rem] border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                     <Users className="w-48 h-48 text-accent" strokeWidth={1} />
                  </div>
                  
                  <div className="relative z-10 space-y-12">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-8">
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-4 italic">Total Network Performance</p>
                              <h4 className="text-5xl font-display font-black text-accent tracking-tighter">
                                {isBrandOwner ? formatGHC(referrals.reduce((acc, r) => acc + (r.totalAmount || 0), 0)) : formatGHC(totalReferredSales)}
                              </h4>
                           </div>
                           <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4">
                              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/40">
                                 <span>Network Type</span>
                                 <span className="text-accent">{isBrandOwner ? "Global Collective" : "Direct Referral"}</span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/40">
                                 <span>Active Agents</span>
                                 <span className="text-white">{isBrandOwner ? allAgents.length : referredAgents.length}</span>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-6">
                           <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">Recent Network Activity</p>
                           <div className="space-y-3">
                              {(isBrandOwner ? allAgents : referredAgents).slice(0, 4).sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).map((agent) => (
                                 <div key={agent.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group/row hover:border-accent/20 transition-all">
                                    <div className="flex items-center space-x-3">
                                       <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-black text-[10px] text-white group-hover/row:bg-accent group-hover/row:text-black transition-colors">
                                          {agent.name?.charAt(0) || 'U'}
                                       </div>
                                       <div className="max-w-[120px]">
                                          <p className="text-[10px] font-black uppercase tracking-widest text-white/60 truncate leading-none mb-1">{agent.name}</p>
                                          <p className="text-[7px] font-black uppercase tracking-widest text-white/20 italic">
                                             {agent.createdAt ? new Date(agent.createdAt.seconds * 1000).toLocaleDateString() : 'Active Member'}
                                          </p>
                                       </div>
                                    </div>
                                    <div className="text-right">
                                       <p className="text-[9px] font-mono font-black text-accent">{formatGHC(agent.stats?.totalSales || 0)}</p>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     </div>

                     {/* Global Performance Analysis (Owner Only) */}
                     {isBrandOwner && (
                        <div className="pt-10 border-t border-white/5">
                           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-8 mb-6 italic">Global Performance Analysis</p>
                           <div className="bg-black/20 rounded-3xl border border-white/10 overflow-hidden">
                              <table className="w-full text-left">
                                 <thead>
                                    <tr className="border-b border-white/10">
                                       <th className="px-6 py-4 text-[9px] font-black uppercase text-white/40">Agent Identity</th>
                                       <th className="px-6 py-4 text-[9px] font-black uppercase text-white/40">Referrals</th>
                                       <th className="px-6 py-4 text-[9px] font-black uppercase text-white/40">Total Value</th>
                                       <th className="px-6 py-4 text-[9px] font-black uppercase text-white/40 text-right">Commission</th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    {agentPerformance.map((performance: any) => (
                                       <tr key={performance.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                          <td className="px-6 py-4">
                                             <p className="text-xs font-bold text-white mb-0.5">{performance.name}</p>
                                             <p className="text-[8px] font-black uppercase text-white/20 italic">{performance.id.slice(0, 8)}</p>
                                          </td>
                                          <td className="px-6 py-4 text-xs font-mono font-bold text-white">{performance.referralCount}</td>
                                          <td className="px-6 py-4 text-xs font-mono font-black text-accent">{formatGHC(performance.totalReferralValue)}</td>
                                          <td className="px-6 py-4 text-xs font-mono text-white/40 text-right">{formatGHC(performance.netCommission)}</td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>
          </div>

          {/* Sidebar Area (Col 4) */}
          <div className="lg:col-span-4 space-y-12">
            {/* Referral Tool */}
            <div className="bg-white p-10 rounded-[3rem] text-black relative overflow-hidden group hover:shadow-[0_0_50px_rgba(255,255,255,0.1)] transition-all mb-8">
               <div className="absolute -right-8 -top-8 w-24 h-24 bg-accent/10 rounded-full blur-2xl" />
               <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter mb-4">Authority Hub</h3>
               <p className="text-xs text-black/50 leading-relaxed font-medium uppercase tracking-tight mb-8">Deploy your link. Capture 10% on every verified transaction.</p>
               <button 
                 onClick={handleCopyLink}
                 className="w-full bg-black text-white p-5 rounded-2xl flex items-center justify-between group/btn hover:bg-accent hover:text-black transition-all active:scale-95"
               >
                  <div className="flex items-center space-x-3">
                     <LinkIcon className="w-4 h-4" />
                     <span className="text-[10px] font-black uppercase tracking-widest italic">Identity Link</span>
                  </div>
                  <Copy className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
               </button>
            </div>

            {/* Order Tracking Quick Tool */}
            <div className="glass p-10 rounded-[3rem] border border-white/5 mb-8">
               <h3 className="text-[10px] font-black uppercase tracking-editorial text-white/40 mb-6 block">Order Logistics</h3>
               <div className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Enter Order Reference..." 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-[10px] font-black uppercase tracking-widest text-accent outline-none"
                    id="orderTrackInput"
                  />
                  <button 
                    onClick={() => {
                      const id = (document.getElementById('orderTrackInput') as HTMLInputElement).value;
                      if(id) navigate(`/order/${id}`);
                    }}
                    className="w-full bg-accent text-black py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all"
                  >
                    Track Status
                  </button>
               </div>
            </div>

            {/* Payout Console */}
            <div className="glass p-10 rounded-[3rem] border border-white/5">
               <h3 className="text-[10px] font-black uppercase tracking-editorial text-white/40 mb-8 block">Payout Terminal</h3>
               <div className="space-y-8">
                  <div>
                     <label className="text-[9px] font-black uppercase tracking-widest mb-3 block text-white/20 italic">Active MoMo Instance</label>
                     <div className="relative">
                        <input 
                          type="text" 
                          value={momoNumber}
                          onChange={(e) => setMomoNumber(e.target.value)}
                          placeholder="0534716125" 
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-mono font-black text-accent focus:border-accent outline-none transition-all"
                        />
                        <div className="absolute right-5 top-1/2 -translate-y-1/2">
                           <Verified className="w-4 h-4 text-accent/40" />
                        </div>
                     </div>
                  </div>
                  <button 
                    onClick={handleUpdateMomo}
                    className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-accent transition-all active:scale-95 shadow-xl shadow-white/5"
                  >
                     Update Terminal Settings
                  </button>
               </div>
               
               <div className="mt-12 p-6 bg-white/5 rounded-2xl border border-white/5 flex items-start space-x-4">
                  <AlertCircle className="w-5 h-5 text-accent/40 mt-0.5" />
                  <p className="text-[9px] text-white/40 leading-relaxed font-medium uppercase tracking-tight italic">
                     Payouts are verified and processed every Friday for confirmed sales.
                  </p>
               </div>

               {/* Recent Payouts Log */}
               <div className="mt-12 pt-12 border-t border-white/5 space-y-6">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/20 italic">Recent Payout Logs</p>
                  <div className="space-y-3">
                     {payouts.length > 0 ? (
                        payouts.slice(0, 5).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).map((payout) => (
                           <div key={payout.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-accent/20 transition-all">
                              <div className="flex items-center space-x-4">
                                 <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center bg-white/5 transition-colors",
                                    payout.status === 'Completed' ? "text-green-500 bg-green-500/10" : "text-accent bg-accent/10"
                                 )}>
                                    <CreditCard className="w-4 h-4" />
                                 </div>
                                 <div>
                                    <p className="text-[10px] font-black uppercase tracking-tight text-white leading-none mb-1">{formatGHC(payout.amount)}</p>
                                    <p className="text-[8px] font-medium uppercase tracking-widest text-white/20">
                                       {payout.createdAt ? new Date(payout.createdAt.seconds * 1000).toLocaleDateString() : 'Processing...'}
                                    </p>
                                 </div>
                              </div>
                              <div className={cn(
                                 "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
                                 payout.status === 'Completed' ? "bg-green-500/10 text-green-500" : "bg-accent/10 text-accent"
                              )}>
                                 {payout.status}
                              </div>
                           </div>
                        ))
                     ) : (
                        <div className="text-center py-8 opacity-20 italic">
                           <p className="text-[8px] font-black uppercase tracking-widest">No payout history detected.</p>
                        </div>
                     )}
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

