import { motion } from 'motion/react';
import { Target, Users, Gem, Shield, HelpCircle, Layers, Grid3X3, Check } from 'lucide-react';

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
          <div className="space-y-6 text-white/70 text-lg leading-relaxed font-light">
            <p>
              At Kings Clothing Brand, we believe fashion is the first step toward taking absolute control of your life. Based in the heart of Ghana, we don’t just make clothes; we build armor for the ambitious.
            </p>
            <p>
              The name "Kings" isn't about a title or a gender—it’s about a mindset. Whether you are rocking our 320 GSM heavyweight shirts or our signature Acid Wash tops, our collections are designed for those who lead, those who hustle, and those who refuse to settle.
            </p>
          </div>
        </motion.div>

        <div className="relative">
           <div className="aspect-square rounded-[3rem] overflow-hidden bg-black/5 rotate-3">
              <img src="https://picsum.photos/seed/aboutkings/1000/1000" alt="Kings Crew" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
           </div>
           <div className="absolute -bottom-10 -left-10 bg-black text-white p-12 rounded-[2rem] -rotate-6 shadow-2xl border border-white/5">
              <p className="text-4xl font-display font-black italic uppercase tracking-tighter">Mindset<br/>of Authority</p>
           </div>
        </div>
      </div>

      <div className="mt-40 grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="glass p-8 rounded-3xl border border-white/5 space-y-4">
           <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center text-accent">
              <Gem className="w-8 h-8" />
           </div>
           <h3 className="text-2xl font-display font-bold uppercase italic tracking-tighter text-white">Premium Quality</h3>
           <p className="text-white/50 text-sm leading-relaxed uppercase">From 230 GSM to 320 GSM, we offer the thickest, most durable fabric options in the market.</p>
        </div>
        <div className="glass p-8 rounded-3xl border border-white/5 space-y-4">
           <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center text-accent">
              <Users className="w-8 h-8" />
           </div>
           <h3 className="text-2xl font-display font-bold uppercase italic tracking-tighter text-white">Empowering Youth</h3>
           <p className="text-white/50 text-sm leading-relaxed uppercase">Through our Agent System, we provide a platform for creators and hustlers to earn through sales and designs.</p>
        </div>
        <div className="glass p-8 rounded-3xl border border-white/5 space-y-4">
           <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center text-accent">
              <Target className="w-8 h-8" />
           </div>
           <h3 className="text-2xl font-display font-bold uppercase italic tracking-tighter text-white">Authentic Streetwear</h3>
           <p className="text-white/50 text-sm leading-relaxed uppercase">Every piece is a blend of modern aesthetics and local Ghanaian grit.</p>
        </div>
      </div>
    </div>
  );
}

export function TOSPage() {
  return (
    <div className="py-20 px-4 max-w-4xl mx-auto">
      <div className="mb-16">
        <h1 className="text-5xl font-display font-black tracking-tighter uppercase italic text-white mb-4">Terms of Service</h1>
        <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Last Updated: April 2026</p>
      </div>

      <div className="space-y-12">
        <section>
          <div className="flex items-center space-x-4 mb-6">
             <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center font-black">1</div>
             <h2 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white">Payment Terms (The 50/50 Rule)</h2>
          </div>
          <div className="bg-white/5 border border-white/5 p-8 rounded-3xl space-y-4 text-white/70 leading-relaxed uppercase">
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
             <h2 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white">Agent & Affiliate Program</h2>
          </div>
          <div className="bg-white/5 border border-white/5 p-8 rounded-3xl space-y-4 text-white/70 leading-relaxed uppercase">
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
             <h2 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white">Agent Design Uploads</h2>
          </div>
          <div className="bg-white/5 border border-white/5 p-8 rounded-3xl space-y-4 text-white/70 leading-relaxed uppercase">
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
              <h2 className="text-2xl font-display font-black uppercase italic tracking-tighter text-white">Delivery & Returns</h2>
           </div>
           <div className="bg-white/5 border border-white/5 p-8 rounded-3xl space-y-4 text-white/70 leading-relaxed uppercase">
              <p>Delivery timelines will be communicated via WhatsApp after the initial deposit is confirmed.</p>
              <p>Because items are often customized by size and GSM preference, returns are only accepted for manufacturing defects.</p>
           </div>
        </section>
      </div>
    </div>
  );
}

export function FAQPage() {
  const faqs = [
    {
      q: "What is the 50/50 payment model, and is it secure?",
      a: "Yes, it is entirely secure. To support local production, we require a 50% down-payment via Mobile Money to initiate sewing and printing. The remaining 50% is due only upon physical delivery or when your order is finalized. All orders are traceable through our blockchain-inspired digital ledger on the Tracking page."
    },
    {
      q: "What does GSM stand for, and which thickness should I choose?",
      a: "GSM stands for Grams per Square Meter, measuring the thickness/density of cotton fabrics. We offer: 230 GSM (Precision Weight - active breathable streetwear), 260 GSM (Command Weight - premium boxy drop), and 320 GSM (Armor Weight - ultra-heavy canvas feel with maximum structure)."
    },
    {
      q: "How does the Agent Affiliate Program work?",
      a: "Citizens who register as Agents get custom buy links and visual boards. Sharing your link gives you standard 10% commission of the total product value. If you design custom graphics approved for the official Kings catalog, you get an extra 10% design royalty (making it 20% total profit for your items)."
    },
    {
      q: "How long does shipping and delivery take?",
      a: "Custom-tailored order blueprints are built by hand in our Accra workspace. Standard manufacturing and courier distribution take 5 to 9 business days depending on your location. Detailed real-time statuses are available on the Interactive Order Timeline."
    },
    {
      q: "Can I return or exchange my custom streetwear pieces?",
      a: "Because our garments are engineered on-demand according to each buyer's custom Category, GSM weight, Size, and Colorway, we do not accept general returns. We will immediately swap or re-ship your piece if there are verified manufacturing defects."
    }
  ];

  return (
    <div className="py-20 px-4 max-w-4xl mx-auto">
      <div className="mb-16 text-center">
        <span className="text-accent text-xs font-bold uppercase tracking-[0.3em] mb-4 block">Knowledge Base</span>
        <h1 className="text-5xl md:text-6xl font-display font-black tracking-tighter uppercase italic text-white mb-4">Frequently Asked <span className="text-accent">Questions.</span></h1>
        <p className="text-white/40 text-sm max-w-xl mx-auto uppercase">Unlock tactical information about ordering, custom weight GSM fabric specifications, and agent design deployments.</p>
      </div>

      <div className="space-y-6">
        {faqs.map((faq, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass p-8 rounded-[2rem] border border-white/5 hover:border-white/15 transition-all space-y-3"
          >
            <div className="flex items-start gap-4">
              <div className="p-2 bg-accent/10 rounded-xl text-accent flex-shrink-0 mt-0.5">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-black uppercase tracking-tight text-white">{faq.q}</h4>
                <p className="text-xs text-white/50 leading-relaxed uppercase">{faq.a}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function SizeGuidePage() {
  return (
    <div className="py-20 px-4 max-w-6xl mx-auto">
      <div className="mb-16 text-center">
        <span className="text-accent text-xs font-bold uppercase tracking-[0.3em] mb-4 block">DURABILITY MANUAL</span>
        <h1 className="text-5xl md:text-7xl font-display font-black tracking-tighter uppercase italic text-white mb-4">Sizing & Fabric <span className="text-accent">Handbook.</span></h1>
        <p className="text-white/40 text-sm max-w-xl mx-auto uppercase">Technical metrics, measurement guidelines, and structural weights optimized for streetwear postures.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        {/* Table Spec */}
        <div className="space-y-8 bg-black/50 p-8 md:p-12 rounded-[2.5rem] border border-white/5">
          <div className="flex items-center space-x-3 text-accent">
            <Grid3X3 className="w-5 h-5" />
            <h3 className="text-xl font-display font-black uppercase italic tracking-tighter text-white">Garment Grade Specs</h3>
          </div>

          <p className="text-xs text-white/40 uppercase leading-relaxed font-bold">
            All our t-shirts and hoodies are tailored with a classic boxy vintage streetwear fit. Shoulders are dropped slightly to produce the iconic draped silhouette.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.01]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-widest text-white/40">
                  <th className="py-4 px-6">Metric Scale</th>
                  <th className="py-4 px-4 text-center">S</th>
                  <th className="py-4 px-4 text-center">M</th>
                  <th className="py-4 px-4 text-center">L</th>
                  <th className="py-4 px-4 text-center">XL</th>
                </tr>
              </thead>
              <tbody className="text-[10px] font-mono divide-y divide-white/5 text-white/80 font-bold uppercase">
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-6 font-sans font-black uppercase text-white text-[9px]">Sleeve Length</td>
                  <td className="py-4 px-4 text-center">21 cm</td>
                  <td className="py-4 px-4 text-center">22 cm</td>
                  <td className="py-4 px-4 text-center">23 cm</td>
                  <td className="py-4 px-4 text-center">24 cm</td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-6 font-sans font-black uppercase text-white text-[9px]">Chest Width</td>
                  <td className="py-4 px-4 text-center">52 cm</td>
                  <td className="py-4 px-4 text-center">55 cm</td>
                  <td className="py-4 px-4 text-center">58 cm</td>
                  <td className="py-4 px-4 text-center">61 cm</td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-6 font-sans font-black uppercase text-white text-[9px]">Back Length</td>
                  <td className="py-4 px-4 text-center">70 cm</td>
                  <td className="py-4 px-4 text-center">72 cm</td>
                  <td className="py-4 px-4 text-center">74 cm</td>
                  <td className="py-4 px-4 text-center">76 cm</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[8px] text-white/30 uppercase font-black tracking-widest italic">
            * Sizes can fluctuate +/- 1.5 cm during custom garment batch washing and hand stitching cycles.
          </p>
        </div>

        {/* Weights & Care */}
        <div className="space-y-12">
          <div className="space-y-6">
            <div className="flex items-center space-x-3 text-accent">
              <Layers className="w-5 h-5" />
              <h3 className="text-xl font-display font-black uppercase italic tracking-tighter text-white">GSM Weights Defined</h3>
            </div>

            <div className="space-y-4">
              <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-2">
                <h4 className="text-xs font-black uppercase text-accent">230 GSM: Light Wave Precision</h4>
                <p className="text-xs text-white/40 leading-relaxed uppercase">Maximum airflow fabric, breathable under tropical humidity. Feels ultra-lightweight while retaining structured necklines.</p>
              </div>

              <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-2">
                <h4 className="text-xs font-black uppercase text-accent">260 GSM: Midweight Command</h4>
                <p className="text-xs text-white/40 leading-relaxed uppercase">The classic standard. Heavyweight enough to drop boxy and stand off your torso, light enough to wear comfortably any season.</p>
              </div>

              <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-2">
                <h4 className="text-xs font-black uppercase text-accent">320 GSM: Heavyweight Ultima Armour</h4>
                <p className="text-xs text-white/40 leading-relaxed uppercase">Our signature thickest cotton drape. Rigid, premium structure that provides absolute heat-shielding, drop-shoulder rigidity and monumental frame endurance.</p>
              </div>
            </div>
          </div>

          <div className="bg-accent/10 border border-accent/20 p-8 rounded-[2rem] space-y-3">
            <h4 className="text-sm font-black uppercase tracking-widest text-accent flex items-center gap-2">
              <Shield className="w-4 h-4" /> Wear & Care Protocols
            </h4>
            <p className="text-xs text-white/60 uppercase leading-relaxed">
              Maintain integrity: Machine wash cold. Do not dry clean or tumble dry. Hang dry naturally. Avoid ironing print designs directly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
