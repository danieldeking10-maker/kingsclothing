import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, ArrowRight, ShieldCheck, Zap, Fingerprint, ShieldAlert, ChevronRight } from 'lucide-react';
import { 
  signInWithPopup, 
  GoogleAuthProvider,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { auth, db } from '../lib/firebase';
import { cn } from '@/src/lib/utils';

export function AuthPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const referralId = searchParams.get('ref');
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if agent profile exists
      const docRef = doc(db, 'agents', user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // Create new profile
        await setDoc(docRef, {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          role: 'agent',
          referredBy: referralId || null,
          momoNumber: '',
          referralCode: '',
          stats: {
            totalSales: 0,
            commissionEarned: 0,
            designsApproved: 0
          },
          createdAt: serverTimestamp()
        });
        toast.success(`Welcome to the Kingdom, ${user.displayName}!`);
      } else {
        toast.success(`Welcome back, ${user.displayName}!`);
      }
      
      navigate('/agent');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Background Decorative Element */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
         <span className="text-[25vw] md:text-[20vw] font-display font-black uppercase italic tracking-tighter text-white opacity-[0.02] select-none translate-y-20">IDENTITY</span>
      </div>

      <div className="max-w-[1100px] w-full grid grid-cols-1 lg:grid-cols-2 glass rounded-[3rem] overflow-hidden relative shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/5">
        
        {/* Left: Branding & Intent */}
        <div className="hidden lg:flex flex-col justify-between p-16 text-white relative z-10 border-r border-white/5 bg-[#0F0F10]">
           <div className="space-y-12">
              <Link to="/" className="text-xl font-display font-black tracking-tighter uppercase italic group inline-flex items-center space-x-2">
                 <span className="group-hover:text-accent transition-colors underline decoration-accent/20">KNGS</span>
                 <div className="w-1.5 h-1.5 rounded-full bg-accent" />
              </Link>
              
              <div className="space-y-6">
                <h2 className="text-7xl font-display font-black uppercase italic tracking-tighter leading-[0.8] mb-8">
                   Establish <br/>
                   <span className="text-serif font-medium not-italic text-accent">Authority.</span>
                </h2>
                <p className="text-white/30 leading-relaxed font-light font-sans uppercase tracking-[0.2em] text-[10px] max-w-sm">
                   By Entering the Kingdom, you initialize orders, activate commission streams, and deploy design blueprints.
                </p>
              </div>
           </div>
           
           <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                 <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                    <Fingerprint className="w-6 h-6" />
                 </div>
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-white/60 italic leading-tight">Biometric<br/>Verification</h4>
              </div>
              <div className="space-y-4">
                 <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/30">
                    <ShieldAlert className="w-6 h-6" />
                 </div>
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-white/20 italic leading-tight">Secured<br/>By Protocol</h4>
              </div>
           </div>
        </div>

        {/* Right: Identity Injection (Form) */}
        <div className="p-8 md:p-20 bg-background relative z-10 flex flex-col justify-center">
          <div className="space-y-12">
            <div className="space-y-4">
              <span className="text-accent text-[10px] font-black uppercase tracking-editorial block animate-pulse italic">Initialization Sequence</span>
              <h2 className="text-4xl md:text-5xl font-display font-black uppercase tracking-tighter italic leading-none">Authentication</h2>
              <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">Connect your digital identity to proceed.</p>
            </div>

            <div className="space-y-6">
               <button 
                 onClick={handleGoogleSignIn}
                 disabled={isLoading}
                 className="w-full bg-white text-black p-6 rounded-3xl flex items-center justify-center space-x-6 hover:bg-accent transition-all group disabled:opacity-50 active:scale-[0.98] shadow-2xl"
               >
                 <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/component/google.svg" alt="Google" className="w-6 h-6 grayscale group-hover:grayscale-0 transition-all" />
                 <span className="font-black uppercase tracking-editorial text-[11px] font-sans">Verify with Google Identity</span>
               </button>

               <div className="relative pt-4">
                 <div className="absolute inset-0 flex items-center px-2 pt-4">
                    <div className="w-full border-t border-white/5"></div>
                 </div>
                 <div className="relative flex justify-center text-[8px] uppercase font-black tracking-[0.4em]"><span className="bg-background px-6 text-white/10 italic">Encrypted Connection</span></div>
               </div>
            </div>

            <div className="pt-12 space-y-8">
               <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4">
                  <div className="flex items-center space-x-3">
                     <div className="w-2 h-2 rounded-full bg-accent" />
                     <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Order Integration</p>
                  </div>
                  <div className="flex items-center space-x-3">
                     <div className="w-2 h-2 rounded-full bg-white/10" />
                     <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Commission Engine</p>
                  </div>
               </div>

               <p className="text-[9px] text-white/20 uppercase font-black tracking-widest leading-relaxed text-center">
                  Entry into the kingdom implies acceptance of <br/>
                  <Link to="/tos" className="text-white/60 hover:text-accent transition-colors underline decoration-white/10">Terms of Governance</Link> and <Link to="/tos" className="text-white/60 hover:text-accent transition-colors underline decoration-white/10">The Privacy Pact</Link>.
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
