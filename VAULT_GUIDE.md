# YieldShift Vault - Complete Guide

## Overview

The YieldShift Vault is an **ERC-4626 compliant smart contract** deployed on **Base chain** that makes DeFi yields accessible to Web2 users. Users simply deposit USDC and automatically earn ~4.5% APY without needing to understand protocols, strategies, or manual rebalancing.

## Why a Vault?

### Problem
- DeFi is complex for Web2 users
- Manual yield farming requires constant monitoring
- Gas fees on Ethereum are prohibitively expensive
- Users need to understand multiple protocols

### Solution
The YieldShift Vault:
1. **One-click deposits** - Just deposit USDC, get vault shares (ysUSDC)
2. **Auto-yield** - Funds automatically deployed to Aave V3
3. **Low fees** - Base chain gas fees ~$0.01 per transaction
4. **Non-custodial** - You always control your funds
5. **Withdraw anytime** - No lock-up periods

## How It Works

```
User deposits 1000 USDC
        ↓
YieldShiftVault (receives USDC, mints ysUSDC shares)
        ↓
AaveV3Strategy (deploys USDC to Aave)
        ↓
Aave V3 Pool (lends USDC, earns 4.5% APY)
        ↓
Interest accrues automatically
        ↓
Vault share price increases
        ↓
User withdraws: principal + yield
```

## Smart Contract Architecture

### YieldShiftVault.sol

Main vault contract (ERC-4626 standard).

**Key Features:**
- ✅ Accepts USDC deposits
- ✅ Mints vault shares (ysUSDC) proportional to deposit
- ✅ Tracks individual user deposits and yields
- ✅ Deploys funds across multiple strategies
- ✅ Harvests profits and compounds
- ✅ Charges 2% management fee + 20% performance fee
- ✅ Emergency withdraw capability

**User-Facing Functions:**
```solidity
// Deposit USDC, receive vault shares
function deposit(uint256 assets, address receiver) returns (uint256 shares)

// Redeem shares for USDC
function redeem(uint256 shares, address receiver, address owner) returns (uint256 assets)

// Get user's deposited amount (principal only)
function getUserDeposits(address user) returns (uint256)

// Get user's current balance (principal + yield)
function getUserBalance(address user) returns (uint256)

// Get user's earned yield
function getUserYield(address user) returns (uint256)
```

**Admin Functions:**
```solidity
// Add a new yield strategy
function addStrategy(address strategy)

// Deploy idle funds to strategies
function deployFunds(uint256[] amounts)

// Harvest profits from all strategies
function harvest()
```

### AaveV3Strategy.sol

Yield strategy that deposits into Aave V3 on Base.

**Features:**
- ✅ Deposits USDC into Aave lending pool
- ✅ Receives aUSDC (interest-bearing token)
- ✅ aUSDC value increases over time = yield
- ✅ Can withdraw anytime
- ✅ Harvests accrued interest

**Functions:**
```solidity
function deposit(uint256 amount) // Deposit USDC into Aave
function withdraw(uint256 amount) // Withdraw USDC from Aave
function harvest() // Harvest and send profits to vault
function totalAssets() returns (uint256) // Get total assets in strategy
```

## Deployment Instructions

### Prerequisites

1. Install Hardhat dependencies:
```bash
cd contracts
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env`:
```env
DEPLOYER_PRIVATE_KEY=your_private_key_here
BASESCAN_API_KEY=your_basescan_api_key
```

3. Get Base testnet ETH:
- Visit: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- Or bridge from Ethereum Sepolia

### Deploy to Base Sepolia (Testnet)

```bash
npm run deploy:base-testnet
```

Output:
```
✅ YieldShiftVault deployed to: 0x...
✅ AaveV3Strategy deployed to: 0x...
✅ Strategy added to vault
```

### Deploy to Base Mainnet

```bash
npm run deploy:base
```

**Warning:** Requires real ETH on Base for gas!

### Verify Contracts

After deployment:
```bash
npx hardhat verify --network base VAULT_ADDRESS "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" "YieldShift USDC Vault" "ysUSDC" "YOUR_FEE_RECIPIENT"

npx hardhat verify --network base STRATEGY_ADDRESS "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" "0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB" "VAULT_ADDRESS"
```

## Backend Integration

### Setup

1. Update environment variables:
```env
VAULT_CONTRACT_ADDRESS=0x... # Your deployed vault address
BASE_RPC_URL=https://mainnet.base.org
```

2. Database migration:
```sql
-- Already in backend/supabase-schema.sql
CREATE TABLE vault_deposits (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  tx_hash VARCHAR UNIQUE,
  amount DECIMAL,
  shares DECIMAL,
  status VARCHAR,
  chain VARCHAR DEFAULT 'base',
  created_at TIMESTAMP
);
```

3. Start backend:
```bash
cd backend
npm run dev
```

### API Endpoints

```http
# Get global vault statistics
GET /api/vault/stats

Response:
{
  "totalAssets": "123456.78",
  "totalShares": "120000.00",
  "totalDeposited": "120000.00",
  "totalYieldEarned": "3456.78",
  "sharePrice": "1.0288",
  "vaultAddress": "0x..."
}
```

```http
# Get user's vault position
GET /api/vault/user/:address

Response:
{
  "address": "0x...",
  "shares": "1000.0",
  "deposited": "1000.00",
  "currentBalance": "1028.80",
  "yieldEarned": "28.80",
  "estimatedAPY": 4.5
}
```

```http
# Track a deposit (authenticated)
POST /api/vault/track-deposit
Authorization: Bearer <clerk-jwt>

{
  "tx_hash": "0x...",
  "amount": "1000.00",
  "shares": "1000.0"
}
```

## Frontend Usage

### Navigate to Vault Page

1. Start frontend:
```bash
pnpm dev
```

2. Navigate to: `http://localhost:5173/vault`

### User Flow

1. **Connect Wallet**
   - Click "Connect Wallet" button
   - (Currently demo mode - enter address manually)
   - TODO: Integrate wagmi for actual wallet connection

2. **View Vault Stats**
   - See Total Value Locked (TVL)
   - Current APY
   - Total yield earned by all users

3. **Deposit USDC**
   - Enter amount to deposit
   - Click "1. Approve USDC" (approves vault to spend USDC)
   - Click "2. Deposit" (deposits into vault)
   - Receive ysUSDC vault shares

4. **View Your Position**
   - See deposited amount
   - See current balance (with yield)
   - See yield earned
   - See vault shares owned

5. **Withdraw** (TODO)
   - Click "Withdraw"
   - Enter amount or "Max"
   - Vault burns your shares and returns USDC

## Web3 Integration (TODO)

The frontend currently has placeholder wallet connection. To add real Web3:

### Install wagmi + RainbowKit

Already installed:
```json
{
  "dependencies": {
    "wagmi": "^2.19.4",
    "viem": "^2.39.2",
    "@rainbow-me/rainbowkit": "^2.2.9"
  }
}
```

### Update App.tsx

```typescript
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, getDefaultWallets } from '@rainbow-me/rainbowkit';
import { WagmiConfig, createConfig, configureChains } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';

const { chains, publicClient } = configureChains(
  [base, baseSepolia],
  [publicProvider()]
);

const { connectors } = getDefaultWallets({
  appName: 'YieldShift',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
  chains,
});

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
});

// Wrap app
<WagmiConfig config={wagmiConfig}>
  <RainbowKitProvider chains={chains}>
    <App />
  </RainbowKitProvider>
</WagmiConfig>
```

### Update Vault.tsx

Replace `useWalletConnect` with real wagmi hooks:

```typescript
import { useAccount, useConnect, useDisconnect, useContractWrite, useContractRead } from 'wagmi';
import { parseUnits } from 'viem';

// In component
const { address, isConnected } = useAccount();
const { connect } = useConnect();
const { disconnect } = useDisconnect();

// Approve USDC
const { write: approveUSDC } = useContractWrite({
  address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
  abi: ERC20_ABI,
  functionName: 'approve',
  args: [vaultAddress, parseUnits(depositAmount, 6)],
});

// Deposit into vault
const { write: deposit } = useContractWrite({
  address: vaultAddress,
  abi: VAULT_ABI,
  functionName: 'deposit',
  args: [parseUnits(depositAmount, 6), address],
  onSuccess: () => {
    // Track in backend
    apiClient.trackDeposit(txHash, depositAmount);
  },
});
```

## Contract ABIs

### Vault ABI (for frontend)

```json
[
  "function deposit(uint256 assets, address receiver) returns (uint256 shares)",
  "function redeem(uint256 shares, address receiver, address owner) returns (uint256 assets)",
  "function balanceOf(address owner) view returns (uint256)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "function getUserDeposits(address user) view returns (uint256)",
  "function getUserBalance(address user) view returns (uint256)",
  "function getUserYield(address user) view returns (uint256)",
  "function totalAssets() view returns (uint256)"
]
```

### USDC ABI (for approval)

```json
[
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)"
]
```

## Fee Structure

### Management Fee: 2% Annual
- Charged on total assets under management
- Calculated continuously (pro-rated per second)
- Example: $100K in vault → $2K/year → $5.48/day

### Performance Fee: 20%
- Charged on profits only
- Example: Vault earns $1000 profit → $200 goes to fee recipient → $800 to users

### Why Fees?
- Covers gas costs for harvesting and rebalancing
- Pays for smart contract audits and security
- Incentivizes protocol development

### Fee Recipient
Set during deployment. Can be updated by owner:
```solidity
vault.setFeeRecipient(newAddress);
```

## Security

### Audit Status
⚠️ **Not yet audited**. Use at your own risk.

Planned audits:
- Zellic (Q2 2025)
- Code4rena contest (Q3 2025)

### Security Features

1. **ReentrancyGuard** - Prevents reentrancy attacks
2. **Ownable** - Admin functions restricted to owner
3. **SafeERC20** - Safe token transfers prevent common exploits
4. **Emergency Withdraw** - Owner can rescue funds if needed
5. **Strategy Limits** - Maximum 10 strategies
6. **Approval Management** - Controlled token approvals

### Best Practices

1. **Start Small** - Test with small amounts first
2. **Verify Contract** - Check contract on BaseScan before depositing
3. **Understand Risks** - Smart contracts can have bugs
4. **Diversify** - Don't put all funds in one vault
5. **Monitor** - Check your position regularly

## Economics

### For $1000 Deposit:

**Year 1:**
- Deposit: $1000
- Gross APY: 4.5% → $45
- Management fee: 2% of $1000 → $20
- Performance fee: 20% of $45 → $9
- Net profit: $45 - $9 = $36
- **Net APY: 3.6%**

**Year 2 (with compounding):**
- Balance: $1036
- Gross yield: 4.5% of $1036 → $46.62
- Fees: ~$29
- Net profit: ~$37.30
- **Total balance: ~$1073**

### Break-Even Analysis

If gas to deposit = $5:
- Need $5 / 3.6% = ~$139 deposit to break even in 1 year
- Recommendation: Deposit at least $500+ for meaningful returns

## Troubleshooting

### "Vault not deployed yet" error
- Deploy vault first: `cd contracts && npm run deploy:base`
- Update backend `.env` with `VAULT_CONTRACT_ADDRESS`

### "Insufficient allowance" error
- Call `approve()` on USDC contract first
- Approve vault to spend your USDC

### "Insufficient balance" error
- You don't have enough USDC
- Get USDC on Base (bridge from mainnet or buy on exchange)

### Transaction fails
- Check you have enough ETH on Base for gas
- Vault might be paused (check contract status)

### "Network error" in frontend
- Backend not running: `cd backend && npm run dev`
- Check `VAULT_CONTRACT_ADDRESS` in backend `.env`

## Roadmap

### Phase 1 (Current)
- ✅ ERC-4626 vault deployed
- ✅ Aave V3 strategy
- ✅ Frontend deposit UI
- ✅ Backend tracking

### Phase 2 (Next 2 weeks)
- [ ] Full wagmi wallet integration
- [ ] Withdraw functionality
- [ ] Real-time APY updates
- [ ] Transaction history

### Phase 3 (Next month)
- [ ] Add Compound V3 strategy
- [ ] Multi-strategy auto-rebalancing
- [ ] Vault analytics dashboard
- [ ] Mobile app

### Phase 4 (Q2 2025)
- [ ] Cross-chain vaults (Arbitrum, Optimism)
- [ ] Governance token (ysDAO)
- [ ] Vault insurance fund
- [ ] Professional audit

## Support

- **Docs:** https://docs.yieldshift.com
- **Discord:** https://discord.gg/yieldshift
- **Contracts:** `/contracts/README.md`
- **API:** `http://localhost:3001/api/vault/*`

## License

MIT - See LICENSE file

---

Built with ❤️ for SideShift WaveHack 2025
