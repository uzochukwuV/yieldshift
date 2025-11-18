# 🛠️ YieldShift Pro - Technical Implementation Guide

This guide provides step-by-step instructions and code examples for implementing the subscription-based YieldShift Pro platform.

---

## 📋 Table of Contents

1. [Backend Setup](#backend-setup)
2. [Authentication](#authentication)
3. [Subscription Management](#subscription-management)
4. [Wallet Integration](#wallet-integration)
5. [Portfolio Tracking](#portfolio-tracking)
6. [AI Recommendation Engine](#ai-recommendation-engine)
7. [Auto-Rebalancing](#auto-rebalancing)
8. [Deployment](#deployment)

---

## 🏗️ Backend Setup

### Option A: Node.js + Express + Supabase (Recommended for speed)

**1. Initialize project:**
```bash
mkdir yieldshift-backend
cd yieldshift-backend
npm init -y
npm install express cors dotenv @supabase/supabase-js stripe
npm install --save-dev typescript @types/express @types/node ts-node nodemon
```

**2. Project structure:**
```
yieldshift-backend/
├── src/
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── wallets.ts
│   │   ├── positions.ts
│   │   ├── subscriptions.ts
│   │   └── recommendations.ts
│   ├── services/
│   │   ├── ai.ts
│   │   ├── blockchain.ts
│   │   ├── sideshift.ts
│   │   └── defillama.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── subscription.ts
│   ├── types/
│   │   └── index.ts
│   └── index.ts
├── .env
├── package.json
└── tsconfig.json
```

**3. Setup Supabase:**
```typescript
// src/db.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database schema (run in Supabase SQL editor)
/*
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  clerk_id VARCHAR UNIQUE,
  subscription_tier VARCHAR DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Wallets
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  address VARCHAR NOT NULL,
  chain VARCHAR NOT NULL,
  label VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, address, chain)
);

-- Positions (current holdings)
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  protocol VARCHAR NOT NULL,
  token VARCHAR NOT NULL,
  amount DECIMAL NOT NULL,
  entry_apy DECIMAL,
  current_apy DECIMAL,
  tvl_usd DECIMAL,
  entered_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Recommendations
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  from_position_id UUID REFERENCES positions(id),
  to_protocol VARCHAR NOT NULL,
  to_token VARCHAR NOT NULL,
  expected_apy DECIMAL NOT NULL,
  expected_gain_annual DECIMAL,
  gas_cost_estimate DECIMAL,
  net_gain DECIMAL,
  status VARCHAR DEFAULT 'pending', -- pending, executed, expired
  created_at TIMESTAMP DEFAULT NOW(),
  executed_at TIMESTAMP
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  recommendation_id UUID REFERENCES recommendations(id),
  type VARCHAR NOT NULL, -- swap, stake, unstake, rebalance
  from_token VARCHAR,
  to_token VARCHAR,
  amount DECIMAL,
  tx_hash VARCHAR,
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR,
  stripe_subscription_id VARCHAR,
  plan VARCHAR NOT NULL, -- starter, professional, institutional
  status VARCHAR DEFAULT 'active',
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_positions_wallet_id ON positions(wallet_id);
CREATE INDEX idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
*/
```

---

## 🔐 Authentication with Clerk

**1. Install Clerk:**
```bash
npm install @clerk/clerk-sdk-node
```

**2. Setup Clerk middleware:**
```typescript
// src/middleware/auth.ts
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

export const requireAuth = ClerkExpressRequireAuth();

// Get user from Clerk
export async function getUserFromClerk(req: any) {
  const clerkUserId = req.auth.userId;

  // Find or create user in our database
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', clerkUserId)
    .single();

  if (error || !user) {
    // Create user
    const { data: newUser } = await supabase
      .from('users')
      .insert({
        clerk_id: clerkUserId,
        email: req.auth.sessionClaims.email,
        subscription_tier: 'free'
      })
      .select()
      .single();

    return newUser;
  }

  return user;
}
```

**3. Protected route example:**
```typescript
// src/routes/wallets.ts
import express from 'express';
import { requireAuth, getUserFromClerk } from '../middleware/auth';

const router = express.Router();

// GET /api/wallets - Get user's wallets
router.get('/', requireAuth, async (req, res) => {
  const user = await getUserFromClerk(req);

  const { data: wallets, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ wallets });
});

// POST /api/wallets - Connect new wallet
router.post('/', requireAuth, async (req, res) => {
  const user = await getUserFromClerk(req);
  const { address, chain, label } = req.body;

  // Verify wallet ownership (sign message)
  const isValid = await verifyWalletOwnership(address, req.body.signature);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { data: wallet, error } = await supabase
    .from('wallets')
    .insert({
      user_id: user.id,
      address,
      chain,
      label: label || `Wallet ${chain}`
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Start background sync of positions
  syncWalletPositions(wallet.id);

  res.json({ wallet });
});

export default router;
```

---

## 💳 Subscription Management with Stripe

**1. Install Stripe:**
```bash
npm install stripe
```

**2. Setup Stripe:**
```typescript
// src/services/stripe.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const PLANS = {
  starter: {
    name: 'Starter',
    price_id: process.env.STRIPE_STARTER_PRICE_ID!,
    price: 100,
    features: {
      max_rebalances_per_month: 4,
      max_wallets: 1,
      ai_recommendations: true,
      priority_support: true,
    }
  },
  professional: {
    name: 'Professional',
    price_id: process.env.STRIPE_PROFESSIONAL_PRICE_ID!,
    price: 500,
    features: {
      max_rebalances_per_month: -1, // unlimited
      max_wallets: 5,
      ai_recommendations: true,
      custom_strategies: true,
      api_access: true,
      priority_support: true,
    }
  },
  institutional: {
    name: 'Institutional',
    price_id: 'custom',
    price: 1000,
    features: {
      max_rebalances_per_month: -1,
      max_wallets: -1, // unlimited
      ai_recommendations: true,
      custom_strategies: true,
      api_access: true,
      multisig_support: true,
      dedicated_support: true,
    }
  }
};

// Create checkout session
export async function createCheckoutSession(
  userId: string,
  plan: 'starter' | 'professional',
  email: string
) {
  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: PLANS[plan].price_id,
        quantity: 1,
      },
    ],
    success_url: `${process.env.FRONTEND_URL}/dashboard?success=true`,
    cancel_url: `${process.env.FRONTEND_URL}/pricing?canceled=true`,
    metadata: {
      userId,
      plan,
    },
  });

  return session;
}

// Handle webhook events
export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleSuccessfulPayment(session);
      break;
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdate(subscription);
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionCancellation(subscription);
      break;
    }
  }
}

async function handleSuccessfulPayment(session: Stripe.Checkout.Session) {
  const { userId, plan } = session.metadata!;

  // Update user's subscription in database
  await supabase.from('subscriptions').insert({
    user_id: userId,
    stripe_customer_id: session.customer as string,
    stripe_subscription_id: session.subscription as string,
    plan,
    status: 'active',
    current_period_start: new Date(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  // Update user tier
  await supabase
    .from('users')
    .update({ subscription_tier: plan })
    .eq('id', userId);
}
```

**3. Subscription routes:**
```typescript
// src/routes/subscriptions.ts
import express from 'express';
import { requireAuth, getUserFromClerk } from '../middleware/auth';
import { createCheckoutSession, handleStripeWebhook } from '../services/stripe';

const router = express.Router();

// POST /api/subscriptions/checkout
router.post('/checkout', requireAuth, async (req, res) => {
  const user = await getUserFromClerk(req);
  const { plan } = req.body;

  if (!['starter', 'professional'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  const session = await createCheckoutSession(
    user.id,
    plan,
    user.email
  );

  res.json({ url: session.url });
});

// POST /api/subscriptions/webhook (Stripe webhook)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  await handleStripeWebhook(event);
  res.json({ received: true });
});

export default router;
```

**4. Subscription check middleware:**
```typescript
// src/middleware/subscription.ts
export function requirePlan(minPlan: 'starter' | 'professional' | 'institutional') {
  return async (req: any, res: any, next: any) => {
    const user = await getUserFromClerk(req);

    const planHierarchy = {
      free: 0,
      starter: 1,
      professional: 2,
      institutional: 3,
    };

    if (planHierarchy[user.subscription_tier] < planHierarchy[minPlan]) {
      return res.status(403).json({
        error: 'Upgrade required',
        required_plan: minPlan,
        current_plan: user.subscription_tier,
      });
    }

    next();
  };
}

// Usage in routes
router.post('/ai/recommend', requireAuth, requirePlan('starter'), async (req, res) => {
  // Only accessible to Starter+ users
});
```

---

## 👛 Wallet Integration with Web3Auth

**Frontend setup:**
```bash
npm install @web3auth/modal
```

```typescript
// src/lib/web3auth.ts
import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES } from "@web3auth/base";

export const web3auth = new Web3Auth({
  clientId: process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID!,
  chainConfig: {
    chainNamespace: CHAIN_NAMESPACES.EIP155,
    chainId: "0x1", // Ethereum mainnet
    rpcTarget: "https://rpc.ankr.com/eth",
  },
  web3AuthNetwork: "sapphire_mainnet",
});

// Initialize
export async function initWeb3Auth() {
  await web3auth.initModal();
}

// Login
export async function loginWithWeb3Auth() {
  const provider = await web3auth.connect();
  const accounts = await provider.request({ method: "eth_accounts" });
  return accounts[0];
}

// Sign message to prove ownership
export async function signMessage(message: string) {
  const provider = await web3auth.provider;
  const signature = await provider.request({
    method: "personal_sign",
    params: [message, provider.accounts[0]],
  });
  return signature;
}
```

**Connect wallet flow:**
```typescript
// Frontend component
async function handleConnectWallet() {
  // 1. Login with Web3Auth
  const address = await loginWithWeb3Auth();

  // 2. Sign message to prove ownership
  const message = `YieldShift wallet verification: ${Date.now()}`;
  const signature = await signMessage(message);

  // 3. Send to backend
  const response = await fetch('/api/wallets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${clerkToken}`,
    },
    body: JSON.stringify({
      address,
      chain: 'ethereum',
      signature,
      message,
    }),
  });

  if (response.ok) {
    toast.success('Wallet connected!');
    // Start syncing positions
  }
}
```

---

## 📊 Portfolio Tracking

**1. Sync wallet positions (background job):**
```typescript
// src/services/blockchain.ts
import { ethers } from 'ethers';

// Detect staked positions
export async function scanWalletForYields(address: string, chain: string) {
  const positions = [];

  // Check Lido stETH
  const stETHBalance = await getStETHBalance(address);
  if (stETHBalance > 0) {
    positions.push({
      protocol: 'Lido',
      token: 'stETH',
      amount: stETHBalance,
      current_apy: await getLidoAPY(),
    });
  }

  // Check RocketPool rETH
  const rETHBalance = await getRETHBalance(address);
  if (rETHBalance > 0) {
    positions.push({
      protocol: 'RocketPool',
      token: 'rETH',
      amount: rETHBalance,
      current_apy: await getRocketPoolAPY(),
    });
  }

  // Check Aave deposits
  const aavePositions = await getAavePositions(address);
  positions.push(...aavePositions);

  return positions;
}

// Background job (runs every hour)
export async function syncWalletPositions(wallet_id: string) {
  const { data: wallet } = await supabase
    .from('wallets')
    .select('*')
    .eq('id', wallet_id)
    .single();

  const positions = await scanWalletForYields(wallet.address, wallet.chain);

  // Update database
  for (const pos of positions) {
    await supabase.from('positions').upsert({
      wallet_id,
      protocol: pos.protocol,
      token: pos.token,
      amount: pos.amount,
      current_apy: pos.current_apy,
      updated_at: new Date(),
    });
  }
}
```

**2. Schedule background jobs:**
```bash
npm install node-cron
```

```typescript
// src/jobs/sync-positions.ts
import cron from 'node-cron';

// Run every hour
cron.schedule('0 * * * *', async () => {
  console.log('Starting position sync...');

  const { data: wallets } = await supabase
    .from('wallets')
    .select('id');

  for (const wallet of wallets || []) {
    await syncWalletPositions(wallet.id);
  }

  console.log('Position sync complete');
});
```

---

## 🤖 AI Recommendation Engine

```typescript
// src/services/ai.ts
import { supabase } from '../db';
import { getSupportedYieldTokens } from './defillama';

export async function generateRecommendations(user_id: string) {
  // 1. Get user's current positions
  const { data: positions } = await supabase
    .from('positions')
    .select(`
      *,
      wallet:wallets(*)
    `)
    .eq('wallet.user_id', user_id);

  if (!positions || positions.length === 0) {
    return [];
  }

  // 2. Get all available yields
  const allYields = await getSupportedYieldTokens([]);

  // 3. Get user's risk tolerance
  const { data: user } = await supabase
    .from('users')
    .select('risk_tolerance, subscription_tier')
    .eq('id', user_id)
    .single();

  const maxRiskScore = user?.risk_tolerance || 50;

  const recommendations = [];

  // 4. For each position, find better alternatives
  for (const position of positions) {
    const betterYields = allYields.filter((y) => {
      // Same token type
      if (y.ssId !== position.token.toLowerCase()) return false;

      // Higher APY (at least 2% better)
      if (y.totalApy <= position.current_apy + 2) return false;

      // Risk check
      const riskScore = calculateRiskScore(y);
      if (riskScore > maxRiskScore) return false;

      // TVL check
      if (y.tvlUsd < 50_000_000) return false;

      return true;
    });

    // Sort by net gain
    for (const better of betterYields) {
      const annualGain = calculateAnnualGain(
        position.amount,
        better.totalApy - position.current_apy
      );
      const gasCost = await estimateRebalancingCost(position, better);
      const netGain = annualGain - gasCost;

      // Only recommend if profitable
      if (netGain > gasCost * 1.5) {
        recommendations.push({
          user_id,
          from_position_id: position.id,
          to_protocol: better.project,
          to_token: better.symbol,
          expected_apy: better.totalApy,
          expected_gain_annual: annualGain,
          gas_cost_estimate: gasCost,
          net_gain: netGain,
          confidence: 'high',
        });
      }
    }
  }

  // 5. Save to database
  if (recommendations.length > 0) {
    await supabase.from('recommendations').insert(recommendations);
  }

  return recommendations.sort((a, b) => b.net_gain - a.net_gain);
}

function calculateRiskScore(yield: any): number {
  let score = 0;

  // IL risk
  if (yield.ilRisk === 'yes') score += 30;

  // TVL check
  if (yield.tvlUsd < 100_000_000) score += 20;
  else if (yield.tvlUsd < 500_000_000) score += 10;

  // Protocol age (assume newer = riskier)
  // ... add more risk factors

  return Math.min(score, 100);
}

function calculateAnnualGain(amount: number, apyDelta: number): number {
  return (amount * apyDelta) / 100;
}

async function estimateRebalancingCost(from: any, to: any): Promise<number> {
  // Estimate gas for: unstake + swap + approve + stake
  const avgGasPrice = 30; // gwei
  const totalGas = 500_000; // gas units

  const costInEth = (avgGasPrice * totalGas) / 1e9;
  const ethPrice = 3000; // TODO: fetch real price
  return costInEth * ethPrice;
}
```

---

## ⚡ Auto-Rebalancing

```typescript
// src/services/rebalancing.ts
export async function executeRebalance(recommendation_id: string) {
  const { data: rec } = await supabase
    .from('recommendations')
    .select(`
      *,
      from_position:positions(*)
    `)
    .eq('id', recommendation_id)
    .single();

  // 1. Unstake from current position
  const unstakeTx = await generateUnstakeTx(rec.from_position);

  // 2. Swap via SideShift
  const quote = await createQuote({
    depositCoin: rec.from_position.token,
    depositNetwork: rec.from_position.chain,
    settleCoin: rec.to_token,
    settleNetwork: 'ethereum', // TODO: dynamic
    depositAmount: rec.from_position.amount.toString(),
  });

  const order = await createOrder({
    quoteId: quote.id,
    settleAddress: rec.from_position.wallet.address,
  });

  // 3. Wait for swap to complete (webhook or polling)
  await waitForSwapCompletion(order.id);

  // 4. Stake in new position
  const stakeTx = await generateStakeTx(rec.to_protocol, rec.to_token);

  // 5. Update database
  await supabase.from('recommendations').update({
    status: 'executed',
    executed_at: new Date(),
  }).eq('id', recommendation_id);

  await supabase.from('positions').update({
    protocol: rec.to_protocol,
    token: rec.to_token,
    current_apy: rec.expected_apy,
  }).eq('id', rec.from_position.id);

  return { success: true };
}
```

---

## 🚀 Deployment

### Frontend (Vercel)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Backend (Railway)
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### Environment Variables
```bash
# Backend .env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
CLERK_SECRET_KEY=sk_live_xxx
WEB3AUTH_CLIENT_ID=xxx
FRONTEND_URL=https://yieldshift.com
```

---

## 📊 Monitoring & Analytics

**Setup PostHog for analytics:**
```bash
npm install posthog-js
```

```typescript
// Track key events
posthog.capture('wallet_connected', { chain: 'ethereum' });
posthog.capture('rebalance_executed', { net_gain: 127 });
posthog.capture('subscription_upgraded', { from: 'starter', to: 'professional' });
```

---

**You now have a complete blueprint to build YieldShift Pro! 🎉**

Next steps:
1. Set up Supabase database
2. Implement Clerk authentication
3. Integrate Stripe subscriptions
4. Build AI recommendation engine
5. Launch MVP to waitlist

**Let's revolutionize DeFi yield management!**
