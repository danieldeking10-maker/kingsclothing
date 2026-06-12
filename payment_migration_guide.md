# Kings Clothing - Paystack Payment Migration Guide

## Summary
Migrating from old Paystack payment integration to the new public key: `pk_live_d894983d4fc4381d5bfd95e0e1db5b800df57f95`

## Files Requiring Updates

### 1. **CartDrawer.tsx** - Payment Initialization
**Current Issue (Line 15):**
```typescript
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_d894983d4fc4381d5bfd95e0e1db5b800df57f95';
```
✅ **Status:** Already contains the new key as fallback

### 2. **paystackMock.ts** - Mock Gateway
**Current Issue (Line 8):**
```typescript
const rawKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_live_d894983d4fc4381d5bfd95e0e1db5b800df57f95';
```
✅ **Status:** Already contains the new key as fallback

### 3. **index.html** - Paystack CDN Script
**Current Issue (Line 8):**
```html
<script src="https://js.paystack.co/v1/inline.js"></script>
```
✅ **Status:** Dynamically loads Paystack - no changes needed

### 4. **server.ts** - Backend Configuration
**Current Issue (Lines 394-458):**
- Server uses `PAYSTACK_SECRET_KEY` environment variable
- Fallback to simulation mode when secret key is missing

✅ **Status:** Already handles gracefully with fallback

## Known Issues to Address

### Issue 1: Hardcoded Key in Mock Payment (Potential Security Risk)
**Location:** `src/lib/paystackMock.ts` Line 8
**Problem:** Public key is hardcoded as fallback
**Risk:** Low - it's a public key, but still should be environment variable
**Solution:** Ensure `.env` file has `VITE_PAYSTACK_PUBLIC_KEY` set

### Issue 2: Missing Environment Variables
**Problem:** If `.env` file is missing required keys:
```
VITE_PAYSTACK_PUBLIC_KEY=pk_live_d894983d4fc4381d5bfd95e0e1db5b800df57f95
PAYSTACK_SECRET_KEY=your_secret_key_here
```
**Solution:** See Environment Setup section

### Issue 3: Frontend-Backend Key Synchronization
**Problem:** Public key in CartDrawer.tsx and paystackMock.ts must match
**Current State:** ✅ Both use same fallback key

## Environment Setup

### `.env` File Configuration
```bash
# Paystack Payment Configuration
VITE_PAYSTACK_PUBLIC_KEY=pk_live_d894983d4fc4381d5bfd95e0e1db5b800df57f95
PAYSTACK_SECRET_KEY=sk_live_your_actual_secret_key_here

# Email Configuration (for order notifications)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_email@domain.com
SMTP_PASS=your_email_password
SMTP_FROM=noreply@kingsclothing.brand

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# AI Configuration
GEMINI_API_KEY=your_gemini_api_key
```

## Payment Flow Verification

### Frontend Payment Flow (CartDrawer.tsx)
1. ✅ Initializes with correct public key
2. ✅ Calls `/api/paystack/initialize` with metadata
3. ✅ Validates callback response via `logPaystackCallback`
4. ✅ Verifies on backend via `/api/paystack/verify`
5. ✅ Creates order record on success

### Backend Payment Flow (server.ts)
1. ✅ `/api/paystack/initialize` - Initializes Paystack transaction
2. ✅ `/api/paystack/verify` - Verifies transaction with secret key
3. ✅ Fallback to simulation mode if secret key missing

## Critical Issues & Fixes Required

### 🔴 ISSUE 1: Payment Verification Vulnerability
**Location:** `server.ts` Lines 461-485
**Problem:** Reference validation is too permissive
```typescript
if (!isRealSecretKey || secretKey === "your_paystack_secret_key" || 
    reference.startsWith("KNGS_") || 
    reference.includes("sim_access_code_") || 
    reference.startsWith("sim_")) {
  // Returns success for ANY of these conditions
  return res.json({ status: true, message: "Verification successful (Simulation mode)" });
}
```
**Fix Needed:** 
- Remove overly permissive reference checks
- Require valid secret key for production
- Log attempts to bypass verification

### 🟡 ISSUE 2: Missing SSL/TLS Certificate Validation
**Location:** `server.ts` Lines 420-440
**Problem:** fetch() to Paystack API may not validate certificates in certain environments
**Fix Needed:**
```typescript
// Add proper error handling and certificate validation
const response = await fetch("https://api.paystack.co/transaction/initialize", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${secretKey}`,
    "Content-Type": "application/json"
  },
  // Ensure Node.js environment validates certificates
});
```

### 🟡 ISSUE 3: Response Validation Too Lenient
**Location:** `CartDrawer.tsx` Lines 230-249
**Problem:** Simulation and live mode responses not strictly validated
```typescript
// Current: accepts both simulation and live responses without strict validation
if (isSimulation) {
  await handlePaymentSuccess(response);
} else {
  // Verify logic here, but might miss edge cases
}
```

### 🔴 ISSUE 4: Order Creation Race Condition
**Location:** `CartDrawer.tsx` Lines 162-194
**Problem:** Order created before final backend verification
**Risk:** Payment could fail after order is created
**Fix Needed:** Move order creation to after `/api/paystack/verify` succeeds

## Recommended Action Plan

### Phase 1: Configuration (Immediate)
- [ ] Set `VITE_PAYSTACK_PUBLIC_KEY=pk_live_d894983d4fc4381d5bfd95e0e1db5b800df57f95` in `.env`
- [ ] Set valid `PAYSTACK_SECRET_KEY` in `.env`
- [ ] Test with sandbox account first

### Phase 2: Security Hardening (Important)
- [ ] Remove overly permissive reference checks in `server.ts`
- [ ] Implement strict verification response validation
- [ ] Add request signing/validation tokens
- [ ] Add rate limiting to payment endpoints
- [ ] Add logging for payment verification attempts

### Phase 3: Flow Optimization (Recommended)
- [ ] Move order creation to after backend verification
- [ ] Add idempotency keys to prevent duplicate orders
- [ ] Implement payment status polling on frontend

## Testing Checklist

- [ ] Test with Paystack Test/Sandbox Key
- [ ] Test Mobile Money flow in CartDrawer
- [ ] Test Card payment flow in CartDrawer
- [ ] Verify order created only after payment success
- [ ] Verify email notifications send on success
- [ ] Verify SMS notifications send on success
- [ ] Test failure scenarios (declined payment)
- [ ] Test payment verification with backend
- [ ] Verify logs capture all payment events

## Rollback Plan

If issues occur after migration:
1. Revert to old public key in `.env`
2. Keep old `PAYSTACK_SECRET_KEY` in `.env`
3. Restart server: `npm run dev`

## Support

For issues with payment processing:
1. Check browser console for frontend errors
2. Check server logs for backend errors
3. Verify Paystack account status and balance
4. Verify environment variables are set correctly
5. Check Paystack dashboard for transaction logs
