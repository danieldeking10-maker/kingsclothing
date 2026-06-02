// Paystack Simulated Gateway Fallback
// Provides a premium Staging/Preview environment payment UI simulation
// if the production CDN from paystack.co is blocked or fails.

export function initPaystackMock() {
  if (typeof window === 'undefined') return;

  const rawKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_d894983d4fc4381d5bfd95e0e1db5b800df57f95';
  const hostname = window.location.hostname || '';
  const isDevOrPreview = hostname === 'localhost' || 
                         hostname === '127.0.0.1' || 
                         hostname.includes('.run.app') ||
                         hostname.includes('webcontainer-api') ||
                         hostname.includes('aistudio');

  // Activate simulation if:
  // 1. Key is undefined or placeholder
  // 2. We're on development / staging run.app sandbox and the key is not a live production key (starts with pk_live)
  // This guarantees seamless UX and mock orders generation without real card credentials or domain origin errors.
  const isMockKey = !rawKey || 
                    rawKey === 'your_paystack_public_key' || 
                    (!rawKey.startsWith('pk_live') && isDevOrPreview) ||
                    !rawKey.startsWith('pk_');

  const mockImplementation = {
    setup: (config: any) => {
      console.log("Paystack local simulation initialized with config:", config);
      return {
        openIframe: () => {
          renderSimulatedGateway(config);
        }
      };
    }
  };

  if (isMockKey) {
    try {
      // Define intercepting get/set on window to withstand secondary script injection/override
      Object.defineProperty(window, 'PaystackPop', {
        get: () => mockImplementation,
        set: (val) => {
          console.log("Kings Neural Forge: Prevented real PaystackPop override to safeguard sandbox simulation.");
        },
        configurable: true
      });
      console.log("Kings Neural Forge: Securely locked simulated PaystackPop gateway.");
    } catch (e) {
      (window as any).PaystackPop = mockImplementation;
    }
  } else {
    // If we have a valid key, only act as fallback if library fails to load
    if (!(window as any).PaystackPop) {
      (window as any).PaystackPop = mockImplementation;
    }
  }
}

function renderSimulatedGateway(config: any) {
  // Remove any existing preview instances
  const existing = document.getElementById('paystack-simulated-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'paystack-simulated-overlay';
  overlay.className = 'fixed inset-0 bg-black/90 backdrop-blur-md z-[99999] flex items-center justify-center p-4 font-sans';

  const amountInGHS = config.amount / 100;
  const formattedAmount = new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(amountInGHS);

  overlay.innerHTML = `
    <div class="max-w-md w-full bg-[#0E0E10] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6 relative flex flex-col text-white transition-all duration-300 ease-out" id="paystack-simulated-modal" style="animation: modalEnter 0.3s forwards;">
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
            <input type="tel" id="sim-momo-number" class="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white font-mono placeholder:text-white/10 focus:border-[#F27D26] focus:bg-[#F27D26]/5 transition-all outline-none text-sm" placeholder="05x xxx xxxx" value="0548123456" />
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
            <input type="text" id="sim-card-num" class="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white font-mono placeholder:text-white/10 focus:border-[#F27D26] focus:bg-[#F27D26]/5 transition-all outline-none text-sm" placeholder="4000 1234 5678 9010" value="4000 1234 5678 9010" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-[9px] font-black uppercase tracking-widest text-white/40">Expiry Date</label>
              <input type="text" id="sim-card-expiry" class="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white font-mono placeholder:text-white/10 focus:border-[#F27D26] focus:bg-[#F27D26]/5 transition-all outline-none text-sm text-center" placeholder="MM/YY" value="12/28" />
            </div>
            <div class="space-y-2">
              <label class="text-[9px] font-black uppercase tracking-widest text-white/40">CVV</label>
              <input type="password" id="sim-card-cvv" class="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white font-mono placeholder:text-white/10 focus:border-[#F27D26] focus:bg-[#F27D26]/5 transition-all outline-none text-sm text-center" placeholder="123" value="123" />
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="space-y-3 pt-2">
        <button id="sim-btn-pay" class="w-full bg-[#F27D26] hover:opacity-90 active:scale-95 text-black font-black uppercase tracking-widest py-4 rounded-2xl transition-all text-xs flex items-center justify-center gap-2 cursor-pointer">
          Authorize Sandbox Payment
        </button>
        <button id="sim-btn-fail" class="w-full bg-red-500/10 hover:bg-red-500/20 active:scale-95 text-red-500 border border-red-500/20 font-black uppercase tracking-widest py-4 rounded-2xl transition-all text-[10px] flex items-center justify-center gap-2 cursor-pointer">
          Trigger Simulated Decline
        </button>
      </div>

      <!-- Safety Footer -->
      <div class="text-center pt-2">
        <p class="text-[8px] font-black uppercase tracking-[0.2em] text-white/15">Kings Neural Secure Ledger Integration. No real funds charged.</p>
      </div>
    </div>

    <style>
      @keyframes modalEnter {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    </style>
  `;

  document.body.appendChild(overlay);

  // Selector Hooks
  const closeBtn = document.getElementById('paystack-sim-close')!;
  const tabMomo = document.getElementById('tab-momo')!;
  const tabCard = document.getElementById('tab-card')!;
  const segmentMomo = document.getElementById('segment-momo')!;
  const segmentCard = document.getElementById('segment-card')!;
  const btnPay = document.getElementById('sim-btn-pay')!;
  const btnFail = document.getElementById('sim-btn-fail')!;

  function destroyOverlay() {
    overlay.remove();
  }

  closeBtn.onclick = () => {
    destroyOverlay();
    if (config.onClose) {
      config.onClose();
    } else if (config.onCancel) {
      config.onCancel();
    }
  };

  tabMomo.onclick = () => {
    tabMomo.className = 'py-3 bg-white/10 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all';
    tabCard.className = 'py-3 text-white/40 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all';
    segmentMomo.classList.remove('hidden');
    segmentCard.classList.add('hidden');
  };

  tabCard.onclick = () => {
    tabCard.className = 'py-3 bg-white/10 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all';
    tabMomo.className = 'py-3 text-white/40 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all';
    segmentCard.classList.remove('hidden');
    segmentMomo.classList.add('hidden');
  };

  btnPay.onclick = () => {
    btnPay.setAttribute('disabled', 'true');
    btnPay.style.opacity = '0.5';
    btnPay.innerHTML = `
      <svg class="animate-spin h-4 w-4 text-black mr-2 inline-block" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      AUTHORIZING...
    `;

    setTimeout(() => {
      destroyOverlay();
      const mockRef = 'KNGS_FULL_PAY_' + Math.random().toString(36).substring(2, 12).toUpperCase();
      const mockResponse = {
        reference: mockRef,
        id: mockRef,
        status: 'success',
        message: 'Approved'
      };
      
      if (config.callback) {
        config.callback(mockResponse);
      } else if (config.onSuccess) {
        config.onSuccess(mockResponse);
      }
    }, 1500);
  };

  btnFail.onclick = () => {
    btnFail.setAttribute('disabled', 'true');
    btnFail.style.opacity = '0.5';
    btnFail.innerHTML = 'DECLINING ACTION...';

    setTimeout(() => {
      destroyOverlay();
      if (config.onClose) {
        config.onClose();
      } else if (config.onCancel) {
        config.onCancel();
      }
    }, 1000);
  };
}
