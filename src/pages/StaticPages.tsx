import { motion } from 'motion/react';
import { Target, Users, Gem, Shield } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="py-20 px-4 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <motion.div
           initial={{ opacity: 0, x: -30 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.8 }}
        >
          <span className="text-accent text-xs font-bold uppercase tracking-[0.3em] mb-4 block">Our Story</span>
          <h1 className="text-6xl md:text-8xl font-display font-black tracking-tighter uppercase italic leading-[0.85] mb-12">
            More Than<br/>A Label<span className="text-accent">.</span>
          </h1>
          <div className="space-y-6 text-black/70 text-lg leading-relaxed font-light">
            <p>
              At Kings Clothing Brand, we believe fashion is the first step toward taking absolute control of your life. Based in the heart of Ghana, we don’t just make clothes; we build armor for the ambitious.
            </p>
            <p>
              The name "Kings" isn't about a title or a gender—it’s about a mindset. Whether you are rocking our 320 GSM heavyweight shirts or our signature Acid Wash tops, our unisex collections are designed for those who lead, those who hustle, and those who refuse to settle.
            </p>
          </div>
        </motion.div>

        <div className="relative">
           <div className="aspect-square rounded-[3rem] overflow-hidden bg-black/5 rotate-3">
              <img src="https://picsum.photos/seed/aboutkings/1000/1000" alt="Kings Crew" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
           </div>
           <div className="absolute -bottom-10 -left-10 bg-black text-white p-12 rounded-[2rem] -rotate-6 shadow-2xl">
              <p className="text-4xl font-display font-black italic uppercase tracking-tighter">Mindset<br/>of Authority</p>
           </div>
        </div>
      </div>

      <div className="mt-40 grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="space-y-4">
           <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-accent">
              <Gem className="w-8 h-8" />
           </div>
           <h3 className="text-2xl font-display font-bold uppercase italic tracking-tighter">Premium Quality</h3>
           <p className="text-black/50 text-sm leading-relaxed">From 230 GSM to 320 GSM, we offer the thickest, most durable fabric options in the market.</p>
        </div>
        <div className="space-y-4">
           <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-accent">
              <Users className="w-8 h-8" />
           </div>
           <h3 className="text-2xl font-display font-bold uppercase italic tracking-tighter">Empowering Youth</h3>
           <p className="text-black/50 text-sm leading-relaxed">Through our Agent System, we provide a platform for creators and hustlers to earn through sales and designs.</p>
        </div>
        <div className="space-y-4">
           <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-accent">
              <Target className="w-8 h-8" />
           </div>
           <h3 className="text-2xl font-display font-bold uppercase italic tracking-tighter">Authentic Streetwear</h3>
           <p className="text-black/50 text-sm leading-relaxed">Every piece is a blend of modern aesthetics and local Ghanaian grit.</p>
        </div>
      </div>
    </div>
  );
}

export function TOSPage() {
  return (
    <div className="py-20 px-4 max-w-4xl mx-auto">
      <div className="mb-16">
        <h1 className="text-5xl font-display font-black tracking-tighter uppercase italic mb-4">Terms of Service</h1>
        <p className="text-black/40 text-xs font-bold uppercase tracking-widest">Last Updated: April 2026</p>
      </div>

      <div className="space-y-12">
        <section>
          <div className="flex items-center space-x-4 mb-6">
             <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center font-black">1</div>
             <h2 className="text-2xl font-display font-black uppercase italic tracking-tighter">Payment Terms (The 50/50 Rule)</h2>
          </div>
          <div className="bg-black/5 p-8 rounded-3xl space-y-4 text-black/70 leading-relaxed">
            <p>To ensure commitment and cover production costs, Kings Clothing Brand operates on a 50% down-payment model.</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Orders are only confirmed once 50% of the total price is received via Mobile Money to <strong>0534716125</strong>.</li>
              <li>The remaining 50% balance is due immediately upon delivery or completion of the order.</li>
              <li>Payments must include the Order ID as a reference.</li>
            </ul>
          </div>
        </section>

        <section>
          <div className="flex items-center space-x-4 mb-6">
             <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center font-black">2</div>
             <h2 className="text-2xl font-display font-black uppercase italic tracking-tighter">Agent & Affiliate Program</h2>
          </div>
          <div className="bg-black/5 p-8 rounded-3xl space-y-4 text-black/70 leading-relaxed">
            <ul className="list-disc pl-6 space-y-2">
              <li>Agents earn a standard 10% commission on every successful sale made via their unique Buy Link.</li>
              <li>Commissions are paid out via Mobile Money to the number provided in the Agent Portal.</li>
              <li>"Successful sale" means the customer has completed the 100% total payment.</li>
            </ul>
          </div>
        </section>

        <section>
          <div className="flex items-center space-x-4 mb-6">
             <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center font-black">3</div>
             <h2 className="text-2xl font-display font-black uppercase italic tracking-tighter">Agent Design Uploads</h2>
          </div>
          <div className="bg-black/5 p-8 rounded-3xl space-y-4 text-black/70 leading-relaxed">
            <ul className="list-disc pl-6 space-y-2">
              <li>Agents may upload original designs for the "Kings Collection."</li>
              <li>All designs undergo AI Verification to ensure brand alignment.</li>
              <li>Final approval rests solely with the Brand Owner.</li>
              <li>Once approved and sold, the designing Agent earns an additional 10% profit share (20% total) for that specific item.</li>
            </ul>
          </div>
        </section>

        <section>
           <div className="flex items-center space-x-4 mb-6">
             <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center font-black">4</div>
             <h2 className="text-2xl font-display font-black uppercase italic tracking-tighter">Delivery & Returns</h2>
          </div>
          <div className="bg-black/5 p-8 rounded-3xl space-y-4 text-black/70 leading-relaxed">
             <p>Delivery timelines will be communicated via WhatsApp after the initial deposit is confirmed.</p>
             <p>Because items are often customized by size and GSM preference, returns are only accepted for manufacturing defects.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
