import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, CheckCircle2, RefreshCw, Sparkles, ArrowRight, Compass, Filter, Trash2, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { FABRIC_COLORS, CATEGORIES } from '../constants';

interface StyleQuizProps {
  products: any[];
  onApplyRecommendations: (criteria: {
    category: string;
    gender: string;
    color: string;
    gsm: string;
    ids?: string[];
  } | null) => void;
  activeRecommendation: boolean;
}

export function StyleQuiz({ products, onApplyRecommendations, activeRecommendation }: StyleQuizProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0); // 0: Splash, 1-4: Questions, 5: Results

  // Quiz Inputs State
  // Q1 (AND input): Heavy fabric value & cozy preference
  const [wantsHeavy, setWantsHeavy] = useState<boolean | null>(null);
  const [wantsCozy, setWantsCozy] = useState<boolean | null>(null);

  // Q2 (OR input): Street wearability & accessory value
  const [wantsStreet, setWantsStreet] = useState<boolean | null>(null);
  const [wantsAccessory, setWantsAccessory] = useState<boolean | null>(null);

  // Q3 (NOT input): Vibrancy / High-Contrast preference
  const [wantsVibrant, setWantsVibrant] = useState<boolean | null>(null);

  // Q4: Silhouette Segment
  const [genderPref, setGenderPref] = useState<'All' | 'male' | 'female' | 'unisex'>('All');

  // Logic Gate Solver Outputs
  const gatingLogic = useMemo(() => {
    const isANDSatisfied = !!(wantsHeavy && wantsCozy);
    const isORSatisfied = !!(wantsStreet || wantsAccessory);
    const isNOTSatisfied = wantsVibrant !== null ? !wantsVibrant : null; // Low-key style path if not vibrant

    return {
      and: isANDSatisfied, // Heavy & Cozy Comfort
      or: isORSatisfied,   // Sport/Street & Accessories
      not: isNOTSatisfied, // lowKey Mono Vibe
    };
  }, [wantsHeavy, wantsCozy, wantsStreet, wantsAccessory, wantsVibrant]);

  // Recommendation Matcher Logic
  const recommendations = useMemo(() => {
    if (step < 5) return [];

    const computed = products.map((product) => {
      let score = 0;
      const reasons: string[] = [];

      // AND Gate evaluation (Comfort Vibe)
      const isHeavyweight = product.gsmOptions?.some((gsm: string) => Number(gsm) >= 260) || false;
      const isCozyCategory = ['Hoodies', 'Sweatshirts', 'Acid Wash'].includes(product.category);
      
      if (gatingLogic.and) {
        if (isHeavyweight && isCozyCategory) {
          score += 35;
          reasons.push('AND Gate fulfilled: High density structural comfort detected');
        } else if (isHeavyweight || isCozyCategory) {
          score += 15;
          reasons.push('AND Gate partially active: Satisfies comfort nodes');
        }
      } else {
        // Did not want heavyweight cozy, prefers lightweight
        if (!isHeavyweight && !isCozyCategory) {
          score += 35;
          reasons.push('AND Gate bypass: Matched lightweight styling');
        }
      }

      // OR Gate evaluation (Vibe Path)
      const isStreetCategory = ['Caps', 'Joggers', 'Outerwear', 'Accessories'].includes(product.category);
      const isBaseTshirtOrCrop = ['T-Shirts', 'Crop Tops'].includes(product.category);

      if (gatingLogic.or) {
        if (isStreetCategory) {
          score += 35;
          reasons.push('OR Gate satisfied: Matched outdoor street hardware segment');
        } else {
          score += 10;
        }
      } else {
        if (isBaseTshirtOrCrop || ['Sweatshirts'].includes(product.category)) {
          score += 35;
          reasons.push('OR Gate bypass: Matched minimalist lifestyle essentials');
        }
      }

      // NOT Gate evaluation (Colorway Target)
      const monoColors = ['pure white', 'noir black', 'acid grey', 'cream oat', 'sand'];
      const productColors = (product.colors || product.allowedColors || []).map((c: string) => c.toLowerCase());
      const hasMonoColor = productColors.some((c: string) => monoColors.includes(c));

      if (gatingLogic.not === true) {
        // NOT Gate Active: Prefers NOT Vibrant (Low key, monochromatic)
        if (hasMonoColor) {
          score += 30;
          reasons.push('NOT Gate fulfilled: Low-key monochromatic element detected');
        }
      } else if (gatingLogic.not === false) {
        // NOT Gate Inactive: Wants expressiveness / vibrancy
        if (!hasMonoColor && productColors.length > 0) {
          score += 30;
          reasons.push('Vibrancy pathway satisfied: High-chroma color alignment');
        }
      }

      // Gender Match Node
      if (genderPref !== 'All') {
        const productGender = product.gender || 'unisex';
        if (productGender === genderPref || productGender === 'unisex') {
          score += 20;
        } else {
          score -= 15;
        }
      } else {
        score += 20;
      }

      return {
        ...product,
        matchScore: Math.min(100, Math.max(0, score)),
        reasons
      };
    });

    return computed
      .filter(item => item.matchScore > 40)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3);
  }, [products, gatingLogic, genderPref, step]);

  const resetQuiz = () => {
    setWantsHeavy(null);
    setWantsCozy(null);
    setWantsStreet(null);
    setWantsAccessory(null);
    setWantsVibrant(null);
    setGenderPref('All');
    setStep(1);
  };

  const applySelection = () => {
    if (recommendations.length > 0) {
      // Create criteria targeting matched product ids
      const matchedIds = recommendations.map(p => p.id);
      onApplyRecommendations({
        category: 'All',
        gender: genderPref,
        color: 'All',
        gsm: 'All',
        ids: matchedIds
      });
      setIsOpen(false);
    }
  };

  const clearSelection = () => {
    onApplyRecommendations(null);
  };

  return (
    <div className="mb-12">
      {/* Quiz trigger panel */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 p-6 sm:p-8 bg-black/40 border border-white/5 rounded-[24px] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-accent/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-red-500/5 rounded-full blur-[60px] pointer-events-none" />
        
        <div className="flex gap-4 items-start max-w-2xl relative z-10">
          <div className="p-3.5 bg-accent/10 border border-accent/20 rounded-2xl text-accent self-start">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1.5Packed">
            <h3 className="text-lg font-black uppercase tracking-widest text-white flex items-center gap-2">
              Style Logic Router
              <span className="text-[9px] bg-accent/20 text-accent font-black px-2.5 py-0.5 rounded-full border border-accent/30 tracking-widest uppercase">Gated Search</span>
            </h3>
            <p className="text-xs text-white/50 leading-relaxed font-sans">
              Evaluate real-time logic gates (AND, OR, NOT) to filter catalog blueprints based on comfort curves, colorways, and structural fits.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10 whitespace-nowrap">
          {activeRecommendation && (
            <button
              onClick={clearSelection}
              className="px-6 py-3.5 border border-red-500/20 bg-red-500/5 text-red-400 font-extrabold text-[9px] tracking-widest uppercase rounded-xl hover:bg-red-500/15 transition-all flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Logic Filter
            </button>
          )}

          <button
            onClick={() => {
              setIsOpen(true);
              if (step === 0) setStep(1);
            }}
            className={cn(
              "px-8 py-3.5 rounded-xl font-black text-[9px] tracking-widest uppercase transition-all flex items-center gap-2.5 group",
              activeRecommendation 
                ? "bg-white text-black hover:bg-white/80"
                : "bg-accent text-black hover:scale-[1.02] shadow-lg shadow-accent/10"
            )}
          >
            <Compass className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform" />
            {activeRecommendation ? 'Recheck Style Solver' : 'Compute Perfect Match'}
          </button>
        </div>
      </div>

      {/* Styled Dialog Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md overflow-y-auto">
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.4 }}
              className="bg-[#0A0A0A] border border-white/10 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col relative"
            >
              {/* Top Bar bar */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Core Solver Gateway : Step {step === 5 ? 'Done' : `${step}/4`}</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-white/40 hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
                >
                  [CLOSE]
                </button>
              </div>

              {/* Progress Bar indicator */}
              <div className="w-full h-[3px] bg-white/5 relative">
                <motion.div 
                  className="absolute top-0 left-0 h-full bg-accent"
                  initial={{ width: '0%' }}
                  animate={{ width: `${(step / 5) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Quiz Body Content */}
              <div className="p-8 flex-grow">
                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div className="space-y-3">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 border border-accent/20 rounded-lg">
                          <Cpu className="w-3.5 h-3.5 text-accent" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-accent">Comfort & Weight Logic [AND]</span>
                        </div>
                        <h4 className="text-2xl sm:text-3xl font-display font-black tracking-tight uppercase italic text-white leading-tight">
                          Initiating Weight and Structural Gate
                        </h4>
                        <p className="text-xs text-white/50 leading-relaxed font-sans">
                          In streetwear, density is structure. Let us determine if your fit calls for the Heavyweight styling grid.
                        </p>
                      </div>

                      <div className="space-y-6 bg-white/5 p-6 rounded-2xl border border-white/5">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block">Input Node A</label>
                          <p className="text-[11px] text-white/80 uppercase font-bold">Do you demand robust, high-gsm heavyweight fabrics that maintain their shape?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setWantsHeavy(true)}
                              className={cn(
                                "flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                                wantsHeavy === true 
                                  ? "bg-accent text-black border-accent" 
                                  : "bg-white/5 text-white/60 border-white/5 hover:border-white/20"
                              )}
                            >
                              [ 1 ] YES
                            </button>
                            <button
                              onClick={() => setWantsHeavy(false)}
                              className={cn(
                                "flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                                wantsHeavy === false 
                                  ? "bg-accent text-black border-accent" 
                                  : "bg-white/5 text-white/60 border-white/5 hover:border-white/20"
                              )}
                            >
                              [ 0 ] NO
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-white/5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block">Input Node B</label>
                          <p className="text-[11px] text-white/80 uppercase font-bold">Are you optimizing for cold weather or loose cozy comfort fits?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setWantsCozy(true)}
                              className={cn(
                                "flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                                wantsCozy === true 
                                  ? "bg-accent text-black border-accent" 
                                  : "bg-white/5 text-white/60 border-white/5 hover:border-white/20"
                              )}
                            >
                              [ 1 ] YES
                            </button>
                            <button
                              onClick={() => setWantsCozy(false)}
                              className={cn(
                                "flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                                wantsCozy === false 
                                  ? "bg-accent text-black border-accent" 
                                  : "bg-white/5 text-white/60 border-white/5 hover:border-white/20"
                              )}
                            >
                              [ 0 ] NO
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Live Logic Gate visualization */}
                      <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl text-[9px] font-mono uppercase tracking-widest">
                        <span className="text-white/40">Gating State:</span>
                        <div className="flex items-center gap-1.5 font-black">
                          <span className={wantsHeavy === true ? "text-accent" : "text-white/20"}>A ({wantsHeavy === null ? '?' : wantsHeavy ? '1' : '0'})</span>
                          <span className="text-white/20">AND</span>
                          <span className={wantsCozy === true ? "text-accent" : "text-white/20"}>B ({wantsCozy === null ? '?' : wantsCozy ? '1' : '0'})</span>
                          <span className="text-white/20">=</span>
                          <span className={gatingLogic.and ? "text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20" : "text-white/20"}>
                            {wantsHeavy === null || wantsCozy === null ? 'UNDEFINED' : gatingLogic.and ? 'HEAVY COMFORT (1)' : 'LIGHT COMFORT (0)'}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          disabled={wantsHeavy === null || wantsCozy === null}
                          onClick={() => setStep(2)}
                          className="px-8 py-3.5 bg-white text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-2"
                        >
                          Next Gate Sequence <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div className="space-y-3">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 border border-accent/20 rounded-lg">
                          <Cpu className="w-3.5 h-3.5 text-accent" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-accent">Street / Active Pathway [OR]</span>
                        </div>
                        <h4 className="text-2xl sm:text-3xl font-display font-black tracking-tight uppercase italic text-white leading-tight">
                          Setting Outdoor Vibe Parameters
                        </h4>
                        <p className="text-xs text-white/50 leading-relaxed font-sans">
                          Let us discover if your layout aligns with active, expressive outerwear garments or lightweight casual loungewear.
                        </p>
                      </div>

                      <div className="space-y-6 bg-white/5 p-6 rounded-2xl border border-white/5">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block">Input Node C</label>
                          <p className="text-[11px] text-white/80 uppercase font-bold">Will you be styling this for outdoor active environments?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setWantsStreet(true)}
                              className={cn(
                                "flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                                wantsStreet === true 
                                  ? "bg-accent text-black border-accent" 
                                  : "bg-white/5 text-white/60 border-white/5 hover:border-white/20"
                              )}
                            >
                              [ 1 ] YES
                            </button>
                            <button
                              onClick={() => setWantsStreet(false)}
                              className={cn(
                                "flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                                wantsStreet === false 
                                  ? "bg-accent text-black border-accent" 
                                  : "bg-white/5 text-white/60 border-white/5 hover:border-white/20"
                              )}
                            >
                              [ 0 ] NO
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-white/5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block">Input Node D</label>
                          <p className="text-[11px] text-white/80 uppercase font-bold">Do you want statement headwear (caps) or protective hardware outerwear?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setWantsAccessory(true)}
                              className={cn(
                                "flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                                wantsAccessory === true 
                                  ? "bg-accent text-black border-accent" 
                                  : "bg-white/5 text-white/60 border-white/5 hover:border-white/20"
                              )}
                            >
                              [ 1 ] YES
                            </button>
                            <button
                              onClick={() => setWantsAccessory(false)}
                              className={cn(
                                "flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                                wantsAccessory === false 
                                  ? "bg-accent text-black border-accent" 
                                  : "bg-white/5 text-white/60 border-white/5 hover:border-white/20"
                              )}
                            >
                              [ 0 ] NO
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Live Logic Gate visualization */}
                      <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl text-[9px] font-mono uppercase tracking-widest">
                        <span className="text-white/40">Gating State:</span>
                        <div className="flex items-center gap-1.5 font-black">
                          <span className={wantsStreet === true ? "text-accent" : "text-white/20"}>C ({wantsStreet === null ? '?' : wantsStreet ? '1' : '0'})</span>
                          <span className="text-white/20">OR</span>
                          <span className={wantsAccessory === true ? "text-accent" : "text-white/20"}>D ({wantsAccessory === null ? '?' : wantsAccessory ? '1' : '0'})</span>
                          <span className="text-white/20">=</span>
                          <span className={gatingLogic.or ? "text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20" : "text-white/20"}>
                            {wantsStreet === null || wantsAccessory === null ? 'UNDEFINED' : gatingLogic.or ? 'STREET VIBE (1)' : 'MINIMAL LIFESTYLE (0)'}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between">
                        <button
                          onClick={() => setStep(1)}
                          className="px-6 py-3.5 border border-white/10 text-white/60 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-white/5 transition-all"
                        >
                          Back
                        </button>
                        <button
                          disabled={wantsStreet === null || wantsAccessory === null}
                          onClick={() => setStep(3)}
                          className="px-8 py-3.5 bg-white text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-2"
                        >
                          Next Gate Sequence <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div className="space-y-3">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 border border-accent/20 rounded-lg">
                          <Cpu className="w-3.5 h-3.5 text-accent" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-accent">Color Authority Spectrum [NOT]</span>
                        </div>
                        <h4 className="text-2xl sm:text-3xl font-display font-black tracking-tight uppercase italic text-white leading-tight">
                          Resolving Chromatic Temperature
                        </h4>
                        <p className="text-xs text-white/50 leading-relaxed font-sans">
                          Are we setting expressive high-chroma wavelengths or resolving monochromatic low-key shades (black, white, grey, sand)?
                        </p>
                      </div>

                      <div className="space-y-6 bg-white/5 p-6 rounded-2xl border border-white/5">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block">Input Node E</label>
                          <p className="text-[11px] text-white/80 uppercase font-bold">Do you prefer expressive, vibrant pop colours (e.g. Royal Blue, Crimson, Golden) over neutral shades?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setWantsVibrant(true)}
                              className={cn(
                                "flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                                wantsVibrant === true 
                                  ? "bg-accent text-black border-accent" 
                                  : "bg-white/5 text-white/60 border-white/5 hover:border-white/20"
                              )}
                            >
                              [ 1 ] YES
                            </button>
                            <button
                              onClick={() => setWantsVibrant(false)}
                              className={cn(
                                "flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                                wantsVibrant === false 
                                  ? "bg-accent text-black border-accent" 
                                  : "bg-white/5 text-white/60 border-white/5 hover:border-white/20"
                              )}
                            >
                              [ 0 ] NO
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Live Logic Gate visualization */}
                      <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl text-[9px] font-mono uppercase tracking-widest">
                        <span className="text-white/40">Gating State:</span>
                        <div className="flex items-center gap-1.5 font-black">
                          <span className="text-white/20">NOT</span>
                          <span className={wantsVibrant === true ? "text-accent" : "text-white/20"}>E ({wantsVibrant === null ? '?' : wantsVibrant ? '1' : '0'})</span>
                          <span className="text-white/20">=</span>
                          <span className={gatingLogic.not === true ? "text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20" : "text-white/20"}>
                            {wantsVibrant === null ? 'UNDEFINED' : gatingLogic.not ? 'MONOCHROMATIC (1)' : 'EXPRESSIVE POP (0)'}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between">
                        <button
                          onClick={() => setStep(2)}
                          className="px-6 py-3.5 border border-white/10 text-white/60 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-white/5 transition-all"
                        >
                          Back
                        </button>
                        <button
                          disabled={wantsVibrant === null}
                          onClick={() => setStep(4)}
                          className="px-8 py-3.5 bg-white text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-2"
                        >
                          Next Gate Sequence <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {step === 4 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div className="space-y-3">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 border border-accent/20 rounded-lg">
                          <Cpu className="w-3.5 h-3.5 text-accent" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-accent">Silhouette Archetype</span>
                        </div>
                        <h4 className="text-2xl sm:text-3xl font-display font-black tracking-tight uppercase italic text-white leading-tight">
                          Select Blueprint Segment
                        </h4>
                        <p className="text-xs text-white/50 leading-relaxed font-sans">
                          Determine target gender styling or bypass with unisex integration.
                        </p>
                      </div>

                      <div className="space-y-3 bg-white/5 p-6 rounded-2xl border border-white/5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block">Fit Archetype</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { value: 'All', label: 'ANY SEGMENT' },
                            { value: 'male', label: 'MALE FITS' },
                            { value: 'female', label: 'FEMALE FITS' },
                            { value: 'unisex', label: 'UNISEX ARCHETYPE' }
                          ].map(item => (
                            <button
                              key={item.value}
                              onClick={() => setGenderPref(item.value as any)}
                              className={cn(
                                "py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                                genderPref === item.value 
                                  ? "bg-accent text-black border-accent" 
                                  : "bg-white/5 text-white/60 border-white/5 hover:border-white/20"
                              )}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between">
                        <button
                          onClick={() => setStep(3)}
                          className="px-6 py-3.5 border border-white/10 text-white/60 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-white/5 transition-all"
                        >
                          Back
                        </button>
                        <button
                          onClick={() => setStep(5)}
                          className="px-8 py-3.5 bg-accent text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-accent/20"
                        >
                          Show Logical Matches <Sparkles className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {step === 5 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="space-y-6"
                    >
                      <div className="space-y-2">
                        <h4 className="text-2xl sm:text-3xl font-display font-black uppercase italic leading-tight text-white flex items-center gap-2">
                          Solver Calculation Complete
                        </h4>
                        <p className="text-xs text-white/50 leading-relaxed font-sans">
                          The Style Logic gates have compiled successfully. Below are the matched blueprints from KNGS authority database.
                        </p>
                      </div>

                      {/* Matched product list */}
                      <div className="space-y-4 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                        {recommendations.length === 0 ? (
                          <div className="py-12 text-center border border-white/5 rounded-2xl bg-white/[0.01]">
                            <HelpCircle className="w-8 h-8 text-white/15 mx-auto mb-3" />
                            <p className="text-[10px] uppercase font-black tracking-widest text-white/40">No Perfect 100% Matches Found</p>
                            <p className="text-[10.5px] text-white/20 mt-1 max-w-sm mx-auto">No direct items match this query in the digital vault yet. Broaden step criteria to refresh matches.</p>
                          </div>
                        ) : (
                          recommendations.map((item) => (
                            <div 
                              key={item.id} 
                              className="p-4 bg-white/5 border border-white/5 rounded-2xl flex gap-4 items-center hover:border-accent/30 transition-all group"
                            >
                              <div className="w-16 h-16 bg-black rounded-lg border border-white/5 flex-shrink-0 relative overflow-hidden flex items-center justify-center">
                                {item.imageUrl ? (
                                  <img 
                                    src={item.imageUrl} 
                                    alt={item.name} 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{item.category}</span>
                                )}
                                <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-accent text-[7px] text-black font-black uppercase rounded">
                                  {item.matchScore}%
                                </div>
                              </div>
                              <div className="flex-grow space-y-1">
                                <p className="text-[10px] text-accent font-black uppercase tracking-widest">{item.category}</p>
                                <h5 className="text-xs font-black uppercase tracking-wide text-white group-hover:text-accent transition-colors">{item.name}</h5>
                                <div className="space-y-0.5">
                                  {item.reasons.slice(0, 1).map((r: string, idx: number) => (
                                    <p key={idx} className="text-[8.5px] text-white/40 font-mono tracking-widest uppercase italic">{r}</p>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Display of gate inputs */}
                      <div className="grid grid-cols-3 gap-2 p-3 bg-white/[0.01] border border-white/5 rounded-xl text-[8.5px] font-mono uppercase tracking-widest text-white/40 text-center">
                        <div>
                          <p className="text-[7.5px] text-white/20 mb-1">AND GATE</p>
                          <span className={cn("font-black text-[9px]", gatingLogic.and ? "text-accent" : "text-white/30")}>
                            {gatingLogic.and ? "Active (Cozy)" : "Off (Light)"}
                          </span>
                        </div>
                        <div className="border-x border-white/5">
                          <p className="text-[7.5px] text-white/20 mb-1">OR GATE</p>
                          <span className={cn("font-black text-[9px]", gatingLogic.or ? "text-accent" : "text-white/30")}>
                            {gatingLogic.or ? "Active (Street)" : "Off (Casual)"}
                          </span>
                        </div>
                        <div>
                          <p className="text-[7.5px] text-white/20 mb-1">NOT GATE</p>
                          <span className={cn("font-black text-[9px]", gatingLogic.not === true ? "text-accent" : "text-white/30")}>
                            {gatingLogic.not === true ? "Active (Mono)" : "Off (Vibrant)"}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={resetQuiz}
                          className="px-6 py-4 border border-white/10 text-white/60 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-white/5 transition-all flex items-center justify-center gap-1 flex-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Calibrate Gates
                        </button>
                        <button
                          disabled={recommendations.length === 0}
                          onClick={applySelection}
                          className="px-8 py-4 bg-accent text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 flex-1 shadow-lg shadow-accent/20"
                        >
                          <Filter className="w-3.5 h-3.5 fill-current" />
                          Apply Recommendations
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
