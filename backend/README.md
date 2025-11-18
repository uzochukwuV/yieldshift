# YieldShift Pro Backend API

Backend server for YieldShift Pro subscription-based DeFi yield management platform.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Supabase account (free tier works)
- Clerk account (for authentication)
- Stripe account (for payments)

### Installation

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your credentials (see setup sections below).

### Development

```bash
npm run dev
```

Server runs on `http://localhost:3001`

### Production Build

```bash
npm run build
npm start
```

---

## 📋 Setup Guide

### 1. Supabase Setup

**a) Create Supabase Project:**
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Wait for database to provision (~2 minutes)

**b) Get Credentials:**
1. Go to Settings → API
2. Copy `Project URL` → Add to `.env` as `SUPABASE_URL`
3. Copy `service_role` key → Add to `.env` as `SUPABASE_SERVICE_KEY`

**c) Run Database Schema:**
1. Go to SQL Editor in Supabase dashboard
2. Click "New Query"
3. Copy entire `supabase-schema.sql` file
4. Paste and click "Run"
5. ✅ Should see "Success. No rows returned"

---

### 2. Clerk Setup (Authentication)

**a) Create Clerk Account:**
1. Go to [clerk.com](https://clerk.com)
2. Create new application
3. Choose "Email + Password" or "Google OAuth" (or both)

**b) Get API Keys:**
1. Go to API Keys
2. Copy `Publishable Key` → Add to frontend `.env` as `VITE_CLERK_PUBLISHABLE_KEY`
3. Copy `Secret Key` → Add to backend `.env` as `CLERK_SECRET_KEY`

**c) Configure Settings:**
1. Go to User & Authentication → Email, Phone, Username
2. Enable **Email** as identifier
3. Go to Sessions → Configure session lifetime (default: 7 days)

---

### 3. Stripe Setup (Payments)

**a) Create Stripe Account:**
1. Go to [stripe.com](https://stripe.com)
2. Activate your account
3. Switch to **Test Mode** (toggle in top right)

**b) Get API Keys:**
1. Go to Developers → API Keys
2. Copy `Publishable Key` → Add to frontend `.env` as `VITE_STRIPE_PUBLISHABLE_KEY`
3. Copy `Secret Key` → Add to backend `.env` as `STRIPE_SECRET_KEY`

**c) Create Products:**

1. Go to Products → Add Product

**Starter Plan:**
- Name: `YieldShift Starter`
- Description: `AI yield optimization with 4 rebalances/month`
- Pricing: `$100/month` (recurring)
- Copy Price ID → Add to `.env` as `STRIPE_STARTER_PRICE_ID`

**Professional Plan:**
- Name: `YieldShift Professional`
- Description: `Unlimited rebalancing + advanced features`
- Pricing: `$500/month` (recurring)
- Copy Price ID → Add to `.env` as `STRIPE_PROFESSIONAL_PRICE_ID`

**d) Setup Webhook:**

1. Go to Developers → Webhooks → Add Endpoint
2. Endpoint URL: `https://your-backend-url.com/api/subscriptions/webhook`
3. Events to send:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy `Signing Secret` → Add to `.env` as `STRIPE_WEBHOOK_SECRET`

---

## 🌐 Deployment

### Option A: Railway (Recommended - Easiest)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add environment variables
railway variables set SUPABASE_URL=...
railway variables set SUPABASE_SERVICE_KEY=...
railway variables set CLERK_SECRET_KEY=...
railway variables set STRIPE_SECRET_KEY=...
railway variables set STRIPE_WEBHOOK_SECRET=...
railway variables set STRIPE_STARTER_PRICE_ID=...
railway variables set STRIPE_PROFESSIONAL_PRICE_ID=...
railway variables set FRONTEND_URL=https://yieldshift.vercel.app
railway variables set NODE_ENV=production

# Deploy
railway up
```

Your API will be live at `https://your-project.railway.app`

### Option B: Render

1. Go to [render.com](https://render.com)
2. New → Web Service
3. Connect GitHub repo
4. Build Command: `cd backend && npm install && npm run build`
5. Start Command: `cd backend && npm start`
6. Add Environment Variables (same as above)
7. Deploy

### Option C: Vercel (Serverless)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Add environment variables in Vercel dashboard.

---

## 📡 API Endpoints

### Authentication

```
GET  /api/auth/me               # Get current user
```

### Subscriptions

```
POST /api/subscriptions/checkout    # Create Stripe checkout session
POST /api/subscriptions/portal      # Create customer portal session
GET  /api/subscriptions/status      # Get subscription status
POST /api/subscriptions/webhook     # Stripe webhook (called by Stripe)
```

### Wallets

```
GET  /api/wallets                   # Get user's wallets
POST /api/wallets                   # Connect new wallet
```

### Positions

```
GET  /api/positions                 # Get all user positions
```

### Recommendations

```
GET  /api/recommendations           # Get AI recommendations (Starter+)
POST /api/recommendations/generate  # Generate new recommendations (Starter+)
POST /api/recommendations/:id/execute # Execute rebalance (with limits)
```

---

## 🔐 Environment Variables

```bash
# Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...

# Authentication
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...

# Payments
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PROFESSIONAL_PRICE_ID=price_...

# Application
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://yieldshift.com
```

---

## 🧪 Testing

### Test Stripe Webhooks Locally

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe
# or
scoop install stripe

# Login
stripe login

# Forward webhooks to localhost
stripe listen --forward-to localhost:3001/api/subscriptions/webhook

# In another terminal, trigger test events
stripe trigger checkout.session.completed
```

### Test API Endpoints

```bash
# Get health check
curl http://localhost:3001/health

# Test authentication (need Clerk token)
curl -H "Authorization: Bearer <clerk-token>" \
  http://localhost:3001/api/auth/me
```

---

## 📊 Monitoring

### Railway

- Built-in metrics dashboard
- View logs: `railway logs`
- View deployments: `railway status`

### Error Tracking (Optional)

Add Sentry for production error tracking:

```bash
npm install @sentry/node

# Add to src/index.ts
import * as Sentry from "@sentry/node";
Sentry.init({ dsn: "your-sentry-dsn" });
```

---

## 🔄 Background Jobs

Position sync job runs every hour (configured in `src/jobs/sync-positions.ts`).

To run manually:
```typescript
import { syncWalletPositions } from './jobs/sync-positions';
syncWalletPositions(walletId, address, chain);
```

---

## 🐛 Troubleshooting

**Issue: Stripe webhook failing**
- Check webhook signing secret matches
- Verify endpoint URL is correct and accessible
- Check Stripe dashboard → Developers → Webhooks → Event Logs

**Issue: Clerk authentication failing**
- Verify `CLERK_SECRET_KEY` is correct
- Check Clerk dashboard → Sessions for active sessions
- Verify frontend is sending token in Authorization header

**Issue: Database connection failing**
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
- Check Supabase project is active (not paused)
- Run `supabase-schema.sql` if tables don't exist

**Issue: CORS errors**
- Update `FRONTEND_URL` in `.env`
- Verify CORS settings in `src/index.ts`

---

## 📝 Next Steps

1. ✅ Deploy backend to Railway
2. ✅ Update frontend `.env` with backend URL
3. ✅ Configure Stripe webhook with deployed URL
4. ✅ Test checkout flow end-to-end
5. ⏳ Implement AI recommendation engine
6. ⏳ Implement wallet position scanning
7. ⏳ Add automated rebalancing logic

---

## 🤝 Support

Need help? Check:
- [Supabase Docs](https://supabase.com/docs)
- [Clerk Docs](https://clerk.com/docs)
- [Stripe Docs](https://stripe.com/docs/api)
- [Implementation Guide](../IMPLEMENTATION_GUIDE.md)

---

**Built with ❤️ for SideShift WaveHack 2025**
