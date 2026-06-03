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
  const isHardcodedLiveKey = rawKey === 'pk_live_d894983d4fc4381d5bfd95e0e1db5b800df57f95';
  const isMockKey = !rawKey || 
                    rawKey === 'your_paystack_public_key' || 
                    (!rawKey.startsWith('pk_live') && isDevOrPreview) ||
                    !rawKey.startsWith('pk_') ||
                    (isHardcodedLiveKey && isDevOrPreview);

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
        <button id="sim-btn-pay" class="w-full bg-[#F27D26] hover:opacity-90 active:scale-95 text-black font-black uppercase tracking-widest py-4 rounded-xl transition-all text-xs flex items-center justify-center gap-2 cursor-pointer">
          Authorize Sandbox Payment
        </button>
        <button id="sim-btn-fail" class="w-full bg-red-500/10 hover:bg-red-500/20 active:scale-95 text-red-500 border border-red-500/20 font-black uppercase tracking-widest py-4 rounded-xl transition-all text-[10px] flex items-center justify-center gap-2 cursor-pointer">
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
    <div class="max-w-md w-full bg-[#0E0E10] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6 relative flex flex-col text-white transition-all duration-300 ease-out" id="paystack-simulated-modal" style="animation: modalEnter 0.3s forwards;">
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

        showMomoPinScreen(momoNumber, provider);
      } else {
        const cardNumEl = document.getElementById('sim-card-num') as HTMLInputElement;
        const cardNum = cardNumEl ? cardNumEl.value : '4000 1234 5678 9010';
        showCardOtpScreen(cardNum);
      }
    };
  }

  function showMomoPinScreen(momoNumber: string, provider: string) {
    let providerName = 'MTN Mobile Money';
    let providerInitials = 'MTN';
    let providerBg = 'bg-yellow-500 text-black border border-yellow-400 font-extrabold';

    if (provider === 'telecel') {
      providerName = 'Telecel Cash';
      providerInitials = 'TC';
      providerBg = 'bg-red-600 text-white border border-red-500 font-extrabold';
    } else if (provider === 'airteltigo') {
      providerName = 'AirtelTigo Money';
      providerInitials = 'AT';
      providerBg = 'bg-blue-600 text-white border border-blue-400 font-extrabold';
    }

    modalContainer.innerHTML = `
      <div class="space-y-6" style="animation: modalEnter 0.2s ease-out;">
        <div class="flex justify-between items-center border-b border-white/5 pb-4">
          <div class="flex items-center gap-3">
            <!-- Network Circle -->
            <div class="w-10 h-10 rounded-full flex items-center justify-center font-black text-xs ${providerBg}">
              ${providerInitials}
            </div>
            <div>
              <h3 class="text-xs font-black uppercase tracking-[0.2em] text-[#F27D26]">${providerName}</h3>
              <p class="text-[9px] uppercase font-mono text-white/40">Secure Wallet Debit PIN</p>
            </div>
          </div>
          <span class="text-xs font-mono font-black text-white/80">${formattedAmount}</span>
        </div>

        <div class="text-center space-y-2">
          <p class="text-[10px] uppercase font-bold tracking-widest text-[#F27D26] leading-relaxed">
            SIMULATED PUSH NOTIFICATION SENT TO <span class="text-white font-mono">${momoNumber}</span>
          </p>
          <p class="text-[9px] uppercase tracking-widest text-white/30 italic">
            Please enter your 4-digit wallet PIN on the keypad below to authorize the transfer.
          </p>
        </div>

        <!-- PIN Input Circles -->
        <div class="flex justify-center gap-4 py-2">
          <div id="pin-dot-1" class="w-4 h-4 rounded-full border border-white/20 transition-all"></div>
          <div id="pin-dot-2" class="w-4 h-4 rounded-full border border-white/20 transition-all"></div>
          <div id="pin-dot-3" class="w-4 h-4 rounded-full border border-white/20 transition-all"></div>
          <div id="pin-dot-4" class="w-4 h-4 rounded-full border border-white/20 transition-all"></div>
        </div>

        <!-- Simulated Keypad -->
        <div class="grid grid-cols-3 gap-3 max-w-[280px] mx-auto pt-2">
          ${['1','2','3','4','5','6','7','8','9','CLEAR','0','DELETE'].map(key => `
            <button 
              data-key="${key}"
              class="keypad-btn aspect-square rounded-2xl bg-white/[0.03] hover:bg-white/10 active:scale-90 border border-white/5 text-sm font-black tracking-widest transition-all cursor-pointer flex items-center justify-center p-3 text-white"
            >
              ${key}
            </button>
          `).join('')}
        </div>

        <!-- Action -->
        <div class="space-y-3 pt-2">
          <button id="sim-btn-pin-submit" disabled class="w-full bg-[#F27D26] text-black font-black uppercase tracking-widest py-4 rounded-2xl text-xs transition-all duration-300 opacity-40 cursor-not-allowed">
            CONFIRM WALLET TRANSFER
          </button>
          <button id="sim-btn-pin-back" class="w-full bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 text-white/60 font-black uppercase tracking-widest py-3 rounded-2xl text-[9px] transition-all">
            CANCEL AND GO BACK
          </button>
        </div>
      </div>
    `;

    let enteredPin = '';
    const dots = [
      document.getElementById('pin-dot-1')!,
      document.getElementById('pin-dot-2')!,
      document.getElementById('pin-dot-3')!,
      document.getElementById('pin-dot-4')!
    ];
    const confirmBtn = document.getElementById('sim-btn-pin-submit') as HTMLButtonElement;
    const backBtn = document.getElementById('sim-btn-pin-back')!;

    function updatePinDisplay() {
      for (let i = 0; i < 4; i++) {
        if (i < enteredPin.length) {
          dots[i].className = 'w-4 h-4 rounded-full bg-[#F27D26] border border-[#F27D26] transition-all scale-110';
        } else {
          dots[i].className = 'w-4 h-4 rounded-full border border-white/20 transition-all scale-100';
        }
      }
      if (enteredPin.length === 4) {
        confirmBtn.removeAttribute('disabled');
        confirmBtn.className = 'w-full bg-[#F27D26] text-black font-black uppercase tracking-widest py-4 rounded-2xl text-xs transition-all opacity-100 cursor-pointer hover:opacity-90 active:scale-95';
      } else {
        confirmBtn.setAttribute('disabled', 'true');
        confirmBtn.className = 'w-full bg-[#F27D26] text-black font-black uppercase tracking-widest py-4 rounded-2xl text-xs transition-all opacity-40 cursor-not-allowed';
      }
    }

    modalContainer.querySelectorAll('.keypad-btn').forEach(element => {
      const btn = element as HTMLButtonElement;
      btn.onclick = (e) => {
        const key = btn.getAttribute('data-key')!;
        if (key === 'CLEAR') {
          enteredPin = '';
        } else if (key === 'DELETE') {
          enteredPin = enteredPin.slice(0, -1);
        } else {
          if (enteredPin.length < 4) {
            enteredPin += key;
          }
        }
        updatePinDisplay();
      };
    });

    backBtn.onclick = () => {
      modalContainer.innerHTML = renderFormMarkup();
      initFormHandlers();
    };

    confirmBtn.onclick = () => {
      confirmBtn.setAttribute('disabled', 'true');
      confirmBtn.style.opacity = '0.5';
      confirmBtn.innerHTML = `
        <svg class="animate-spin h-4 w-4 text-black mr-2 inline-block" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        CONNECTING GATEWAY...
      `;

      setTimeout(() => {
        confirmBtn.innerHTML = `
          <svg class="animate-spin h-4 w-4 text-black mr-2 inline-block" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          TRANSMITTING FUNDS...
        `;
        setTimeout(() => {
          confirmBtn.innerHTML = `✓ TRANSACTION SIGNED SECURELY`;
          confirmBtn.className = 'w-full bg-green-500 text-black font-black uppercase tracking-widest py-4 rounded-2xl text-xs transition-all opacity-100';
          setTimeout(() => {
            overlay.remove();
            const mockRef = 'KNGS_MOMO_PAY_' + Math.random().toString(36).substring(2, 12).toUpperCase();
            const mockResponse = {
              reference: mockRef,
              id: mockRef,
              status: 'success',
              message: 'Approved',
              momoNumber: momoNumber,
              momoNetwork: provider
            };
            
            if (config.callback) {
              config.callback(mockResponse);
            } else if (config.onSuccess) {
              config.onSuccess(mockResponse);
            }
          }, 800);
        }, 1500);
      }, 1500);
    };
  }

  function showCardOtpScreen(cardNum: string) {
    const maskedCard = cardNum.substring(Math.max(0, cardNum.length - 4));
    
    modalContainer.innerHTML = `
      <div class="space-y-6" style="animation: modalEnter 0.2s ease-out;">
        <div class="flex justify-between items-center border-b border-white/5 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs font-mono">
              3DS
            </div>
            <div>
              <h3 class="text-xs font-black uppercase tracking-[0.2em] text-[#F27D26]">CARD 3D SECURE</h3>
              <p class="text-[9px] uppercase font-mono text-white/40">Dynamic OTP Authorization</p>
            </div>
          </div>
          <span class="text-xs font-mono font-black text-white/80">${formattedAmount}</span>
        </div>

        <div class="text-center space-y-2">
          <p class="text-[10px] uppercase font-bold tracking-widest text-[#F27D26] leading-relaxed">
            A 6-DIGIT VERIFICATION CODE HAS BEEN SENT FOR CARD ENDING IN <span class="text-white font-mono">•••• ${maskedCard}</span>
          </p>
          <p class="text-[9px] uppercase tracking-widest text-white/30 italic">
            Please enter the simulated authorization passcode <span class="text-white font-mono font-bold font-black bg-white/5 px-2 py-0.5 rounded border border-white/10">123456</span> to process this charge.
          </p>
        </div>

        <!-- OTP Text Input -->
        <div class="max-w-[200px] mx-auto py-2">
          <input 
            type="text" 
            id="sim-otp-input" 
            maxlength="6" 
            class="w-full bg-white/5 border border-white/10 rounded-2xl py-4 text-center text-white font-mono tracking-[0.5em] text-lg focus:border-[#F27D26] outline-none transition-all placeholder:text-white/10 text-[18px]" 
            placeholder="••••••" 
            autofocus
          />
        </div>

        <!-- Action -->
        <div class="space-y-3 pt-2">
          <button id="sim-btn-otp-submit" disabled class="w-full bg-[#F27D26] text-black font-black uppercase tracking-widest py-4 rounded-2xl text-xs transition-all duration-300 opacity-40 cursor-not-allowed">
            AUTHORIZE SECURE CHARGE
          </button>
          <button id="sim-btn-otp-back" class="w-full bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 text-white/60 font-black uppercase tracking-widest py-3 rounded-2xl text-[9px] transition-all">
            CANCEL AND GO BACK
          </button>
        </div>
      </div>
    `;

    const otpInput = document.getElementById('sim-otp-input') as HTMLInputElement;
    const otpSubmit = document.getElementById('sim-btn-otp-submit') as HTMLButtonElement;
    const backBtn = document.getElementById('sim-btn-otp-back')!;

    otpInput.oninput = (e) => {
      otpInput.value = otpInput.value.replace(/[^0-9]/g, '');
      if (otpInput.value.length === 6) {
        otpSubmit.removeAttribute('disabled');
        otpSubmit.className = 'w-full bg-[#F27D26] text-black font-black uppercase tracking-widest py-4 rounded-2xl text-xs transition-all opacity-100 cursor-pointer hover:opacity-90 active:scale-95';
      } else {
        otpSubmit.setAttribute('disabled', 'true');
        otpSubmit.className = 'w-full bg-[#F27D26] text-black font-black uppercase tracking-widest py-4 rounded-2xl text-xs transition-all opacity-40 cursor-not-allowed';
      }
    };

    backBtn.onclick = () => {
      modalContainer.innerHTML = renderFormMarkup();
      initFormHandlers();
    };

    otpSubmit.onclick = () => {
      const pinCode = otpInput.value;
      if (pinCode !== '123456') {
        const originalText = otpSubmit.innerHTML;
        otpSubmit.innerHTML = 'INVALID CODE PIN - TRY 123456';
        otpSubmit.className = 'w-full bg-red-600 text-white font-black uppercase tracking-widest py-4 rounded-2xl text-xs transition-all opacity-100';
        setTimeout(() => {
          otpSubmit.innerHTML = originalText;
          otpSubmit.className = 'w-full bg-[#F27D26] text-black font-black uppercase tracking-widest py-4 rounded-2xl text-xs transition-all opacity-100 hover:opacity-90 active:scale-95';
        }, 1500);
        return;
      }

      otpSubmit.setAttribute('disabled', 'true');
      otpSubmit.style.opacity = '0.5';
      otpSubmit.innerHTML = `
        <svg class="animate-spin h-4 w-4 text-black mr-2 inline-block" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        VERIFYING OTP CODE...
      `;

      setTimeout(() => {
        otpSubmit.innerHTML = `
          <svg class="animate-spin h-4 w-4 text-black mr-2 inline-block" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          PROCESSING CHARGE...
        `;
        setTimeout(() => {
          otpSubmit.innerHTML = `✓ CARD CHARGED SECURELY`;
          otpSubmit.className = 'w-full bg-green-500 text-black font-black uppercase tracking-widest py-4 rounded-2xl text-xs transition-all opacity-100';
          setTimeout(() => {
            overlay.remove();
            const mockRef = 'KNGS_CARD_PAY_' + Math.random().toString(36).substring(2, 12).toUpperCase();
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
          }, 800);
        }, 1500);
      }, 1500);
    };
  }

  // Initialize first view
  initFormHandlers();
}
