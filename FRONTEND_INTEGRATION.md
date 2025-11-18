# Frontend Integration Guide

## Overview

The YieldShift frontend has been integrated with the backend API to support user authentication and subscription management.

## What's Been Added

### 1. Authentication with Clerk

**Installed Package:**
```bash
pnpm add @clerk/clerk-react
```

**Changes:**
- Added `ClerkProvider` wrapper in `src/App.tsx`
- Updated `Navbar.tsx` with Sign In/Sign Up buttons and user menu
- Created authentication-aware components

### 2. API Client Service

**File:** `src/services/api.ts`

A centralized API client that:
- Handles authenticated requests to the backend
- Automatically adds Clerk JWT tokens to requests
- Provides typed methods for all backend endpoints

**Key Methods:**
```typescript
apiClient.setTokenGetter(getToken);          // Set Clerk token
apiClient.getCurrentUser();                   // Get user profile
apiClient.createCheckoutSession(plan);        // Start Stripe checkout
apiClient.createPortalSession();              // Open billing portal
apiClient.getSubscriptionStatus();            // Get subscription details
apiClient.getWallets();                       // Get user wallets
apiClient.getRecommendations();               // Get AI recommendations
apiClient.executeRecommendation(id);          // Execute rebalance
```

### 3. TypeScript Types

**File:** `src/types/api.ts`

Complete TypeScript definitions for:
- User model
- Subscription model
- Wallet model
- Position model
- Recommendation model
- API response types

### 4. Account Settings Page

**File:** `src/pages/Account.tsx`
**Route:** `/account`

Features:
- Display current subscription tier with beautiful UI
- Show subscription status (active, trial, canceled)
- Display usage metrics (rebalances, wallets)
- List enabled features
- Upgrade buttons for free users
- "Manage Subscription" button (opens Stripe portal)
- Member since date

### 5. Pricing Page Integration

**Updated:** `src/pages/Pricing.tsx`

- Integrated Stripe checkout flow
- Sign-in requirement checks
- Loading states during checkout
- Error handling with toast notifications
- Institutional plan contact handling

### 6. Navigation Updates

**Updated:** `src/components/Navbar.tsx`

- Clerk UserButton for authenticated users
- Sign In / Sign Up buttons for guests
- Account Settings link in user menu
- Responsive design

### 7. Environment Variables

**Updated:** `.env` and `.env.example`

```bash
# Backend API
VITE_API_URL=http://localhost:3001

# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
```

## Setup Instructions

### 1. Get Clerk Credentials

1. Go to [clerk.com](https://clerk.com) and create an account
2. Create a new application
3. Enable **Email + Password** authentication (or Google OAuth)
4. Copy the **Publishable Key** from API Keys section
5. Add to `.env`:
   ```
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
   ```

### 2. Backend Setup

The backend must be running for authentication and subscriptions to work:

1. Follow `backend/README.md` to set up:
   - Supabase (database)
   - Clerk (authentication - use same account)
   - Stripe (payments)

2. Start the backend:
   ```bash
   cd backend
   npm run dev
   ```

3. Backend should run on `http://localhost:3001`

### 3. Start Frontend

```bash
pnpm dev
```

## Testing Authentication Flow

### Test Sign Up

1. Click "Sign Up" in navbar
2. Create account with email/password
3. Verify email (if required in Clerk settings)
4. Should redirect to dashboard
5. UserButton should appear in navbar

### Test Account Page

1. Sign in
2. Click UserButton → Account Settings
3. Should see:
   - User info with "Free" tier badge
   - No active subscription message
   - Upgrade buttons
   - Usage stats (0/0)
   - Feature list (mostly disabled)

### Test Upgrade Flow

1. Go to `/pricing` or click "Upgrade to Starter" on Account page
2. Click "Start Free Trial" on Starter plan
3. Should redirect to Stripe checkout
4. Use test card: `4242 4242 4242 4242`
5. After payment, Stripe webhook updates subscription
6. Return to Account page - should show:
   - "Starter" tier badge
   - Active subscription status
   - Usage: 0/4 rebalances
   - AI features enabled
   - "Manage Subscription" button

### Test Billing Portal

1. After subscribing, click "Manage Subscription"
2. Should open Stripe Customer Portal
3. Can update payment method, cancel subscription, view invoices

## How It Works

### Authentication Flow

```
User → Sign Up/In (Clerk) → JWT Token → API Client → Backend
                                            ↓
                                    Verified by Clerk
                                            ↓
                                    User record created
                                            ↓
                                    Response to frontend
```

### Subscription Flow

```
User → Pricing Page → Click Plan → API: createCheckoutSession()
                                            ↓
                                    Stripe Checkout URL
                                            ↓
                                    User pays on Stripe
                                            ↓
                        Webhook → Backend updates subscription
                                            ↓
                        User returns → Account page shows new tier
```

### API Request Flow

```typescript
// Any authenticated request:
const { getToken } = useAuth();

useEffect(() => {
  apiClient.setTokenGetter(getToken);
}, [getToken]);

// Now all API calls include JWT:
const data = await apiClient.getSubscriptionStatus();
// → GET /api/subscriptions/status
// → Headers: { Authorization: "Bearer <jwt>" }
```

## Feature Restrictions

Based on subscription tier, features are enabled/disabled:

| Feature | Free | Starter | Professional | Institutional |
|---------|------|---------|--------------|---------------|
| Browse yields | ✅ | ✅ | ✅ | ✅ |
| Manual swaps | ✅ | ✅ | ✅ | ✅ |
| AI recommendations | ❌ | ✅ | ✅ | ✅ |
| Auto-rebalancing | ❌ | 4/month | Unlimited | Unlimited |
| Wallets | 1 | 1 | 5 | Unlimited |
| Custom strategies | ❌ | ❌ | ✅ | ✅ |
| API access | ❌ | ❌ | ❌ | ✅ |

**Implementation:**

Backend enforces restrictions via middleware:
```typescript
router.get('/recommendations', requireAuth, requirePlan('starter'), ...);
router.post('/execute', requireAuth, checkRebalanceLimit, ...);
```

Frontend shows/hides features:
```typescript
{features.ai_recommendations ? (
  <AIRecommendations />
) : (
  <UpgradePrompt plan="starter" />
)}
```

## Upcoming Features

Once backend is deployed, you can:

1. **Connect Wallets** - Scan on-chain positions
2. **Get AI Recommendations** - See yield optimization suggestions
3. **Auto-Rebalance** - Execute swaps with one click (respecting tier limits)
4. **Track Portfolio** - Real-time position updates
5. **Custom Strategies** - Define your own rebalancing rules (Pro+)

## Troubleshooting

### "Network Error" on API calls

- Backend not running or wrong URL
- Check `VITE_API_URL` in `.env`
- Start backend: `cd backend && npm run dev`

### "Unauthorized" errors

- Clerk not configured correctly
- Check `CLERK_SECRET_KEY` in backend `.env` matches your Clerk account
- Verify frontend `VITE_CLERK_PUBLISHABLE_KEY` is correct

### Stripe checkout not working

- Backend Stripe keys not set
- Check `STRIPE_SECRET_KEY` and price IDs in backend `.env`
- Verify webhook endpoint is configured

### User menu not showing

- Clerk not initialized
- Check browser console for errors
- Verify `VITE_CLERK_PUBLISHABLE_KEY` is set

## File Structure

```
src/
├── services/
│   ├── api.ts              # API client with auth
│   ├── defillama.ts        # Yield data
│   └── sideshift.ts        # Swap execution
├── types/
│   └── api.ts              # TypeScript definitions
├── pages/
│   ├── Account.tsx         # ⭐ New: Subscription management
│   ├── Pricing.tsx         # Updated: Checkout integration
│   ├── Dashboard.tsx
│   ├── Portfolio.tsx
│   ├── Compare.tsx
│   └── ...
├── components/
│   ├── Navbar.tsx          # Updated: Auth UI
│   └── ui/
└── App.tsx                 # Updated: ClerkProvider
```

## Next Steps

1. ✅ Frontend integration complete
2. ⏳ Deploy backend to Railway/Render
3. ⏳ Configure production Clerk app
4. ⏳ Set up production Stripe
5. ⏳ Test end-to-end flow in production
6. ⏳ Implement AI recommendation generation
7. ⏳ Add wallet connection UI
8. ⏳ Build one-click rebalance feature

---

**Questions?** Check:
- [Clerk React Docs](https://clerk.com/docs/quickstarts/react)
- [Backend README](./backend/README.md)
- [Business Plan](./BUSINESS_PLAN.md)
