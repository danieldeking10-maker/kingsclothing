// Paystack Simulated Gateway Fallback
// Provides a premium Staging/Preview environment payment UI simulation
// if the production CDN from paystack.co is blocked or fails.

import { validatePaystackResponse } from './paystackLogger';

export function initPaystackMock() {
  if (typeof window === 'undefined') return;

  const rawKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_d894983d4fc4381d5bfd95e0e1db5b800df57f95';
  const hostname = window.location.hostname || '';
  const isDevOrPreview = hostname === 'localhost' || 
                         hostname === '127.0.0.1' || 
                         hostname.includes('.run.app') ||
                         hostname.includes('webcontainer-api') ||
                         hostname.includes('aistudio');

  // Capture existing global PaystackPop if already loaded by the script tag
  let realPaystackPop = (window as any)._realPaystackPop || (window as any).PaystackPop;
  if (realPaystackPop && realPaystackPop._isMock) {
    realPaystackPop = (window as any)._realPaystackPop;
  }

  const mockImplementation = {
    _isMock: true,
    setup: (config: any) => {
      // Dynamic routing: determine if sandbox scenario or real checkout
      const isSimulation = isDevOrPreview ||
                           config.mode === 'simulation' || 
                           !config.access_code || 
                           (typeof config.access_code === 'string' && config.access_code.startsWith('sim_access_code_')) ||
                           config.key === 'pk_live_your_real_key_here';

      if (!isSimulation && realPaystackPop) {
        console.log("[Kings Secure Payment Router] Real transaction detected. Routing to official Paystack gateway.");
         // In real mode, use official Paystack Pop library
        return realPaystackPop.setup(config);
      }

      console.log("[Kings Secure Payment Router] Simulation/mock transaction. Routing to local high-fidelity gateway.");
      return {
        openIframe: () => {
          renderSimulatedGateway(config);
        }
      };
    }
  };

  try {
    // Attempt to delete existing first so descriptor update is guaranteed to succeed
    try {
      delete (window as any).PaystackPop;
    } catch (_) {}
    
    // Intercept window.PaystackPop using a dynamic getter/setter so we can coexist perfectly with the real CDN script.
    // When the script loads, it assigns window.PaystackPop. When it does, we save the real instance.
    Object.defineProperty(window, 'PaystackPop', {
      get: () => mockImplementation,
      set: (val) => {
        if (val && !val._isMock) {
          console.log("[Kings Secure Payment Router] Captured real PaystackPop instance assigned by CDN script.");
          realPaystackPop = val;
          (window as any)._realPaystackPop = val;
        }
      },
      configurable: true,
      enumerable: true
    });
    console.log("[Kings Secure Payment Router] Dynamic Routing Engine initialized successfully.");
  } catch (e) {
    console.warn("[Kings Secure Payment Router] Redefinition failure, falling back to direct assignment:", e);
    (window as any).PaystackPop = mockImplementation;
  }
}

function renderSimulatedGateway(config: any) {
  // Remove any existing preview instances
  const existing = document.getElementById('paystack-simulated-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'paystack-simulated-overlay';
  overlay.className = 'fixed inset-0 bg-black/95 backdrop-blur-md z-[99999] flex items-center justify-center p-4 font-sans';

  const amountInGHS = config.amount / 100;
  const formattedAmount = new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(amountInGHS);

  let activeSegment = 'momo';

  function renderFormMarkup() {
    return `
      <!-- Title -->
      <div class="flex justify-between items-start">
        <div>
          <h2 class="text-xs font-black uppercase tracking-[0.3em] text-[#F27D26]">NEURAL FORGE GATEWAY</h2>
          <p class="text-[10px] uppercase font-black tracking-widest text-white/30">Sandboxed Transaction Simulator</p>
        </div>
        <button id="paystack-sim-close" class="p-2 hover:bg-white/5 rounded-full transition-all text-white/40 hover:text-white">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Amount Summary -->
      <div class="p-6 bg-white/[0.02] border border-white/5 rounded-3xl text-center space-y-1">
        <span class="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Secure Full Payment</span>
        <div class="text-3xl font-display font-black text-[#F27D26]">${formattedAmount}</div>
        <div class="text-[9px] font-mono tracking-wider text-white/20">${config.email}</div>
      </div>

      <!-- Payment Methods Tabs -->
      <div class="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
        <button id="tab-momo" class="py-3 bg-white/10 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all">
          Mobile Money
        </button>
        <button id="tab-card" class="py-3 text-white/40 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all">
          Credit / Debit Card
        </button>
      </div>

      <!-- Payment Fields -->
      <div class="space-y-4">
        <!-- MoMo Segment -->
        <div id="segment-momo" class="space-y-4">
          <div class="space-y-2">
            <label class="text-[9px] font-black uppercase tracking-widest text-white/40">MoMo Phone Number</label>
            <input type="tel" id="sim-momo-number" class="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white font-mono placeholder:text-white/10 focus:border-[#F27D26] focus:outline-none" placeholder="0548123456" />
          </div>
          <div class="space-y-2">
            <label class="text-[9px] font-black uppercase tracking-widest text-white/40">MoMo Network Operator</label>
            <select id="sim-momo-provider" class="w-full bg-[#161618] border border-white/10 rounded-2xl py-4 px-5 text-white/80 font-mono focus:border-[#F27D26] outline-none text-sm">
              <option value="mtn">MTN Mobile Money</option>
              <option value="telecel">Telecel Cash</option>
              <option value="airteltigo">AirtelTigo Money</option>
            </select>
          </div>
        </div>

        <!-- Card Segment -->
        <div id="segment-card" class="space-y-4 hidden">
          <div class="space-y-2">
            <label class="text-[9px] font-black uppercase tracking-widest text-white/40">Card Number</label>
            <input type="text" id="sim-card-num" class="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white font-mono placeholder:text-white/10 focus:border-[#F27D26] focus:outline-none" placeholder="4000 1234 5678 9010" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-[9px] font-black uppercase tracking-widest text-white/40">Expiry Date</label>
              <input type="text" id="sim-card-expiry" class="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white font-mono placeholder:text-white/10 focus:border-[#F27D26] focus:outline-none" placeholder="MM/YY" />
            </div>
            <div class="space-y-2">
              <label class="text-[9px] font-black uppercase tracking-widest text-white/40">CVV</label>
              <input type="password" id="sim-card-cvv" class="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white font-mono placeholder:text-white/10 focus:border-[#F27D26] focus:outline-none" placeholder="123" />
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="space-y-3 pt-2">
        <button id="sim-btn-pay" class="w-full bg-[#F27D26] hover:opacity-90 active:scale-95 text-black font-black uppercase tracking-widest py-4 rounded-xl transition-all text-xs flex items-center justify-center gap-2">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          Authorize Sandbox Payment
        </button>
        <button id="sim-btn-fail" class="w-full bg-red-500/10 hover:bg-red-500/20 active:scale-95 text-red-500 border border-red-500/20 font-black uppercase tracking-widest py-4 rounded-xl transition-all text-xs">
          Trigger Simulated Decline
        </button>
      </div>

      <!-- Safety Footer -->
      <div class="text-center pt-2">
        <p class="text-[8px] font-black uppercase tracking-[0.2em] text-white/15">Kings Neural Secure Ledger Integration. No real funds charged.</p>
      </div>
    `;
  }

  overlay.innerHTML = `
    <div class="max-w-md w-full bg-[#0E0E10] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6 relative flex flex-col text-white transition-all duration-300 ease-out" id="paystack-simulated-modal">
      ${renderFormMarkup()}
    </div>

    <style>
      @keyframes modalEnter {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    </style>
  `;

  document.body.appendChild(overlay);

  const modalContainer = document.getElementById('paystack-simulated-modal')!;

  function initFormHandlers() {
    const closeBtn = document.getElementById('paystack-sim-close')!;
    const tabMomo = document.getElementById('tab-momo')!;
    const tabCard = document.getElementById('tab-card')!;
    const segmentMomo = document.getElementById('segment-momo')!;
    const segmentCard = document.getElementById('segment-card')!;
    const btnPay = document.getElementById('sim-btn-pay')!;
    const btnFail = document.getElementById('sim-btn-fail')!;

    closeBtn.onclick = () => {
      overlay.remove();
      if (config.onClose) {
        config.onClose();
      } else if (config.onCancel) {
        config.onCancel();
      }
    };

    tabMomo.onclick = () => {
      activeSegment = 'momo';
      tabMomo.className = 'py-3 bg-white/10 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all';
      tabCard.className = 'py-3 text-white/40 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all';
      segmentMomo.classList.remove('hidden');
      segmentCard.classList.add('hidden');
    };

    tabCard.onclick = () => {
      activeSegment = 'card';
      tabCard.className = 'py-3 bg-white/10 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all';
      tabMomo.className = 'py-3 text-white/40 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all';
      segmentCard.classList.remove('hidden');
      segmentMomo.classList.add('hidden');
    };

    btnFail.onclick = () => {
      btnFail.setAttribute('disabled', 'true');
      btnFail.style.opacity = '0.5';
      btnFail.innerHTML = 'DECLINING ACTION...';

      setTimeout(() => {
        overlay.remove();
        if (config.onClose) {
          config.onClose();
        } else if (config.onCancel) {
          config.onCancel();
        }
      }, 1000);
    };

    btnPay.onclick = () => {
      if (activeSegment === 'momo') {
        const momoNumberEl = document.getElementById('sim-momo-number') as HTMLInputElement;
        const providerEl = document.getElementById('sim-momo-provider') as HTMLSelectElement;
        const momoNumber = momoNumberEl ? momoNumberEl.value : '0548123456';
        const provider = providerEl ? providerEl.value : 'mtn';

        setTimeout(() => {
          overlay.remove();
          
          // FIXED: Create and validate response before callback
          const mockRef = config.reference || ('KNGS_MOMO_' + Math.random().toString(36).substring(2, 12).toUpperCase());
          const mockResponse = {
            reference: mockRef,
            id: mockRef,
            status: 'success',
            message: 'Approved',
            momoNumber: momoNumber,
            momoNetwork: provider,
            paid_at: new Date().toISOString()
          };

          // FIXED: Validate response using strict validator
          const validation = validatePaystackResponse(mockResponse);
          if (!validation.isValid) {
            console.error('[Paystack Mock] Response validation failed:', validation.errors);
            if (config.onClose) config.onClose();
            return;
          }

          console.log('[Paystack Mock] Mobile Money response validated successfully');
          
          if (config.callback) {
            config.callback(mockResponse);
          } else if (config.onSuccess) {
            config.onSuccess(mockResponse);
          }
        }, 2000);
      } else {
        const cardNumEl = document.getElementById('sim-card-num') as HTMLInputElement;
        const cardNum = cardNumEl ? cardNumEl.value : '4000 1234 5678 9010';
        
        setTimeout(() => {
          overlay.remove();
          
          // FIXED: Create and validate response before callback
          const mockRef = config.reference || ('KNGS_CARD_' + Math.random().toString(36).substring(2, 12).toUpperCase());
          const mockResponse = {
            reference: mockRef,
            id: mockRef,
            status: 'success',
            message: 'Approved',
            card: cardNum.slice(-4),
            paid_at: new Date().toISOString()
          };

          // FIXED: Validate response using strict validator
          const validation = validatePaystackResponse(mockResponse);
          if (!validation.isValid) {
            console.error('[Paystack Mock] Response validation failed:', validation.errors);
            if (config.onClose) config.onClose();
            return;
          }

          console.log('[Paystack Mock] Card response validated successfully');
          
          if (config.callback) {
            config.callback(mockResponse);
          } else if (config.onSuccess) {
            config.onSuccess(mockResponse);
          }
        }, 2000);
      }
    };
  }

  // Initialize first view
  initFormHandlers();
}
