# YieldShift Vault Contracts

ERC-4626 compliant vaults on Base chain for automated yield optimization.

## Overview

The YieldShift Vault system consists of:

1. **YieldShiftVault.sol** - ERC-4626 compliant vault that accepts USDC deposits
2. **AaveV3Strategy.sol** - Strategy that deposits funds into Aave V3 on Base to earn yield
3. Extensible architecture to add more yield strategies

## Features

✅ **ERC-4626 Standard** - Industry standard vault interface
✅ **Multi-Strategy** - Deploy funds across multiple yield protocols
✅ **Auto-Compounding** - Harvest and reinvest yields automatically
✅ **Fee System** - 2% management fee + 20% performance fee
✅ **User Tracking** - Track individual user deposits and yields
✅ **Base Chain** - Deployed on Base for low gas fees

## Contracts

### YieldShiftVault

Main vault contract that users deposit into.

**Key Functions:**
```solidity
// Deposit USDC and receive vault shares
function deposit(uint256 assets, address receiver) returns (uint256 shares)

// Redeem shares for USDC
function redeem(uint256 shares, address receiver, address owner) returns (uint256 assets)

// Get user's deposited amount (principal)
function getUserDeposits(address user) returns (uint256)

// Get user's current balance (principal + yield)
function getUserBalance(address user) returns (uint256)

// Get user's earned yield
function getUserYield(address user) returns (uint256)

// Get vault statistics
function getVaultStats() returns (totalAssets, totalShares, totalDeposited, totalYieldEarned, sharePrice)
```

**Events:**
```solidity
event DepositRecorded(address indexed user, uint256 assets, uint256 shares);
event Harvest(uint256 totalProfit);
```

### AaveV3Strategy

Strategy that earns yield by lending USDC on Aave V3.

**Features:**
- Deposits USDC into Aave V3 Pool
- Earns interest automatically
- Can be withdrawn at any time
- Integrates with vault's harvest mechanism

## Deployment

### Prerequisites

1. Install dependencies:
```bash
cd contracts
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your private key
```

3. Get Base Sepolia testnet ETH:
- Visit https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- Or bridge from Ethereum Sepolia

### Deploy to Base Sepolia (Testnet)

```bash
npm run deploy:base-testnet
```

### Deploy to Base Mainnet

```bash
npm run deploy:base
```

**Warning:** Make sure you have ETH on Base mainnet for gas fees!

## Deployed Contracts (Base Mainnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| YieldShiftVault | `TBD` | Main vault for USDC deposits |
| AaveV3Strategy | `TBD` | Aave V3 lending strategy |

**USDC on Base:** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

## Usage Examples

### For Users (Depositing)

```typescript
// 1. Approve USDC
const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
await usdc.approve(vaultAddress, ethers.parseUnits("1000", 6)); // 1000 USDC

// 2. Deposit into vault
const vault = await ethers.getContractAt("YieldShiftVault", vaultAddress);
await vault.deposit(
  ethers.parseUnits("1000", 6), // 1000 USDC
  userAddress // receiver
);

// 3. Check your balance
const shares = await vault.balanceOf(userAddress);
const assets = await vault.convertToAssets(shares);
console.log("Your balance:", ethers.formatUnits(assets, 6), "USDC");

// 4. Check your yield
const deposited = await vault.getUserDeposits(userAddress);
const current = await vault.getUserBalance(userAddress);
const yield = await vault.getUserYield(userAddress);
console.log("Deposited:", ethers.formatUnits(deposited, 6), "USDC");
console.log("Current:", ethers.formatUnits(current, 6), "USDC");
console.log("Yield:", ethers.formatUnits(yield, 6), "USDC");
```

### For Admins (Managing Vault)

```typescript
// Deploy idle funds to Aave strategy
const amounts = [ethers.parseUnits("10000", 6)]; // Deploy 10K USDC
await vault.deployFunds(amounts);

// Harvest yields
await vault.harvest();

// Check strategy performance
const strategyAddress = await vault.strategies(0);
const strategy = await ethers.getContractAt("AaveV3Strategy", strategyAddress);
const apy = await strategy.getCurrentAPY();
console.log("Current Aave APY:", apy / 100, "%");
```

## Architecture

```
User
  ↓ deposit USDC
YieldShiftVault (ERC-4626)
  ↓ deploy funds
AaveV3Strategy
  ↓ supply USDC
Aave V3 Pool
  ↓ earn interest
aUSDC (increases in value)
  ↓ harvest
Profits back to Vault
  ↓ compound
Higher share price for users
```

## Security Features

1. **ReentrancyGuard** - Prevents reentrancy attacks
2. **Ownable** - Access control for admin functions
3. **SafeERC20** - Safe token transfers
4. **Emergency Withdraw** - Owner can withdraw all funds in emergency
5. **Strategy Limits** - Maximum 10 strategies
6. **Approval Management** - Controlled token approvals

## Fee Structure

- **Management Fee:** 2% annual (0.00548% daily)
- **Performance Fee:** 20% of profits
- **Fees sent to:** Fee recipient address (set in constructor)

Example: If you deposit $1000 and earn $100 in yield:
- Performance fee: $20 (20% of $100 profit)
- Management fee: ~$20/year (2% of $1000)
- You keep: $80 profit (first year)

## Gas Optimization

- Uses Base chain for low gas fees (~$0.01 per transaction)
- Batch deposits possible
- Efficient storage patterns

## Adding New Strategies

To add a new yield strategy:

1. Create a new contract implementing `IStrategy` interface:
```solidity
interface IStrategy {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function withdrawAll() external;
    function harvest() external;
    function emergencyWithdraw() external;
    function totalAssets() external view returns (uint256);
}
```

2. Deploy the strategy
3. Add to vault: `vault.addStrategy(strategyAddress)`
4. Deploy funds: `vault.deployFunds([amount])`

## Testing

```bash
npm run compile
npm test
```

## Verification

After deployment, verify contracts on BaseScan:

```bash
npx hardhat verify --network base VAULT_ADDRESS "USDC_ADDRESS" "YieldShift USDC Vault" "ysUSDC" "FEE_RECIPIENT"
npx hardhat verify --network base STRATEGY_ADDRESS "USDC_ADDRESS" "AUSDC_ADDRESS" "VAULT_ADDRESS"
```

## Integration with YieldShift Frontend

The vault integrates with the YieldShift frontend via:

1. **Web3 Provider** - Users connect wallet (e.g., MetaMask)
2. **Direct Contract Interaction** - Frontend calls vault contract directly
3. **Backend Tracking** - API tracks user deposits for analytics

See `/backend/src/routes/vault.ts` for API endpoints.

## Roadmap

- [ ] Add Compound V3 strategy
- [ ] Add Uniswap V3 LP strategy
- [ ] Implement auto-rebalancing between strategies
- [ ] Add yield aggregator (optimize across strategies)
- [ ] Governance token for vault users
- [ ] Cross-chain vaults (Arbitrum, Optimism)

## Audits

⚠️ **Not yet audited**. Use at your own risk. Audit scheduled for Q2 2025.

## License

MIT

## Support

- Docs: https://docs.yieldshift.com
- Discord: https://discord.gg/yieldshift
- Issues: https://github.com/yieldshift/contracts/issues
