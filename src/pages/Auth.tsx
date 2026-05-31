import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, ArrowRight, ShieldCheck, Zap, Fingerprint, ShieldAlert, ChevronRight, AlertCircle, Crown, Eye, EyeOff, Loader2, Sparkles, Binary } from 'lucide-react';
import { 
  signInWithPopup, 
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { auth, db } from '../lib/firebase';
import { cn } from '@/src/lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchMode = searchParams.get('mode') || 'signin';
  const redirectPath = searchParams.get('redirect') || '/agent';
  const referralId = searchParams.get('ref');
  
  const [isSignUp, setIsSignUp] = useState(searchMode === 'signup');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIframeWarning, setShowIframeWarning] = useState(false);

  const getPasswordStrength = () => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    return strength;
  };

  // Sync state with URL if it changes
  useEffect(() => {
    setIsSignUp(searchMode === 'signup');
  }, [searchMode]);

  const toggleMode = () => {
    const newMode = isSignUp ? 'signin' : 'signup';
    setIsSignUp(!isSignUp);
    // Persist search params while toggling
    const newParams = new URLSearchParams(searchParams);
    newParams.set('mode', newMode);
    setSearchParams(newParams);
  };

  const createProfile = async (user: any) => {
    const docRef = doc(db, 'agents', user.uid);
    try {
      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(docRef);

        if (!docSnap.exists()) {
          transaction.set(docRef, {
            uid: user.uid,
            name: user.displayName || name || 'Citizen ' + user.uid.slice(0, 4),
            email: user.email,
            role: 'agent',
            referredBy: referralId || sessionStorage.getItem('last_referral_id') || null,
            referralCode: '',
            momoNumber: '',
            stats: {
              totalSales: 0,
              commissionEarned: 0,
              designsApproved: 0
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      });
      return true;
    } catch (err) {
      console.error('Transaction failed: ', err);
      handleFirestoreError(err, OperationType.WRITE, `agents/${user.uid}`);
      return false;
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isSignUp && !name)) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: name });
        await createProfile(result.user);
        toast.success(`Welcome to the Kingdom, ${name}!`);
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        // Robustness: check/create profile on sign in too
        await createProfile(result.user);
        toast.success(`Welcome back, ${result.user.displayName || 'Warrior'}!`);
      }
      
      // Delay navigation slightly to allow background tasks to settle
      setTimeout(() => navigate(redirectPath), 500);
    } catch (error: any) {
      console.error('Auth Error:', error);
      let msg = 'Authentication failed';
      
      if (error.code === 'auth/user-not-found') msg = 'No account found with this email';
      else if (error.code === 'auth/wrong-password') msg = 'Incorrect password';
      else if (error.code === 'auth/email-already-in-use') msg = 'This email is already registered';
      else if (error.code === 'auth/weak-password') msg = 'Password should be at least 6 characters';
      else if (error.code === 'auth/invalid-credential') msg = 'Invalid access credentials';
      else if (error.message) msg = error.message;

      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Please enter your email address first');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset link deployed to your email');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset link');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
    try {
      const result = await signInWithPopup(auth, provider);
      await createProfile(result.user);
      toast.success(`Welcome back, ${result.user.displayName || 'Warrior'}!`);
      
      setTimeout(() => navigate(redirectPath), 500);
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      
      let msg = 'Google Sign-In failed';
      if (error.code === 'auth/popup-blocked') {
        msg = 'Popup blocked by browser';
      } else if (isInIframe || error.code === 'auth/internal-error' || error.code === 'auth/network-request-failed' || error.code === 'auth/web-storage-unsupported') {
        setShowIframeWarning(true);
        msg = 'Sign-In handshakes restricted in iframe sandboxes';
      } else if (error.message) {
        msg = error.message;
      }
      
      setError(msg);
      toast.error(msg);
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
              <span className="text-accent text-[10px] font-black uppercase tracking-editorial block animate-pulse italic">
                {isSignUp ? 'Registration Sequence' : 'Initialization Sequence'}
              </span>
              <h2 className="text-4xl md:text-5xl font-display font-black uppercase tracking-tighter italic leading-none">
                {isSignUp ? 'New Citizen' : 'Authentication'}
              </h2>
              <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">
                {isSignUp ? 'Establish your digital footprint in the Kingdom.' : 'Connect your digital identity to proceed.'}
              </p>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-6">
              <AnimatePresence mode="wait">
                {referralId && isSignUp && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-accent/10 border border-accent/20 rounded-2xl flex items-center gap-3 text-accent mb-6"
                  >
                    <Crown className="w-4 h-4 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Referral Link Validated</p>
                      <p className="text-[8px] font-medium uppercase tracking-tighter opacity-60">You are entering via invitation</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {isLoading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 bg-background/80 backdrop-blur-xl flex flex-col items-center justify-center space-y-6"
                  >
                    <div className="relative">
                      <div className="w-24 h-24 border-2 border-accent/20 rounded-full animate-ping" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-10 h-10 text-accent animate-spin" />
                      </div>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute -bottom-10 left-0 h-1 bg-accent rounded-full"
                      />
                    </div>
                    <div className="text-center space-y-2">
                       <p className="text-[10px] font-black uppercase tracking-[0.5em] text-accent animate-pulse italic">
                        {isSignUp ? 'Constructing Identity...' : 'Synchronizing Authority...'}
                       </p>
                       <div className="flex items-center justify-center gap-2 text-white/20 text-[8px] font-mono">
                          <Binary className="w-3 h-3" />
                          <span>ENCRYPTING_PACKETS_V4</span>
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div 
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: { 
                    opacity: 1,
                    transition: { staggerChildren: 0.1 }
                  }
                }}
                className="space-y-6"
              >
                {isSignUp && (
                  <motion.div 
                    variants={{
                      hidden: { opacity: 0, x: -20 },
                      visible: { opacity: 1, x: 0 }
                    }}
                    className="space-y-2"
                  >
                    <div className="relative group">
                      <User className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-accent transition-colors" />
                      <input 
                        type="text" 
                        placeholder="FULL NAME"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-[1.5rem] py-5 pl-14 pr-6 text-[11px] font-black uppercase tracking-widest outline-none focus:border-accent/40 focus:bg-white/[0.05] transition-all font-sans placeholder:text-white/10"
                      />
                    </div>
                  </motion.div>
                )}
                
                <motion.div 
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 }
                  }}
                  className="space-y-2"
                >
                  <div className="relative group">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-accent transition-colors" />
                    <input 
                      type="email" 
                      placeholder="EMAIL ADDRESS"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-[1.5rem] py-5 pl-14 pr-6 text-[11px] font-black uppercase tracking-widest outline-none focus:border-accent/40 focus:bg-white/[0.05] transition-all font-sans placeholder:text-white/10"
                    />
                  </div>
                </motion.div>

                <motion.div 
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 }
                  }}
                  className="space-y-2"
                >
                  <div className="relative group">
                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-accent transition-colors" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="ACCESS KEY"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-[1.5rem] py-5 pl-14 pr-14 text-[11px] font-black uppercase tracking-widest outline-none focus:border-accent/40 focus:bg-white/[0.05] transition-all font-sans placeholder:text-white/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 hover:text-accent transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {isSignUp && password.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-2 mt-2 px-4"
                    >
                      <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-white/20 mb-1">
                        <span>Entropy Grade</span>
                        <span className={cn(
                          getPasswordStrength() <= 25 ? "text-red-500" :
                          getPasswordStrength() <= 50 ? "text-orange-500" :
                          getPasswordStrength() <= 75 ? "text-yellow-500" :
                          "text-green-500"
                        )}>
                          {getPasswordStrength() <= 25 ? 'CRITICAL' : 
                           getPasswordStrength() <= 50 ? 'WEAK' : 
                           getPasswordStrength() <= 75 ? 'STABLE' : 'UNBREAKABLE'}
                        </span>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          className={cn(
                            "h-full transition-all duration-500",
                            getPasswordStrength() <= 25 ? "bg-red-500" :
                            getPasswordStrength() <= 50 ? "bg-orange-500" :
                            getPasswordStrength() <= 75 ? "bg-yellow-500" :
                            "bg-green-500"
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${getPasswordStrength()}%` }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {!isSignUp && (
                    <button 
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-accent transition-colors ml-4"
                    >
                      Restore Access Credentials
                    </button>
                  )}
                </motion.div>

                <motion.button 
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-accent text-black p-6 rounded-[1.5rem] font-black uppercase tracking-editorial text-[11px] flex items-center justify-center space-x-4 hover:shadow-[0_20px_50px_rgba(234,179,8,0.2)] transition-all disabled:opacity-50 overflow-hidden relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                  <span>{isSignUp ? 'Initialize Citizenship' : 'Deploy Identity'}</span>
                </motion.button>

                <motion.div 
                  variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1 }
                  }}
                  className="relative pt-4"
                >
                  <div className="absolute inset-0 flex items-center px-2 pt-4">
                    <div className="w-full border-t border-white/5"></div>
                  </div>
                  <div className="relative flex justify-center text-[9px] uppercase font-black tracking-[0.4em]">
                    <span className="bg-background px-6 text-white/10 italic">OR USE EXTERNAL AUTH</span>
                  </div>
                </motion.div>

                <motion.button 
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full bg-white/[0.03] text-white/60 p-6 rounded-[1.5rem] flex items-center justify-center space-x-6 hover:bg-white hover:text-black transition-all group disabled:opacity-50 border border-white/10"
                >
                  <div className="flex items-center gap-4">
                    <img src="https://authjs.dev/img/providers/google.svg" alt="Google" className="w-5 h-5 grayscale group-hover:grayscale-0 transition-all" />
                    <span className="font-black uppercase tracking-editorial text-[11px]">Authenticate with Google</span>
                  </div>
                  <Sparkles className="w-4 h-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.button>

                {typeof window !== 'undefined' && window.self !== window.top && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-accent/[0.03] border border-accent/20 rounded-[1.5rem] space-y-2 mt-4"
                  >
                    <div className="flex items-center gap-2 text-accent">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[9px] font-black uppercase tracking-widest italic">Iframe Preview Mode Active</span>
                    </div>
                    <p className="text-[8.5px] text-white/30 uppercase font-black tracking-widest leading-relaxed">
                      Modern browsers block Google credentials inside embedded previews. For instant auth, complete sign-in in a new tab.
                    </p>
                    <button
                      type="button"
                      onClick={() => window.open(window.location.href, '_blank')}
                      className="text-[9.5px] font-black uppercase tracking-[0.15em] text-accent hover:underline flex items-center gap-1 cursor-pointer mt-1"
                    >
                      Open App in New Tab <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                )}
              </motion.div>
            </form>

            <div className="pt-6 text-center">
              <button 
                 onClick={toggleMode}
                 className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
              >
                 {isSignUp ? 'Already a Citizen? Return to Authentication' : 'New to the Kingdom? Request Citizenship'}
              </button>
            </div>

            <div className="pt-8 space-y-4">
               <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/20">Protocol Status</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-accent flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3" /> Encrypted
                  </p>
               </div>

               <p className="text-[9px] text-white/20 uppercase font-black tracking-widest leading-relaxed text-center">
                  Entry into the kingdom implies acceptance of <br/>
                  <Link to="/tos" className="text-white/60 hover:text-accent transition-colors underline decoration-white/10">Terms of Governance</Link> and <Link to="/tos" className="text-white/60 hover:text-accent transition-colors underline decoration-white/10">The Privacy Pact</Link>.
               </p>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showIframeWarning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="max-w-md w-full glass border border-accent/30 rounded-[2.5rem] p-10 space-y-8 text-center shadow-[0_0_80px_rgba(234,179,8,0.15)] bg-[#0F0F10]"
            >
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto text-accent mb-4 animate-pulse">
                <ShieldAlert className="w-8 h-8" />
              </div>
              
              <div className="space-y-3">
                <span className="text-accent text-[10px] font-black uppercase tracking-editorial block italic font-sans">
                  Iframe Security Protocol
                </span>
                <h3 className="text-2xl font-display font-black uppercase tracking-tighter italic leading-none text-white">
                  Google Sign-In Blocked
                </h3>
               <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">
                  Authentication handshakes are restricted in embedded preview frames.
               </p>
              </div>

              <div className="space-y-4 p-6 bg-white/[0.02] border border-white/5 rounded-2xl text-left">
                <p className="text-[10px] text-white/60 uppercase font-black tracking-widest leading-relaxed">
                  Your browser's privacy controls (Storage Partitioning) prevent Google OAuth from storing session keys inside the iframe context.
                </p>
                <div className="flex items-start gap-3 text-accent text-[9px] uppercase font-black tracking-widest leading-normal">
                  <Zap className="w-3.5 h-3.5 shrink-0 animate-pulse mt-0.5" />
                  <span>The fix is automatic: open the application in a new dedicated tab, authenticate, and then you can continue there or return here!</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setShowIframeWarning(false)}
                  className="bg-white/5 text-white/60 p-4.5 rounded-2xl font-black uppercase tracking-widest text-[9.5px] hover:bg-white/10 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowIframeWarning(false);
                    window.open(window.location.href, '_blank');
                  }}
                  className="bg-accent text-black p-4.5 rounded-2xl font-black uppercase tracking-widest text-[9.5px] flex items-center justify-center gap-2 hover:shadow-[0_15px_30px_rgba(234,179,8,0.2)] transition-all"
                >
                  Open in New Tab <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
