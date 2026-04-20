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
  Sparkles
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import React from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { cn, formatGHC } from '@/src/lib/utils';
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
  const { user, agentProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'scanning' | 'pending' | 'success' | 'rejected'>('idle');
  const [scanResults, setScanResults] = useState<string | null>(null);
  const [myDesigns, setMyDesigns] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [referredAgents, setReferredAgents] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [momoNumber, setMomoNumber] = useState(agentProfile?.momoNumber || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genPrompt, setGenPrompt] = useState('');
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        mockupImage: generatedPreview,
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

    return () => {
      unsubscribeDesigns();
      unsubscribeOrders();
      unsubscribeReferred();
      unsubscribePayouts();
    };
  }, [user]);

  const totalReferredSales = useMemo(() => {
    return referredAgents.reduce((acc, agent) => acc + (agent.stats?.totalSales || 0), 0);
  }, [referredAgents]);

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
          mockupImage: `data:${file.type};base64,${base64Data}`,
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
                  <p className="text-[10px] text-white/20 font-black uppercase tracking-widest italic">{referredAgents.length} Agents Verified</p>
               </div>

               <div className="glass p-10 rounded-[3rem] border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                     <Users className="w-48 h-48 text-accent" strokeWidth={1} />
                  </div>
                  
                  <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12">
                     <div className="space-y-8">
                        <div>
                           <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-4 italic">Total Network Performance</p>
                           <h4 className="text-5xl font-display font-black text-accent tracking-tighter">{formatGHC(totalReferredSales)}</h4>
                        </div>
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4">
                           <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/40">
                              <span>Commission Rate</span>
                              <span className="text-accent">10.0%</span>
                           </div>
                           <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/40">
                              <span>Total Signups</span>
                              <span className="text-white">{referredAgents.length}</span>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">Recent Network Activity</p>
                        <div className="space-y-3">
                           {referredAgents.slice(0, 4).sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).map((agent) => (
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
                           {referredAgents.length === 0 && (
                              <div className="py-12 text-center opacity-20 italic">
                                 <p className="text-[8px] font-black uppercase tracking-widest">Awaiting network expansion.</p>
                              </div>
                           )}
                        </div>
                     </div>
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

