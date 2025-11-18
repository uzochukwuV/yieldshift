# AI-Powered Yield Optimization Features

## Overview

YieldShift now includes a complete AI-powered yield optimization system using LangChain, Groq LLM, and blockchain scanning APIs. The system automatically analyzes user portfolios, identifies better yield opportunities, and executes rebalancing with one click.

## Features Implemented

### 1. AI Recommendation Engine 🤖

**Location:** `backend/src/services/ai-recommendations.ts`

**What it does:**
- Fetches 1000+ yield opportunities from DefiLlama API
- Analyzes user's current DeFi positions
- Uses Groq's Mixtral-8x7b LLM (free, fast inference)
- Generates intelligent rebalancing recommendations
- Considers user risk tolerance (0-100 scale)
- Calculates APY improvements and estimated gains
- Falls back to rule-based recommendations if AI fails

**How it works:**
```typescript
// Generate recommendations for a user
const recommendations = await generateRecommendations(
  userId,
  riskTolerance // 0-100 (0=conservative, 100=aggressive)
);

// Returns:
[
  {
    from_pool_id: "aave-usdc",
    to_pool_id: "compound-usdc",
    asset: "USDC",
    current_apy: 3.5,
    target_apy: 5.2,
    net_gain: 170, // $170/year on $10K
    risk_score: 3, // Low risk
    reason: "Higher APY with similar risk profile"
  }
]
```

**AI Prompt Strategy:**
The system uses a detailed prompt that includes:
- User's risk tolerance level
- Current positions with APYs
- Top available yield opportunities
- Market context (gas fees, IL risk, TVL, protocol security)
- JSON output format specification

### 2. Wallet Scanning 🔍

**Location:** `backend/src/services/wallet-scanner.ts`

**What it does:**
- Scans wallet addresses on multiple chains
- Detects token balances (ERC20, native tokens)
- Identifies DeFi protocol positions
- Infers positions from token balances + yield data
- Supports multiple blockchain APIs

**Supported APIs:**
1. **Alchemy** (free tier) - Token balances
2. **DeBank** (optional) - Protocol positions
3. **Public RPCs** (fallback) - Direct blockchain calls
4. **DefiLlama** - Yield data correlation

**How to use:**
```typescript
// Scan a wallet on Ethereum
const { tokens, positions } = await scanWallet(
  walletId,
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "ethereum"
);

// tokens = [{ symbol: "USDC", balance: "1000", ... }]
// positions = [{ protocol: "Aave", asset: "USDC", apy: 3.5, ... }]
```

**Supported Chains:**
- Ethereum
- Polygon
- Arbitrum
- Avalanche

**Detected Tokens:**
- Native tokens (ETH, MATIC, AVAX)
- Popular stablecoins (USDC, USDT, DAI)
- DeFi tokens (AAVE, CRV, UNI, etc.)
- LP tokens (inferred from yield data)

### 3. Automated Rebalancing ⚡

**Location:** `backend/src/services/rebalancing.ts`

**What it does:**
- Executes recommendations via SideShift API
- Creates shift quotes for token swaps
- Monitors order status
- Calculates ROI and breakeven days
- Supports batch execution

**Execution Flow:**
```
1. User views recommendation: "Move USDC from Aave (3.5%) to Compound (5.2%)"
2. User clicks "Execute" and provides wallet address
3. System creates SideShift quote for USDC swap
4. SideShift returns deposit address
5. User sends USDC to deposit address
6. SideShift settles USDC to user's address
7. User deposits into Compound manually (or via smart contract)
```

**ROI Calculation:**
```typescript
const simulation = await simulateRebalance(recommendationId);
// Returns:
{
  estimated_cost: 50, // Gas fees
  estimated_gain_annual: 170, // $170/year
  estimated_gain_daily: 0.47, // $0.47/day
  breakeven_days: 107 // 107 days to recover costs
}
```

### 4. Frontend UI 🎨

**Location:** `src/pages/Recommendations.tsx`

**Features:**
- Beautiful card-based recommendations display
- Risk scoring with color indicators (Low/Medium/High)
- APY improvement arrows
- Estimated annual gains
- One-click execution
- Real-time status updates
- Generate new recommendations button

**User Flow:**
1. Navigate to `/recommendations`
2. Click "Generate New" to fetch AI recommendations
3. View recommendations sorted by net gain
4. Enter wallet address
5. Click "Execute" on any recommendation
6. Order created via SideShift
7. Status tracked in Orders page

## API Endpoints

### Recommendations

```http
# Generate AI recommendations
POST /api/recommendations/generate
Authorization: Bearer <clerk-jwt>

Response:
{
  "message": "Recommendations generated successfully",
  "count": 5,
  "recommendations": [...]
}
```

```http
# Get pending recommendations
GET /api/recommendations
Authorization: Bearer <clerk-jwt>

Response:
{
  "recommendations": [
    {
      "id": "...",
      "asset": "USDC",
      "current_apy": 3.5,
      "target_apy": 5.2,
      "net_gain": 170,
      "status": "pending"
    }
  ]
}
```

```http
# Execute a recommendation
POST /api/recommendations/:id/execute
Authorization: Bearer <clerk-jwt>
Content-Type: application/json

{
  "wallet_address": "0x..."
}

Response:
{
  "message": "Rebalance initiated successfully",
  "order": {
    "id": "shift-id",
    "depositAddress": "...",
    "settleAddress": "...",
    "status": "pending"
  }
}
```

```http
# Simulate a recommendation
POST /api/recommendations/:id/simulate
Authorization: Bearer <clerk-jwt>

Response:
{
  "estimated_cost": 50,
  "estimated_gain_annual": 170,
  "estimated_gain_daily": 0.47,
  "breakeven_days": 107
}
```

```http
# Batch execute (Professional+ only)
POST /api/recommendations/batch-execute
Authorization: Bearer <clerk-jwt>
Content-Type: application/json

{
  "recommendation_ids": ["id1", "id2", "id3"],
  "wallet_address": "0x..."
}
```

### Wallets

```http
# Connect wallet and scan
POST /api/wallets
Authorization: Bearer <clerk-jwt>
Content-Type: application/json

{
  "address": "0x...",
  "chain": "ethereum",
  "nickname": "Main Wallet"
}

Response:
{
  "wallet": { "id": "...", "address": "...", ... },
  "message": "Wallet connected. Scanning positions in background..."
}
```

```http
# Manually trigger wallet scan
POST /api/wallets/:id/scan
Authorization: Bearer <clerk-jwt>

Response:
{
  "tokens": [...],
  "positions": [...],
  "message": "Found 5 tokens and 3 positions"
}
```

```http
# Get wallet positions
GET /api/wallets/:id/positions
Authorization: Bearer <clerk-jwt>

Response:
{
  "positions": [
    {
      "protocol": "Aave",
      "asset": "USDC",
      "balance": "1000",
      "apy": 3.5,
      "tvl_usd": 1000000
    }
  ]
}
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
# Adds: langchain, @langchain/openai, @langchain/community, groq-sdk, axios
```

### 2. Get API Keys (All Free Tier)

#### Groq (Required for AI)
1. Sign up at https://console.groq.com
2. Create API key
3. Add to `.env`:
   ```
   GROQ_API_KEY=gsk_your_key_here
   ```

**Why Groq?**
- Free tier with generous limits
- Mixtral-8x7b model (high quality)
- Fast inference (< 1 second)
- OpenAI-compatible API

#### Alchemy (Optional, for better wallet scanning)
1. Sign up at https://www.alchemy.com
2. Create free app for Ethereum mainnet
3. Copy API key
4. Add to `.env`:
   ```
   ALCHEMY_API_KEY=your_alchemy_key
   ```

**Why Alchemy?**
- Free tier: 300M compute units/month
- Token balance API
- Multi-chain support
- Better than public RPCs

#### DeBank (Optional, for protocol positions)
1. Sign up at https://open.debank.com
2. Get API key
3. Add to `.env`:
   ```
   DEBANK_API_KEY=your_debank_key
   ```

**Why DeBank?**
- Detects DeFi protocol positions
- Supports 30+ protocols
- More accurate than inference

#### Public RPCs (Fallback, no key needed)
If no Alchemy key, system uses free public RPCs:
```
ETHEREUM_RPC_URL=https://eth.llamarpc.com
POLYGON_RPC_URL=https://polygon.llamarpc.com
ARBITRUM_RPC_URL=https://arbitrum.llamarpc.com
AVALANCHE_RPC_URL=https://api.avax.network/ext/bc/C/rpc
```

### 3. Environment Variables

Update `backend/.env`:

```bash
# AI/LLM (Required)
GROQ_API_KEY=gsk_...

# Blockchain APIs (Optional but recommended)
ALCHEMY_API_KEY=your_alchemy_key
DEBANK_API_KEY=your_debank_key

# Public RPCs (Fallback)
ETHEREUM_RPC_URL=https://eth.llamarpc.com
POLYGON_RPC_URL=https://polygon.llamarpc.com
ARBITRUM_RPC_URL=https://arbitrum.llamarpc.com
AVALANCHE_RPC_URL=https://api.avax.network/ext/bc/C/rpc

# SideShift (Already configured)
SIDESHIFT_API_KEY=your_key
SIDESHIFT_AFFILIATE_ID=your_id
```

### 4. Test Locally

```bash
# Start backend
cd backend
npm run dev

# In another terminal, start frontend
cd ..
pnpm dev

# Navigate to http://localhost:5173/recommendations
```

## Usage Examples

### Example 1: Generate Recommendations

1. Sign in to YieldShift
2. Go to `/recommendations`
3. Click "Generate New"
4. AI analyzes your portfolio and finds better yields
5. View recommendations sorted by potential gain

### Example 2: Execute Rebalancing

1. View recommendation: "USDC: 3.5% → 5.2% (+$170/year)"
2. Enter your wallet address
3. Click "Execute"
4. SideShift creates swap order
5. Send USDC to deposit address shown
6. Receive USDC at your address
7. Manually deposit into target protocol

### Example 3: Scan Wallet

1. Go to `/account` (or use API directly)
2. Click "Connect Wallet"
3. Enter address: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`
4. Select chain: Ethereum
5. System scans for tokens and positions
6. View positions in Account page
7. Generate recommendations based on positions

## Subscription Tier Restrictions

| Feature | Free | Starter | Professional | Institutional |
|---------|------|---------|--------------|---------------|
| View recommendations | ❌ | ✅ | ✅ | ✅ |
| Generate recommendations | ❌ | ✅ | ✅ | ✅ |
| Execute rebalancing | ❌ | 4/month | Unlimited | Unlimited |
| Batch execution | ❌ | ❌ | ✅ | ✅ |
| Wallet scanning | ✅ | ✅ | ✅ | ✅ |
| Simulations | ❌ | ✅ | ✅ | ✅ |

## AI Recommendation Quality

### What the AI Considers:

1. **APY Differential** - Only suggests moves with >2% improvement (conservative) or >1% (aggressive)
2. **Risk Factors**:
   - Impermanent loss risk
   - Protocol security (TVL, age, audits)
   - Yield sustainability (base APY vs reward APY)
3. **User Risk Tolerance** - Matches recommendations to user's risk profile
4. **Gas Costs** - Higher amounts = more worth rebalancing
5. **Asset Matching** - Prefers same-asset moves (USDC → USDC in different protocol)

### Recommendation Scoring:

**Risk Score (1-10):**
- 1-3: Low risk (established protocols, stable yields)
- 4-6: Medium risk (IL risk or lower TVL)
- 7-10: High risk (new protocols, high IL risk, volatile yields)

**Net Gain Calculation:**
```
Annual Gain = (Amount × APY Difference) / 100
Example: ($10,000 × 1.7%) / 100 = $170/year
```

### Fallback Logic:

If AI fails (API error, invalid response), system uses rule-based recommendations:
1. Find pools with same asset
2. Filter by risk tolerance
3. Require >2% APY improvement
4. Sort by APY difference
5. Return top 5

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Recommendations│  │  Account    │  │  Portfolio   │    │
│  │     Page     │  │    Page     │  │    Page      │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │              │
│         └─────────────────┴─────────────────┘              │
│                           │                                 │
│                      API Client                             │
│                           │                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                      Backend API                            │
│                           │                                 │
│  ┌────────────────────────┴────────────────────────┐       │
│  │            Express Routes                        │       │
│  │  /recommendations  /wallets  /subscriptions      │       │
│  └────┬──────────────────┬──────────────────┬──────┘       │
│       │                  │                  │               │
│  ┌────▼──────┐    ┌──────▼──────┐    ┌─────▼──────┐      │
│  │    AI     │    │   Wallet    │    │ Rebalancing│      │
│  │  Service  │    │  Scanner    │    │  Service   │      │
│  └────┬──────┘    └──────┬──────┘    └─────┬──────┘      │
│       │                  │                  │               │
└───────┼──────────────────┼──────────────────┼───────────────┘
        │                  │                  │
   ┌────▼────┐        ┌────▼────┐       ┌────▼────┐
   │  Groq   │        │ Alchemy │       │SideShift│
   │   LLM   │        │   API   │       │   API   │
   └─────────┘        └─────────┘       └─────────┘
        │                  │                  │
   ┌────▼────────────────────┴──────────────┐│
   │         DefiLlama Yields API            ││
   │      (1000+ yield opportunities)        ││
   └────────────────────────────────────────┘│
                                             │
                                    ┌────────▼────────┐
                                    │  Ethereum RPC   │
                                    │  Polygon RPC    │
                                    │  Arbitrum RPC   │
                                    └─────────────────┘
```

## Cost Analysis

### Free Tier Usage:

| Service | Free Tier Limit | Cost After | YieldShift Usage |
|---------|-----------------|------------|------------------|
| Groq | 14,400 req/day | $0.10/1M tokens | ~100 req/day |
| Alchemy | 300M CU/month | $49/month | ~10K req/month |
| DeBank | 100 req/day | Contact sales | ~50 req/day |
| DefiLlama | Unlimited | Free | ~1K req/day |
| Public RPCs | Rate limited | Free | Fallback |

**Estimated Monthly Cost:** $0 (all within free tiers)

## Performance

- **AI Generation Time:** 1-3 seconds
- **Wallet Scan Time:** 2-5 seconds
- **Recommendation Execution:** Instant (order created)
- **SideShift Settle Time:** 5-15 minutes

## Future Enhancements

1. **Auto-Rebalancing Scheduler** - Set it and forget it
2. **Smart Contract Integration** - Direct protocol deposits
3. **Multi-Wallet Optimization** - Rebalance across wallets
4. **Custom Strategies** - User-defined rules (e.g., "Always keep 50% in stables")
5. **Backtesting** - Show what gains user missed
6. **Notifications** - Alert when new high-yield opportunities appear
7. **Tax Optimization** - Consider capital gains in recommendations

## Troubleshooting

### "Failed to generate recommendations"
- Check `GROQ_API_KEY` is set correctly
- Verify Groq account has free tier credits
- Check backend logs for specific error
- Fallback should still work (rule-based)

### "No positions found" after wallet scan
- Wallet might have no DeFi positions
- Try adding `DEBANK_API_KEY` for better detection
- Manually add positions via frontend (future feature)

### "Rebalance execution failed"
- Check `SIDESHIFT_API_KEY` is valid
- Verify asset is supported by SideShift
- Check wallet address format
- See backend logs for SideShift error

### Alchemy API not working
- Check API key is correct
- Verify free tier limits not exceeded
- System will fallback to public RPCs

## Security Considerations

1. **API Keys** - Never commit to git, use `.env`
2. **Wallet Addresses** - Read-only scanning, never store private keys
3. **Non-Custodial** - YieldShift never holds user funds
4. **Rate Limiting** - Implement on production to prevent abuse
5. **Input Validation** - All user inputs sanitized
6. **HTTPS Only** - All API calls over secure connections

## Credits

- **LangChain** - AI orchestration framework
- **Groq** - Fast LLM inference
- **DefiLlama** - Yield data aggregation
- **Alchemy** - Blockchain infrastructure
- **SideShift** - Cross-chain swaps
- **DeBank** - Portfolio tracking

---

**Built with ❤️ for SideShift WaveHack 2025**
