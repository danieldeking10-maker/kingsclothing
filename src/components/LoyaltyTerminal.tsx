import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, 
  Crown, 
  Gem, 
  Shield, 
  Sparkles, 
  Gift, 
  Clock, 
  Check, 
  Lock, 
  Info, 
  Ticket, 
  ArrowRight,
  TrendingUp,
  ChevronRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { doc, runTransaction, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatGHC, cn } from '../lib/utils';
import { toast } from 'react-hot-toast';

interface LoyaltyTerminalProps {
  user: any;
  agentProfile: any;
}

export interface LoyaltyTier {
  name: string;
  minPoints: number;
  maxPoints: number;
  discountRate: number;
  perks: string[];
  badgeColor: string;
  textColor: string;
  borderColor: string;
  bgColor: string;
  glowColor: string;
  icon: any;
}

export const LOYALTY_TIERS: LoyaltyTier[] = [
  {
    name: 'BRONZE CITIZEN',
    minPoints: 0,
    maxPoints: 999,
    discountRate: 0,
    perks: [
      'Earn 10 KNGS Crowns per 1 GHC spent',
      'Access to standard apparel releases',
      'Electronic logistics receipts'
    ],
    badgeColor: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500/20',
    bgColor: 'bg-gradient-to-br from-orange-550/10 to-orange-950/20',
    glowColor: 'rgba(242, 125, 38, 0.15)',
    icon: Shield
  },
  {
    name: 'SILVER LEGIONARY',
    minPoints: 1000,
    maxPoints: 4999,
    discountRate: 0.05,
    perks: [
      '5% Direct Discount on all checkout purchases',
      'Earn 11 KNGS Crowns per 1 GHC spent (1.1x boost)',
      'Early access notifications to digital design catalog',
      'Silver badge distinction on Citadel accounts'
    ],
    badgeColor: 'bg-slate-300/15 border-slate-300/30 text-white',
    textColor: 'text-slate-200',
    borderColor: 'border-slate-300/20',
    bgColor: 'bg-gradient-to-br from-slate-700/10 to-slate-900/20',
    glowColor: 'rgba(203, 213, 225, 0.15)',
    icon: Award
  },
  {
    name: 'GOLD SOVEREIGN',
    minPoints: 5000,
    maxPoints: 14999,
    discountRate: 0.10,
    perks: [
      '10% Direct Discount on all checkout purchases',
      'Earn 12 KNGS Crowns per 1 GHC spent (1.2x boost)',
      'Free premium velvet box & branded hanger upgrades',
      'Golden Sovereign profile badge',
      'VIP bypass for order processing queues'
    ],
    badgeColor: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    textColor: 'text-yellow-400',
    borderColor: 'border-yellow-500/20',
    bgColor: 'bg-gradient-to-br from-yellow-700/15 to-yellow-950/20',
    glowColor: 'rgba(234, 179, 8, 0.25)',
    icon: Crown
  },
  {
    name: 'IMPERIAL CITADEL LORD',
    minPoints: 15000,
    maxPoints: Infinity,
    discountRate: 0.15,
    perks: [
      '15% Direct Discount on all checkout purchases',
      'Earn 15 KNGS Crowns per 1 GHC spent (1.5x mega boost)',
      'Complimentary designer merchandise gifts with every order',
      'Priority express logistics at half cost',
      'Direct line to lead styling consultants',
      'Exclusive Citadel Lord status'
    ],
    badgeColor: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/20',
    bgColor: 'bg-gradient-to-br from-purple-700/15 to-purple-950/25',
    glowColor: 'rgba(168, 85, 247, 0.3)',
    icon: Gem
  }
];

export function getLoyaltyTier(points: number): LoyaltyTier {
  return LOYALTY_TIERS.find(tier => points >= tier.minPoints && points <= tier.maxPoints) || LOYALTY_TIERS[0];
}

interface RewardOption {
  id: string;
  title: string;
  type: 'coupon' | 'packaging' | 'merch';
  cost: number;
  description: string;
  valueString: string;
}

const REWARD_MARKETPLACE: RewardOption[] = [
  {
    id: 'coupon_25',
    title: 'GHC 25 Brand Coupon',
    type: 'coupon',
    cost: 1000,
    description: 'Generates a GHC 25 discount code applicable at any order checkout.',
    valueString: 'Coupon GHC 25'
  },
  {
    id: 'pack_luxury',
    title: 'Luxury Box Packaging Upgrade',
    type: 'packaging',
    cost: 1500,
    description: 'Complimentary heavy-weight brand storage box option for your next collection order.',
    valueString: 'Packaging Upgrade'
  },
  {
    id: 'patch_gold',
    title: 'Embroidered KNGS Crown Crest',
    type: 'merch',
    cost: 3000,
    description: 'Exclusive iron-on gold embroidered crown crest badge for personal customizations.',
    valueString: 'Physical Badge Upgrade'
  },
  {
    id: 'merch_mystery',
    title: 'Mystery Citadel Merch Drop',
    type: 'merch',
    cost: 7500,
    description: 'Custom luxury brand accessories curated and shipped directly to your active address.',
    valueString: 'Sovereign Merch Drawer'
  }
];

export const LoyaltyTerminal: React.FC<LoyaltyTerminalProps> = ({ user, agentProfile }) => {
  const [activeTab, setActiveTab] = useState<'status' | 'marketplace' | 'claims'>('status');
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const currentPoints = agentProfile?.loyaltyPoints || 0;
  const currentTier = getLoyaltyTier(currentPoints);
  const nextTierIndex = LOYALTY_TIERS.findIndex(t => t.name === currentTier.name) + 1;
  const nextTier = nextTierIndex < LOYALTY_TIERS.length ? LOYALTY_TIERS[nextTierIndex] : null;

  const progressPercent = nextTier 
    ? Math.min(100, Math.max(0, ((currentPoints - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100))
    : 100;

  const pointsToNext = nextTier ? nextTier.minPoints - currentPoints : 0;

  // Handles point deduction and claiming rewards in a safe Firestore Transaction
  const handleRedeemReward = async (reward: RewardOption) => {
    if (!user) {
      toast.error('Identity authorization required to claim rewards.');
      return;
    }

    if (currentPoints < reward.cost) {
      toast.error(`Insufficient Crowns. You require ${reward.cost - currentPoints} more Crowns.`);
      return;
    }

    setRedeemingId(reward.id);
    try {
      const result = await runTransaction(db, async (transaction) => {
        const agentRef = doc(db, 'agents', user.uid);
        const agentSnap = await transaction.get(agentRef);

        if (!agentSnap.exists()) {
          throw new Error('User account profile was not found.');
        }

        const data = agentSnap.data();
        const prevPoints = data.loyaltyPoints || 0;

        if (prevPoints < reward.cost) {
          throw new Error('Insufficient points balance detected on server ledger.');
        }

        const voucherCode = `KNGS-CROWN-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${reward.cost}`;

        const rewardLog = {
          id: `${reward.id}_${Date.now()}`,
          rewardId: reward.id,
          title: reward.title,
          cost: reward.cost,
          code: voucherCode,
          type: reward.type,
          claimedAt: new Date().toISOString(),
          status: 'Unused'
        };

        // Update the points balance and add the claimed receipt
        transaction.update(agentRef, {
          loyaltyPoints: prevPoints - reward.cost,
          rewardsClaimed: arrayUnion(rewardLog)
        });

        return voucherCode;
      });

      toast.custom((t) => (
        <div className={`bg-black/95 text-white p-6 rounded-[2rem] border-2 border-accent/40 shadow-2xl flex flex-col gap-3 max-w-sm ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
          <div className="flex items-center gap-3">
            <div className="bg-accent/10 p-2.5 rounded-lg border border-accent/20">
              <Gift className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-xs font-black uppercase text-accent tracking-widest">Claim Code Secured!</p>
              <p className="text-[10px] text-white/50 uppercase">Voucher successfully minted on Citadel chain.</p>
            </div>
          </div>
          <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Use this code at checkout / in notes:</p>
          <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center justify-between font-mono text-sm tracking-widest font-black text-amber-500">
            <span>{result}</span>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(result);
                toast.success('Reward coupon copied to clipboard!');
              }}
              className="px-2 py-1 bg-white/5 hover:bg-white/10 text-[9px] uppercase font-sans tracking-widest text-white rounded"
            >
              Copy
            </button>
          </div>
        </div>
      ), { duration: 6000 });

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Points transaction aborted.');
    } finally {
      setRedeemingId(null);
    }
  };

  const claimedRewards = agentProfile?.rewardsClaimed || [];

  return (
    <section className="bg-[#0F0F10] p-8 md:p-12 rounded-[4rem] border-4 border-white/10 shadow-2xl overflow-hidden relative">
      {/* Visual Identity Decor */}
      <div className="absolute right-0 top-0 p-8 opacity-5">
        <Crown className="w-40 h-40 text-accent" strokeWidth={0.5} />
      </div>

      <div className="relative z-10 space-y-10">
        
        {/* Terminal Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-accent/10 p-3 rounded-2xl border border-accent/20 text-accent">
              <Crown className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white">Loyalty Terminal<span className="text-accent">_</span></h3>
              <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Royal Sovereign Multipliers</p>
            </div>
          </div>

          {/* Navigation tabs inside header */}
          <div className="flex p-1.5 bg-black/60 rounded-2xl border border-white/5 w-full md:w-auto self-stretch md:self-auto gap-1">
            <button
              onClick={() => setActiveTab('status')}
              className={cn(
                "flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'status' ? "bg-accent text-black" : "text-white/40 hover:text-white"
              )}
            >
              Status
            </button>
            <button
              onClick={() => setActiveTab('marketplace')}
              className={cn(
                "flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'marketplace' ? "bg-accent text-black" : "text-white/40 hover:text-white"
              )}
            >
              Market
            </button>
            <button
              onClick={() => setActiveTab('claims')}
              className={cn(
                "flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all gap-2 flex items-center justify-center",
                activeTab === 'claims' ? "bg-accent text-black" : "text-white/40 hover:text-white"
              )}
            >
              Claim Vault
              {claimedRewards.length > 0 && (
                <span className={cn("px-1.5 py-0.5 rounded-md text-[8px] font-mono leading-none font-black", activeTab === 'claims' ? "bg-black text-accent" : "bg-accent text-black")}>
                  {claimedRewards.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Display Area */}
        <AnimatePresence mode="wait">
          {activeTab === 'status' && (
            <motion.div
              key="status"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Point Status and Progress Dashboard */}
              <div className="lg:col-span-5 bg-black/40 border-2 border-white/5 rounded-[3rem] p-8 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none transition-opacity opacity-20" style={{ background: `radial-gradient(circle at top right, ${currentTier.glowColor}, transparent 60%)` }} />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/30 italic">Active Balance</span>
                    <span className={`px-4 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${currentTier.badgeColor}`}>
                      {currentTier.name}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-6xl font-display font-black text-white tracking-widest flex items-baseline gap-2 leading-none">
                      {currentPoints.toLocaleString()}
                      <span className="text-accent text-sm font-black uppercase tracking-widest">Crowns</span>
                    </h4>
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest italic pt-1">Accruing with every verified checkout purchase</p>
                  </div>
                </div>

                {nextTier ? (
                  <div className="space-y-4 pt-8 border-t border-white/5 mt-8">
                    <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest">
                      <span className="text-white/40 italic">Next Milestones</span>
                      <span className="text-accent">{pointsToNext.toLocaleString()} Crowns to {nextTier.name.split(' ')[0]}</span>
                    </div>

                    {/* Styled High-Fidelity Progress Strip */}
                    <div className="h-3 bg-white/5 rounded-full overflow-hidden p-[2px] border border-white/10">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="h-full bg-accent rounded-full shadow-[0_0_15px_rgba(242,125,38,0.5)]"
                      />
                    </div>
                    
                    <div className="flex justify-between text-[8px] font-mono text-white/20 uppercase">
                      <span>{currentTier.minPoints} PT</span>
                      <span>{nextTier.minPoints} PT</span>
                    </div>
                  </div>
                ) : (
                  <div className="pt-8 border-t border-white/5 mt-8 flex items-center gap-3">
                    <div className="bg-purple-500/10 p-2 rounded-lg border border-purple-500/20 text-purple-400">
                      <Gem className="w-4 h-4" />
                    </div>
                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-wider italic">
                      Maximum Loyalty Tier Unified. Imperial status validated.
                    </p>
                  </div>
                )}
              </div>

              {/* Perks list according to Tier */}
              <div className="lg:col-span-7 space-y-6">
                <div className="p-4 bg-white/2 rounded-2xl border border-white/5 flex items-start gap-4">
                  <Info className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-white/40 uppercase tracking-tight leading-relaxed italic font-sans">
                    You currently possess <b className="text-accent">{currentTier.name}</b> authority. An exclusive discount of <b className="text-white">{(currentTier.discountRate * 100)}%</b> is mapped directly onto your account profile checkout operations.
                  </p>
                </div>

                <div className="space-y-4">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 italic block px-2">Sovereign Benefits Enabled</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentTier.perks.map((perk, idx) => (
                      <div key={idx} className="p-5 bg-white/2 border border-white/5 rounded-2.5xl flex gap-4 items-start group hover:border-accent/25 transition-colors">
                        <div className="w-5 h-5 rounded-md bg-accent/10 border border-accent/20 text-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        </div>
                        <span className="text-[10.5px] font-semibold text-white/70 uppercase leading-snug tracking-tight">{perk}</span>
                      </div>
                    ))}
                    
                    {/* Visual Preview Of Locked Tier perks */}
                    {nextTier && nextTier.perks.slice(0, 2).map((perk, idx) => (
                      <div key={`locked_${idx}`} className="p-5 bg-white/[0.01] border border-white/5 opacity-30 rounded-2.5xl flex gap-4 items-start">
                        <div className="w-5 h-5 rounded-md bg-white/5 text-white/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Lock className="w-3 h-3" />
                        </div>
                        <span className="text-[10px] font-bold text-white/30 uppercase leading-snug tracking-tight italic">{perk} (Unlocked at {nextTier.name.split(' ')[0]})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'marketplace' && (
            <motion.div
              key="marketplace"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-3 p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10">
                <AlertTriangle className="w-5 h-5 text-accent mt-0.5" />
                <p className="text-[10px] text-accent font-black uppercase tracking-tight leading-relaxed italic">
                  Redeeming items immediately deducts from your Crowns balance. Voucher codes will be securely minted into your claim vault below.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {REWARD_MARKETPLACE.map((item) => {
                  const locks = currentPoints < item.cost;
                  return (
                    <div 
                      key={item.id} 
                      className={cn(
                        "p-8 rounded-[2.5rem] border relative overflow-hidden flex flex-col justify-between h-56 transition-all",
                        locks 
                          ? "bg-white/[0.01] border-white/5 opacity-60" 
                          : "bg-white/3 border-white/10 hover:border-accent/40 hover:bg-white/5"
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#F27D26] italic">{item.valueString}</span>
                            <h4 className="text-xl font-display font-black text-white italic tracking-tight">{item.title}</h4>
                          </div>
                          <span className="text-xs font-mono font-black text-white/30 whitespace-nowrap bg-white/5 border border-white/15 px-3 py-1 rounded-full uppercase tracking-widest">{item.cost} Crowns</span>
                        </div>
                        <p className="text-[10.5px] text-white/40 uppercase font-black leading-relaxed tracking-tight italic">{item.description}</p>
                      </div>

                      <button
                        onClick={() => handleRedeemReward(item)}
                        disabled={locks || redeemingId !== null}
                        className={cn(
                          "w-full h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2",
                          locks 
                            ? "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed" 
                            : redeemingId === item.id 
                              ? "bg-accent/40 text-black cursor-wait"
                              : "bg-accent text-black hover:bg-white"
                        )}
                      >
                        {redeemingId === item.id ? (
                          <span>Minting Claim...</span>
                        ) : locks ? (
                          <span className="flex items-center gap-2"><Lock className="w-3.5 h-3.5" /> Restricted Balance</span>
                        ) : (
                          <span className="flex items-center gap-2">Redeem & Mint Coupon <ArrowRight className="w-3.5 h-3.5" /></span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === 'claims' && (
            <motion.div
              key="claims"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {claimedRewards.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {claimedRewards.slice(0).reverse().map((claim: any) => (
                    <div 
                      key={claim.id} 
                      className="p-6 bg-black/40 border border-white/5 rounded-3xl relative overflow-hidden flex flex-col justify-between group hover:border-accent/30 transition-all"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-xs font-black uppercase text-white/20 tracking-wider">MINTED REWARD</p>
                          <p className="text-sm font-black text-white uppercase italic tracking-tighter">{claim.title}</p>
                        </div>
                        <span className="text-[9px] font-mono bg-accent/10 border border-accent/20 text-accent px-2.5 py-1 rounded-md uppercase tracking-widest font-black leading-none">{claim.cost} PT</span>
                      </div>

                      <div className="bg-white/3 p-3.5 rounded-xl border border-white/5 flex items-center justify-between font-mono text-xs tracking-wider text-[#F27D26] mb-4">
                        <span className="select-all font-black">{claim.code}</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(claim.code);
                            toast.success('Reward voucher successfully copied!');
                          }}
                          className="px-2 py-1 hover:bg-white/10 text-[8px] font-sans font-black tracking-widest text-white/50 hover:text-white uppercase transition-colors"
                        >
                          Copy
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[8px] font-mono text-white/30 uppercase tracking-widest pt-3 border-t border-white/5">
                        <span>{claim.claimedAt ? new Date(claim.claimedAt).toLocaleDateString() : 'Active'}</span>
                        <span className="text-green-400 font-sans font-black uppercase flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> SECURED
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2.5rem] bg-white/2">
                  <Ticket className="w-12 h-12 text-white/5 mx-auto mb-4" strokeWidth={1} />
                  <p className="text-[11px] font-black uppercase tracking-widest text-white/15 italic">Your claim vault is currently empty.</p>
                  <button 
                    onClick={() => setActiveTab('marketplace')}
                    className="mt-4 px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase text-accent tracking-widest hover:bg-accent hover:text-black transition-all"
                  >
                    View Reward Choices
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
