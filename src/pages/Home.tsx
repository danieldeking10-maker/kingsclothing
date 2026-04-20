import { motion } from 'motion/react';
import { ArrowRight, Star, ShieldCheck, Zap, ChevronRight, Verified } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatGHC } from '@/src/lib/utils';
import { MOMO_NUMBER } from '@/src/constants';

const MOCK_TRENDING = [
  {
    id: '1',
    name: "The Midnight Royal",
    price: 180,
    category: "Acid Wash Tee",
    gsm: "260 GSM",
    image: "https://picsum.photos/seed/hoodie1/800/1000",
    tag: "NEW"
  },
  {
    id: '3',
    name: "Accra Hustle",
    price: 150,
    category: "Heavyweight",
    gsm: "320 GSM",
    image: "https://picsum.photos/seed/hoodie3/800/1000",
  }
];

export function HomePage() {
  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Pane: Branding & Hero */}
        <section className="w-full lg:w-1/2 lg:border-r border-white/10 p-8 md:p-16 flex flex-col justify-between relative overflow-hidden bg-background">
          {/* Decorative Background Text */}
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none select-none">
            <span className="text-[140px] md:text-[220px] font-display font-black leading-none uppercase italic tracking-tighter">KNGS</span>
          </div>
          
          <div className="relative z-10 space-y-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <span className="text-xs uppercase tracking-editorial text-accent font-black block">Premium Streetwear</span>
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-display leading-[0.85] font-light italic">
                Armor for <br />
                <span className="text-serif text-5xl md:text-7xl lg:text-8xl font-medium not-italic">the Ambitious.</span>
              </h1>
            </motion.div>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-white/40 text-sm md:text-base max-w-sm leading-relaxed font-light uppercase tracking-tight"
            >
              Locally crafted in the heart of Ghana. Whether it’s 320 GSM heavyweight cotton or our signature Acid Wash, we build for those who refuse to settle.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 pt-4"
            >
              <Link to="/shop" className="bg-white text-black px-10 py-5 rounded-full font-black uppercase tracking-widest text-[10px] hover:bg-accent transition-all text-center">
                Enter Shop
              </Link>
              <Link to="/agent" className="bg-white/5 border border-white/10 text-white px-10 py-5 rounded-full font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all text-center">
                Join Kingdom
              </Link>
            </motion.div>
          </div>

          {/* Payment Policy Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-16 lg:mt-0 glass p-8 rounded-3xl max-w-xs relative overflow-hidden group hover:border-accent/40 transition-all"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <ShieldCheck className="w-12 h-12" />
            </div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-black uppercase tracking-editorial text-white/60">Policy Invariant</h3>
              <div className="flex items-center space-x-1 px-2 py-1 rounded bg-accent/10 border border-accent/20">
                 <Verified className="w-3 h-3 text-accent" />
                 <span className="text-[8px] text-accent font-black uppercase">Verified</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-tight">
                <span className="text-white/30 italic">Initial Deposit</span>
                <span>50% Now</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-tight">
                <span className="text-white/30 italic">Completion</span>
                <span>50% on Delivery</span>
              </div>
              <div className="h-px bg-white/5 w-full"></div>
              <div className="text-[10px] text-accent font-black uppercase tracking-widest">
                MOMO: {MOMO_NUMBER}
              </div>
            </div>
          </motion.div>
        </section>

        {/* Right Pane: Trends Catalog */}
        <section className="w-full lg:w-1/2 bg-[#0F0F10] p-8 md:p-16 flex flex-col">
          <div className="flex justify-between items-center mb-12">
            <div>
               <h2 className="text-sm font-black uppercase tracking-editorial mb-1">Trending Designs</h2>
               <p className="text-[10px] text-white/20 font-black italic tracking-tighter uppercase">Curated Authority Selection</p>
            </div>
            <div className="flex space-x-2">
              <button className="px-5 py-2 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Mockup</button>
              <button className="px-5 py-2 text-white/20 text-[9px] font-black uppercase tracking-widest hover:text-white transition-all">Studio</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 flex-1">
            {MOCK_TRENDING.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="group cursor-pointer"
              >
                <div className="aspect-[4/5] bg-[#1A1A1B] mb-6 relative overflow-hidden rounded-2xl grayscale hover:grayscale-0 transition-all duration-700">
                   <img 
                     src={item.image} 
                     alt={item.name} 
                     className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                     referrerPolicy="no-referrer"
                   />
                   {item.tag && (
                     <div className="absolute bottom-4 left-4 bg-accent text-[8px] px-3 py-1 font-black uppercase text-black tracking-widest">
                       {item.tag}
                     </div>
                   )}
                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                      <Link to={`/product/${item.id}`} className="w-full bg-white text-black py-4 rounded-full text-[10px] font-black uppercase tracking-widest text-center">
                        View Blueprint
                      </Link>
                   </div>
                </div>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className="text-sm font-display font-black uppercase italic tracking-tight group-hover:text-accent transition-colors">{item.name}</h4>
                    <p className="text-[9px] text-white/30 uppercase font-black tracking-widest">{item.category} • {item.gsm}</p>
                  </div>
                  <span className="text-xs font-mono font-black text-accent">{formatGHC(item.price)}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Agent CTA Area */}
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="mt-16 pt-12 border-t border-white/5"
          >
            <div className="flex items-center space-x-6 bg-gradient-to-r from-accent/10 to-transparent p-8 rounded-3xl border border-white/5 relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-accent/5 rounded-full blur-3xl" />
              <div className="h-14 w-14 rounded-full bg-accent flex items-center justify-center font-black text-black text-xl shadow-lg shadow-accent/20">K</div>
              <div className="flex-1">
                <h4 className="text-xs font-black uppercase tracking-editorial mb-1 italic">Join the Kingdom</h4>
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-tight">Earn 10% commission + 10% profit on designs.</p>
              </div>
              <Link to="/agent" className="bg-white text-black px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-all">
                Apply
              </Link>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Floating Action (Bottom) */}
      <div className="lg:hidden p-4 bg-background border-t border-white/10">
         <Link to="/shop" className="w-full bg-accent text-black py-5 rounded-full text-xs font-black uppercase tracking-widest flex items-center justify-center space-x-2">
            <span>Enter Studio Shop</span>
            <ChevronRight className="w-4 h-4" />
         </Link>
      </div>
    </div>
  );
}
