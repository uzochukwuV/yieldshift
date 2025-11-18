// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title YieldShiftVault
 * @notice ERC-4626 compliant vault for automated yield optimization
 * @dev Accepts USDC deposits and deploys capital to various DeFi protocols on Base
 */
contract YieldShiftVault is ERC4626, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Events
    event StrategyAdded(address indexed strategy);
    event StrategyRemoved(address indexed strategy);
    event Harvest(uint256 totalProfit);
    event EmergencyWithdraw(address indexed recipient, uint256 amount);
    event DepositRecorded(address indexed user, uint256 assets, uint256 shares);

    // State variables
    address[] public strategies;
    mapping(address => bool) public isStrategy;
    mapping(address => uint256) public userDeposits; // Track total deposits per user

    uint256 public totalDeposited; // Total assets deposited (excluding yield)
    uint256 public totalYieldEarned; // Total yield earned by the vault

    uint256 public constant MAX_STRATEGIES = 10;
    uint256 public constant MANAGEMENT_FEE_BPS = 200; // 2% annual management fee
    uint256 public constant PERFORMANCE_FEE_BPS = 2000; // 20% performance fee
    uint256 public constant BPS_DENOMINATOR = 10000;

    address public feeRecipient;
    uint256 public lastHarvestTimestamp;

    /**
     * @notice Initialize the vault
     * @param asset_ The underlying asset (USDC on Base)
     * @param name_ Vault token name
     * @param symbol_ Vault token symbol
     */
    constructor(
        IERC20 asset_,
        string memory name_,
        string memory symbol_,
        address feeRecipient_
    ) ERC4626(asset_) ERC20(name_, symbol_) Ownable(msg.sender) {
        require(feeRecipient_ != address(0), "Invalid fee recipient");
        feeRecipient = feeRecipient_;
        lastHarvestTimestamp = block.timestamp;
    }

    /**
     * @notice Deposit assets into the vault
     * @dev Overridden to track user deposits
     */
    function deposit(uint256 assets, address receiver)
        public
        virtual
        override
        nonReentrant
        returns (uint256 shares)
    {
        shares = super.deposit(assets, receiver);

        // Track user deposit
        userDeposits[receiver] += assets;
        totalDeposited += assets;

        emit DepositRecorded(receiver, assets, shares);

        return shares;
    }

    /**
     * @notice Mint shares of the vault
     * @dev Overridden to track user deposits
     */
    function mint(uint256 shares, address receiver)
        public
        virtual
        override
        nonReentrant
        returns (uint256 assets)
    {
        assets = super.mint(shares, receiver);

        // Track user deposit
        userDeposits[receiver] += assets;
        totalDeposited += assets;

        emit DepositRecorded(receiver, assets, shares);

        return assets;
    }

    /**
     * @notice Calculate total assets under management
     * @dev Includes assets in vault + all strategies
     */
    function totalAssets() public view virtual override returns (uint256) {
        uint256 total = IERC20(asset()).balanceOf(address(this));

        // Add assets deployed to strategies
        for (uint256 i = 0; i < strategies.length; i++) {
            total += IStrategy(strategies[i]).totalAssets();
        }

        return total;
    }

    /**
     * @notice Get user's deposited amount (principal)
     * @param user User address
     * @return User's total deposits
     */
    function getUserDeposits(address user) external view returns (uint256) {
        return userDeposits[user];
    }

    /**
     * @notice Get user's current balance (principal + yield)
     * @param user User address
     * @return User's total balance in underlying assets
     */
    function getUserBalance(address user) external view returns (uint256) {
        uint256 shares = balanceOf(user);
        return convertToAssets(shares);
    }

    /**
     * @notice Get user's earned yield
     * @param user User address
     * @return User's total earned yield
     */
    function getUserYield(address user) external view returns (uint256) {
        uint256 currentBalance = this.getUserBalance(user);
        uint256 deposits = userDeposits[user];

        if (currentBalance > deposits) {
            return currentBalance - deposits;
        }

        return 0;
    }

    /**
     * @notice Add a new strategy
     * @param strategy Strategy contract address
     */
    function addStrategy(address strategy) external onlyOwner {
        require(strategy != address(0), "Invalid strategy");
        require(!isStrategy[strategy], "Strategy already exists");
        require(strategies.length < MAX_STRATEGIES, "Max strategies reached");

        strategies.push(strategy);
        isStrategy[strategy] = true;

        // Approve strategy to spend vault's tokens
        IERC20(asset()).safeApprove(strategy, type(uint256).max);

        emit StrategyAdded(strategy);
    }

    /**
     * @notice Remove a strategy
     * @param strategy Strategy contract address
     */
    function removeStrategy(address strategy) external onlyOwner {
        require(isStrategy[strategy], "Strategy not found");

        // Withdraw all funds from strategy
        IStrategy(strategy).withdrawAll();

        // Remove from array
        for (uint256 i = 0; i < strategies.length; i++) {
            if (strategies[i] == strategy) {
                strategies[i] = strategies[strategies.length - 1];
                strategies.pop();
                break;
            }
        }

        isStrategy[strategy] = false;

        // Revoke approval
        IERC20(asset()).safeApprove(strategy, 0);

        emit StrategyRemoved(strategy);
    }

    /**
     * @notice Deploy idle funds to strategies
     * @param amounts Amounts to deploy to each strategy
     */
    function deployFunds(uint256[] calldata amounts) external onlyOwner {
        require(amounts.length == strategies.length, "Invalid amounts length");

        for (uint256 i = 0; i < strategies.length; i++) {
            if (amounts[i] > 0) {
                IStrategy(strategies[i]).deposit(amounts[i]);
            }
        }
    }

    /**
     * @notice Harvest profits from all strategies
     */
    function harvest() external {
        uint256 beforeBalance = IERC20(asset()).balanceOf(address(this));

        // Harvest from all strategies
        for (uint256 i = 0; i < strategies.length; i++) {
            IStrategy(strategies[i]).harvest();
        }

        uint256 afterBalance = IERC20(asset()).balanceOf(address(this));
        uint256 profit = afterBalance - beforeBalance;

        if (profit > 0) {
            totalYieldEarned += profit;

            // Take performance fee
            uint256 performanceFee = (profit * PERFORMANCE_FEE_BPS) / BPS_DENOMINATOR;
            if (performanceFee > 0) {
                IERC20(asset()).safeTransfer(feeRecipient, performanceFee);
            }
        }

        // Take management fee (time-based)
        uint256 timeSinceLastHarvest = block.timestamp - lastHarvestTimestamp;
        if (timeSinceLastHarvest > 0) {
            uint256 managementFee = (totalAssets() * MANAGEMENT_FEE_BPS * timeSinceLastHarvest) /
                (BPS_DENOMINATOR * 365 days);

            if (managementFee > 0) {
                IERC20(asset()).safeTransfer(feeRecipient, managementFee);
            }
        }

        lastHarvestTimestamp = block.timestamp;

        emit Harvest(profit);
    }

    /**
     * @notice Emergency withdraw all funds from strategies
     */
    function emergencyWithdraw() external onlyOwner {
        for (uint256 i = 0; i < strategies.length; i++) {
            IStrategy(strategies[i]).emergencyWithdraw();
        }

        uint256 balance = IERC20(asset()).balanceOf(address(this));
        emit EmergencyWithdraw(msg.sender, balance);
    }

    /**
     * @notice Update fee recipient
     * @param newRecipient New fee recipient address
     */
    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid recipient");
        feeRecipient = newRecipient;
    }

    /**
     * @notice Get number of active strategies
     */
    function strategiesCount() external view returns (uint256) {
        return strategies.length;
    }

    /**
     * @notice Get all strategy addresses
     */
    function getAllStrategies() external view returns (address[] memory) {
        return strategies;
    }

    /**
     * @notice Get vault statistics
     */
    function getVaultStats() external view returns (
        uint256 totalAssets_,
        uint256 totalShares_,
        uint256 totalDeposited_,
        uint256 totalYieldEarned_,
        uint256 sharePrice_
    ) {
        totalAssets_ = totalAssets();
        totalShares_ = totalSupply();
        totalDeposited_ = totalDeposited;
        totalYieldEarned_ = totalYieldEarned;
        sharePrice_ = totalShares_ > 0 ? (totalAssets_ * 1e18) / totalShares_ : 1e18;
    }
}

/**
 * @notice Strategy interface
 */
interface IStrategy {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function withdrawAll() external;
    function harvest() external;
    function emergencyWithdraw() external;
    function totalAssets() external view returns (uint256);
}
