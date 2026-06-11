import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  ChevronRight, 
  Info, 
  Calendar, 
  Truck, 
  Scissors, 
  CreditCard,
  PackageOpen,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';

interface OrderTimelineProps {
  order: {
    id: string;
    status: string;
    depositAmount?: number;
    totalAmount?: number;
    createdAt?: any;
    items?: any[];
  } | null;
}

export function OrderTimeline({ order }: OrderTimelineProps) {
  const [selectedStage, setSelectedStage] = useState<number>(0);

  if (!order) return null;

  const isCancelled = order.status === 'cancelled';

  // Compute timing
  const formattedDate = useMemo(() => {
    if (!order.createdAt) return 'Date Pending';
    let d: Date;
    if (typeof order.createdAt.toDate === 'function') {
      d = order.createdAt.toDate();
    } else if (order.createdAt.seconds) {
      d = new Date(order.createdAt.seconds * 1000);
    } else {
      d = new Date(order.createdAt);
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [order.createdAt]);

  // Determine stage states
  const stages = useMemo(() => {
    const s = order.status || 'pending';
    
    // Deposit Paid Stage:
    // It's active if status is "pending". It's complete if status is any subsequent step.
    const depositPaidStatus: 'idle' | 'active' | 'complete' = 
      isCancelled ? 'idle' : 
      s === 'pending' ? 'active' : 'complete';

    // Craftsmanship Phase:
    // It's active if status is "processing". It's complete if "shipped" or "delivered"/"completed".
    const craftsmanshipStatus: 'idle' | 'active' | 'complete' = 
      isCancelled ? 'idle' : 
      s === 'processing' ? 'active' : 
      (s === 'shipped' || s === 'delivered' || s === 'completed') ? 'complete' : 'idle';

    // Delivered Stage:
    // It's active if "shipped" (in transit). It's complete if "delivered" or "completed".
    const deliveredStatus: 'idle' | 'active' | 'complete' = 
      isCancelled ? 'idle' : 
      s === 'shipped' ? 'active' : 
      (s === 'delivered' || s === 'completed') ? 'complete' : 'idle';

    return [
      {
        index: 0,
        id: 'deposit',
        label: 'Deposit Paid',
        subtitle: 'Authorization Resolved',
        icon: CreditCard,
        status: depositPaidStatus,
        shortDesc: 'Payment ledger checked and production ticket authorized.',
        bulletPoints: [
          '50% minimum deposit cleared through securing gateway',
          'Garment sizing and measurement specifications locked',
          'Textile roll checked out from secondary brand registry'
        ],
        badge: 'Secure Protocol',
        eta: 'Completed same-day'
      },
      {
        index: 1,
        id: 'craftsmanship',
        label: 'Craftsmanship Phase',
        subtitle: 'Production & Stitching',
        icon: Scissors,
        status: craftsmanshipStatus,
        shortDesc: 'Garment is precision-cut and assembled by master tailors.',
        bulletPoints: [
          'Custom patterns generated and hand-sketched onto fabric',
          'Dual-thread heavy-duty stitching on load-bearing panels',
          'Premium branding labels and custom hardware integrated',
          'Artisanal dye washing to set color density'
        ],
        badge: 'In-House Bureau',
        eta: '3 - 7 Business Days'
      },
      {
        index: 2,
        id: 'delivered',
        label: 'Delivered',
        subtitle: 'Fulfillment Completed',
        icon: PackageOpen,
        status: deliveredStatus,
        shortDesc: 'Enclosed in protective garment wrap and hand-dispatched.',
        bulletPoints: [
          'Double-grade quality control scan passed',
          'Delivered directly to local courier depot or client',
          'Drop-off signature and verification ledger archived'
        ],
        badge: 'Logistics Shield',
        eta: '1 - 2 Days Transit'
      }
    ];
  }, [order.status, isCancelled]);

  // Set the default selected stage to the current active one
  React.useEffect(() => {
    const activeIdx = stages.findIndex(s => s.status === 'active');
    if (activeIdx !== -1) {
      setSelectedStage(activeIdx);
    } else {
      // If all are completed, focus the last stage
      const allCompleted = stages.every(s => s.status === 'complete');
      if (allCompleted) {
        setSelectedStage(2);
      } else {
        setSelectedStage(0);
      }
    }
  }, [stages]);

  const progressPercentage = useMemo(() => {
    if (isCancelled) return 0;
    const completedCount = stages.filter(s => s.status === 'complete').length;
    const activeCount = stages.filter(s => s.status === 'active').length;
    
    // Each transition is 50%:
    // 0 complete -> 0% (if active is 1st, let's say 15% progress)
    // 1 complete (deposit paid done) -> 50%
    // 2 complete (craftsmanship done) -> 100%
    if (completedCount === 0) return 15;
    if (completedCount === 1) return activeCount > 0 ? 65 : 50;
    if (completedCount === 2) return activeCount > 0 ? 88 : 100;
    return 100;
  }, [stages, isCancelled]);

  return (
    <div className="glass p-8 md:p-10 rounded-[2.5rem] border border-white/5 relative bg-white/[0.01]/[0.02] shadow-[0_4px_30px_rgba(0,0,0,0.4)] overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Header section with metadata */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
            <span className="text-[9px] font-mono font-black uppercase tracking-[0.25em] text-white/50">
              Garment Production Ledger
            </span>
          </div>
          <h4 className="text-xl md:text-2xl font-display font-black uppercase italic tracking-tighter text-white">
            Order Timeline<span className="text-accent">.</span>
          </h4>
        </div>
        
        <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
          <Calendar className="w-4 h-4 text-accent" />
          <div className="text-left">
            <p className="text-[8px] font-black uppercase text-white/40 tracking-wider">Lodgement Date</p>
            <p className="text-[10px] font-mono font-bold text-white">{formattedDate}</p>
          </div>
        </div>
      </div>

      {/* Main Process Progress Bar & Node Grid */}
      <div className="relative my-8 px-4">
        {/* Progress Bar background road */}
        <div className="absolute left-[8%] right-[8%] top-[24px] h-[4px] bg-white/5 rounded-full z-0" />
        
        {/* Flow Fill Progress Bar */}
        {!isCancelled && (
          <motion.div 
            className="absolute left-[8%] top-[24px] h-[4px] bg-accent rounded-full z-0 shadow-[0_0_20px_rgba(242,125,38,0.7)]"
            initial={{ width: '0%' }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          />
        )}

        {/* Dynamic Nodes */}
        <div className="relative flex justify-between z-10">
          {stages.map((stage, idx) => {
            const isActive = stage.status === 'active';
            const isComplete = stage.status === 'complete';
            const isFocused = selectedStage === idx;
            const StageIcon = stage.icon;

            return (
              <button 
                key={stage.id}
                onClick={() => setSelectedStage(idx)}
                className="flex flex-col items-center flex-1 focus:outline-none group relative"
              >
                {/* Node Ring/Bubble */}
                <div className="relative">
                  <div className={cn(
                    "w-12 h-12 rounded-full border-2 bg-background flex items-center justify-center transition-all duration-500",
                    isCancelled ? "border-red-500/20 text-red-500/30" :
                    isActive ? "border-accent bg-accent text-black scale-110 shadow-[0_0_25px_rgba(242,125,38,0.4)]" :
                    isComplete ? "border-accent/50 bg-accent/10 text-accent hover:border-accent" : 
                    "border-white/5 text-white/20 hover:border-white/20"
                  )}>
                    <StageIcon className={cn("w-5 h-5", isActive && "animate-pulse")} />
                  </div>

                  {/* Active Highlight Marker underneath */}
                  <AnimatePresence>
                    {isFocused && (
                      <motion.div 
                        layoutId="activeIndicator"
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-[3px] bg-accent rounded-full"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </AnimatePresence>
                  
                  {/* Ping Animation for Active Node */}
                  {isActive && !isCancelled && (
                    <span className="absolute inset-0 rounded-full border-2 border-accent/30 animate-ping -z-10" />
                  )}
                </div>

                {/* Micro Meta Status Title on Nodes */}
                <div className="mt-4 text-center">
                  <p className={cn(
                    "text-[10px] font-black uppercase tracking-wider transition-colors",
                    isCancelled ? "text-red-500/50" :
                    isActive ? "text-accent font-black" :
                    isComplete ? "text-white" : "text-white/20",
                    isFocused && "underline decoration-accent underline-offset-4"
                  )}>
                    {stage.label}
                  </p>
                  <p className="text-[8px] font-mono font-bold uppercase tracking-widest text-white/35 mt-0.5">
                    {stage.status === 'complete' ? 'COMPLETED' : stage.status === 'active' ? 'IN PROGRESS' : 'ARRIVING'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Showcase area for the currently selected stage node */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedStage}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          className="mt-8 p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-6"
        >
          {/* Header of details panel */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono font-bold text-accent">0{selectedStage + 1}.</span>
              <div>
                <h5 className="text-base font-display font-black uppercase italic text-white tracking-tight">
                  {stages[selectedStage].label}
                </h5>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/30">
                  {stages[selectedStage].subtitle}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <span className="px-2.5 py-1 text-[8px] font-black uppercase tracking-widest rounded bg-accent/10 border border-accent/20 text-accent">
                {stages[selectedStage].badge}
              </span>
              <span className="px-2.5 py-1 text-[8px] font-black uppercase tracking-widest rounded bg-white/5 border border-white/5 text-white/60">
                ETA: {stages[selectedStage].eta}
              </span>
            </div>
          </div>

          <p className="text-xs text-white/60 leading-relaxed font-sans font-medium">
            {stages[selectedStage].shortDesc}
          </p>

          {/* Bullet Points with Checkboxes */}
          <div className="space-y-3.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Logistics Milestones:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stages[selectedStage].bulletPoints.map((point, index) => {
                const isBulletComplete = stages[selectedStage].status === 'complete' || 
                  (stages[selectedStage].status === 'active' && index < 2); // Simulating partial completion for active stage

                return (
                  <div 
                    key={index} 
                    className={cn(
                      "flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-300",
                      isBulletComplete 
                        ? "bg-accent/[0.02] border-accent/20" 
                        : "bg-white/[0.005] border-white/5"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5",
                      isBulletComplete 
                        ? "border-accent bg-accent/15 text-accent shadow-[0_0_8px_rgba(242,125,38,0.2)]" 
                        : "border-white/10 text-transparent"
                    )}>
                      ✓
                    </div>
                    <span className={cn(
                      "text-[10px] font-mono uppercase tracking-wide leading-relaxed",
                      isBulletComplete ? "text-white" : "text-white/30"
                    )}>
                      {point}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Terminal Footer status string */}
      {isCancelled ? (
        <div className="mt-6 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-center flex items-center justify-center gap-2">
          <Info className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-[9px] font-black uppercase tracking-widest text-red-500">
            TRANSACTION CANCELLED • DESIGN BLUEPRINTS RELEASED
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.005]">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-accent animate-spin" style={{ animationDuration: '3s' }} />
            <p className="text-[9px] font-mono uppercase tracking-widest text-white/40">
              Live Assembly Status: <span className="text-white font-bold">
                {order.status === 'pending' ? 'Locked & Awaiting Dispatch' : 
                 order.status === 'processing' ? 'On-loom tailoring execution' : 'Courier Fleet Assigned'}
              </span>
            </p>
          </div>
          <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest">
            Protocol active • Node verified
          </div>
        </div>
      )}
    </div>
  );
}
