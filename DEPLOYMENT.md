# Kings Clothing - Complete Deployment Guide 🚀

Follow this guide step-by-step to deploy your Kings Clothing website and start accepting real payments!

---

## 📋 Prerequisites
1. Your GitHub repository is ready (you've pushed your code)
2. You have a Paystack account
3. You have a Firebase project set up

---

## Step 1: Deploy to Netlify (Automated)

### 1.1 Connect to Netlify
- Go to [https://app.netlify.com](https://app.netlify.com)
- Sign up / log in
- Click "Add new site" → "Import an existing project"
- Connect to your GitHub account
- Select your `kingsclothing` repository

### 1.2 Configure Netlify Build Settings
Netlify should automatically detect your Vite setup, but double-check:
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Functions directory**: `netlify/functions`

---

## Step 2: Add Environment Variables to Netlify (CRITICAL!)

This is the most important step! Go to:
**Site settings → Environment variables**

Click "Add a variable" and add **all** these variables:

### Required Variables
| Variable Name | Value |
|---------------|-------|
| `VITE_PAYSTACK_PUBLIC_KEY` | (Your Paystack Public Key from .env) |
| `PAYSTACK_SECRET_KEY` | (Your Paystack Secret Key from .env) |

### Firebase Configuration Variables
Get these from your Firebase Console → Project Settings → General → Your apps → SDK setup and configuration (Config)
| Variable Name | Your Firebase Value |
|---------------|---------------------|
| `VITE_FIREBASE_API_KEY` | (from Firebase config) |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project-id.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `your-project-id` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `your-project-id.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | (from Firebase config) |
| `VITE_FIREBASE_APP_ID` | (from Firebase config) |

### Optional Variables (Notifications)
If you want SMS/email notifications, set these too:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

---

## Step 3: Configure Firebase Authorized Domains

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Authentication → Settings → Authorized domains**
4. Add your Netlify domain (e.g., `kingsclothing.netlify.app` or your custom domain)

---

## Step 4: Deploy!

1. Go back to Netlify → Deploys
2. Click "Trigger deploy" → "Deploy site"
3. Wait for the build to finish (usually 2-5 minutes)

---

## Step 5: Test Real Payments

Once deployed:
1. Visit your live site
2. Add an item to cart
3. Go through checkout with a small test amount (1 GHS)
4. Verify the payment goes through to your Paystack account

---

## 🎉 Congratulations!

Your Kings Clothing website is now live and accepting real payments! 🛍️
