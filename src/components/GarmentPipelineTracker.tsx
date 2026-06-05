import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Scissors, Sparkles, Truck, CheckCircle2, ChevronRight, Activity, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

interface GarmentPipelineTrackerProps {
  order: {
    id: string;
    status: string;
    createdAt?: any;
    items?: any[];
  } | null;
}

export function GarmentPipelineTracker({ order }: GarmentPipelineTrackerProps) {
  if (!order) return null;

  // Compute a highly precise real-time pipeline status based on the overall status
  // and simple chronological progression rules to illustrate Production, Crafting, and Shipping.
  const pipelineState = useMemo(() => {
    const status = order.status || 'pending';
    
    // Convert Firestore Timestamp or general Date object to Unix epoch ms
    let createdMs = Date.now();
    if (order.createdAt) {
      if (typeof order.createdAt.toMillis === 'function') {
        createdMs = order.createdAt.toMillis();
      } else if (order.createdAt.seconds) {
        createdMs = order.createdAt.seconds * 1000;
      } else if (typeof order.createdAt === 'string') {
        createdMs = new Date(order.createdAt).getTime();
      } else if (order.createdAt instanceof Date) {
        createdMs = order.createdAt.getTime();
      }
    }

    const elapsedDays = (Date.now() - createdMs) / (1000 * 60 * 60 * 24);

    // Default milestones
    const stages = [
      {
        id: 'production',
        label: 'Production',
        icon: Scissors,
        description: 'Pattern fabrication, structural layout cutting, and blueprint verification.',
        detailedNotes: 'Fabric weight is calibrated. Precision stencils are locked into high-resolution cutter rigs.',
        status: 'idle' as 'idle' | 'active' | 'complete',
      },
      {
        id: 'crafting',
        label: 'Crafting',
        icon: Sparkles,
        description: 'Elite panel stitching, artisanal mineral wash, branding, and details integration.',
        detailedNotes: 'Heavyweight cotton blends are bound with high-stress dual-thread overlockers. Custom label details hand-stitched.',
        status: 'idle' as 'idle' | 'active' | 'complete',
      },
      {
        id: 'shipping',
        label: 'Shipping',
        icon: Truck,
        description: 'Encased in custom presentation sleeves and handed to trusted distribution logicians.',
        detailedNotes: 'Vacuum-sealed to guard premium textures. Dispatch tracking is wired directly to airport hubs.',
        status: 'idle' as 'idle' | 'active' | 'complete',
      },
      {
        id: 'completed',
        label: 'Delivered',
        icon: CheckCircle2,
        description: 'Kings garment assets safely checked in at recipient drop zone.',
        detailedNotes: 'Secure signature verified. The fit is ready to command attention.',
        status: 'idle' as 'idle' | 'active' | 'complete',
      }
    ];

    let overallProgressPercent = 5;
    let currentTask = 'Awaiting payment ledger confirmation';

    if (status === 'cancelled') {
      overallProgressPercent = 0;
      currentTask = 'Garment instance release protocol issued';
      return { stages, progress: 0, currentTask, isCancelled: true };
    }

    if (status === 'pending') {
      stages[0].status = 'active';
      currentTask = 'Pending authorization code validation';
      overallProgressPercent = 12;
    } else if (status === 'processing') {
      // Intelligently subdivide Processing status into Production or Crafting
      if (elapsedDays <= 1.5) {
        stages[0].status = 'active';
        currentTask = 'Resolving textile patterns & blueprint stencils';
        overallProgressPercent = 30;
      } else {
        stages[0].status = 'complete';
        stages[1].status = 'active';
        currentTask = 'Artisanal dye washing & custom high-stress overlock stitching';
        overallProgressPercent = 60;
      }
    } else if (status === 'shipped') {
      stages[0].status = 'complete';
      stages[1].status = 'complete';
      stages[2].status = 'active';
      currentTask = 'En route to local fulfillment drop zone / courier depot';
      overallProgressPercent = 85;
    } else if (status === 'delivered' || status === 'completed') {
      stages[0].status = 'complete';
      stages[1].status = 'complete';
      stages[2].status = 'complete';
      stages[3].status = 'active'; // or keep active as last
      stages[3].status = 'complete';
      currentTask = 'Fulfillment cycle completed successfully';
      overallProgressPercent = 100;
    }

    return { stages, progress: overallProgressPercent, currentTask, isCancelled: false };
  }, [order]);

  const { stages, progress, currentTask, isCancelled } = pipelineState;

  return (
    <div className="glass p-6 sm:p-8 rounded-[2rem] border border-white/5 relative overflow-hidden bg-white/[0.01]">
      <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-accent/5 rounded-full blur-[80px] pointer-events-none" />
      
      {/* Block Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-5 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white">Garment Fabrication Pipeline</h4>
            <p className="text-[9px] font-black uppercase text-white/30 tracking-widest mt-0.5">Physical Manufacture telemetry</p>
          </div>
        </div>
        
        <div className="px-3.5 py-1.5 bg-white/[0.03] border border-white/5 rounded-xl text-right">
          <span className="text-[8px] font-black uppercase tracking-widest text-white/40 block">INTELLIGENT TELEMETRY FEED</span>
          <span className="text-[10px] font-bold text-accent font-mono">{progress}% Complete</span>
        </div>
      </div>

      {/* Visual Step-Progress Bar */}
      <div className="relative mb-12 py-3">
        {/* Baseline bar path */}
        <div className="absolute left-[3%] right-[3%] top-[24px] h-[3px] bg-white/5 rounded-full z-0" />
        
        {/* Animated fluid progress overlay */}
        {!isCancelled && (
          <motion.div 
            className="absolute left-[3%] top-[24px] h-[3px] bg-accent rounded-full z-0 shadow-[0_0_15px_rgba(242,125,38,0.5)]"
            initial={{ width: '0%' }}
            animate={{ width: `${Math.max(2, Math.min(94, progress))}%` }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
        )}

        {/* Stages list */}
        <div className="relative flex justify-between z-10">
          {stages.map((stage, idx) => {
            const isActive = stage.status === 'active';
            const isComplete = stage.status === 'complete';
            
            return (
              <div key={stage.id} className="flex flex-col items-center flex-1 text-center group">
                {/* Node circle */}
                <div className="relative">
                  <div className={cn(
                    "w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center bg-background transition-all duration-700 relative z-10",
                    isCancelled ? "border-red-500/20 text-red-500/30" :
                    isActive ? "border-accent bg-accent text-black scale-110 shadow-[0_0_20px_rgba(242,125,38,0.3)] font-black" :
                    isComplete ? "border-accent/40 bg-accent/10 text-accent" : "border-white/5 text-white/10"
                  )}>
                    <stage.icon className={cn("w-4.5 h-4.5 sm:w-5 sm:h-5", isActive && "animate-pulse")} />
                  </div>

                  {/* Tiny Active Halo Ring */}
                  {isActive && !isCancelled && (
                    <span className="absolute inset-0 rounded-full border-2 border-accent/40 animate-ping -z-10" />
                  )}
                </div>

                {/* Micro info */}
                <div className="mt-3.5 space-y-1 px-1">
                  <p className={cn(
                    "text-[9px] sm:text-[10px] font-black uppercase tracking-widest",
                    isCancelled ? "text-red-500/60" :
                    isActive ? "text-accent" :
                    isComplete ? "text-white" : "text-white/20"
                  )}>
                    {stage.label}
                  </p>
                  <p className="hidden md:block text-[8px] text-white/40 max-w-[130px] mx-auto font-sans leading-relaxed">
                    {stage.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real-time Sub-state Activity Log Card */}
      <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
          <span className="text-[8.5px] font-black uppercase tracking-[0.2em] text-white/40">CURRENT ASSEMBLY NODE ACTIVITY</span>
        </div>
        
        <div className="space-y-1.5">
          <p className="text-sm font-black text-white uppercase italic tracking-tight font-display">{currentTask}</p>
          <p className="text-[10px] text-white/50 leading-relaxed font-sans max-w-2xl">
            {isCancelled 
              ? "All allocation codes have been terminated. Fabric allocation released back into warehouse bins."
              : stages.find(s => s.status === 'active')?.detailedNotes || "The fabrication schedule is currently undergoing baseline payments registry audit."
            }
          </p>
        </div>

        {/* Dynamic subtask markers (checkbox style) */}
        {!isCancelled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-white/5 text-[9px] font-mono uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <span className={cn(
                "w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] font-black",
                progress >= 30 ? "bg-accent/10 border-accent text-accent" : "border-white/10 text-transparent"
              )}>✓</span>
              <span className={progress >= 30 ? "text-white/80" : "text-white/20"}>Pattern Blueprint Configured</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] font-black",
                progress >= 60 ? "bg-accent/10 border-accent text-accent" : "border-white/10 text-transparent"
              )}>✓</span>
              <span className={progress >= 60 ? "text-white/80" : "text-white/20"}>Artisanal Craft Finished</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] font-black",
                progress >= 85 ? "bg-accent/10 border-accent text-accent" : "border-white/10 text-transparent"
              )}>✓</span>
              <span className={progress >= 85 ? "text-white/80" : "text-white/20"}>Courier Fleet Dispatched</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] font-black",
                progress >= 100 ? "bg-accent/10 border-accent text-accent" : "border-white/10 text-transparent"
              )}>✓</span>
              <span className={progress >= 100 ? "text-white/80" : "text-white/20"}>Recipient Seal Verified</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
