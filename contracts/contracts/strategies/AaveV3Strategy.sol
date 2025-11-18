// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AaveV3Strategy
 * @notice Strategy that deposits USDC into Aave V3 on Base to earn yield
 */
contract AaveV3Strategy is Ownable {
    using SafeERC20 for IERC20;

    // Aave V3 interfaces
    IPool public constant AAVE_POOL = IPool(0xA238Dd80C259a72e81d7e4664a9801593F98d1c5); // Base mainnet
    IERC20 public immutable asset; // USDC
    IERC20 public immutable aToken; // aUSDC
    address public immutable vault;

    event Deposited(uint256 amount);
    event Withdrawn(uint256 amount);
    event Harvested(uint256 profit);

    modifier onlyVault() {
        require(msg.sender == vault, "Only vault");
        _;
    }

    constructor(address asset_, address aToken_, address vault_) Ownable(msg.sender) {
        require(asset_ != address(0), "Invalid asset");
        require(aToken_ != address(0), "Invalid aToken");
        require(vault_ != address(0), "Invalid vault");

        asset = IERC20(asset_);
        aToken = IERC20(aToken_);
        vault = vault_;

        // Approve Aave pool to spend asset
        asset.safeApprove(address(AAVE_POOL), type(uint256).max);
    }

    /**
     * @notice Deposit assets into Aave
     * @param amount Amount to deposit
     */
    function deposit(uint256 amount) external onlyVault {
        require(amount > 0, "Invalid amount");

        // Transfer from vault
        asset.safeTransferFrom(vault, address(this), amount);

        // Deposit into Aave
        AAVE_POOL.supply(address(asset), amount, address(this), 0);

        emit Deposited(amount);
    }

    /**
     * @notice Withdraw assets from Aave
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) external onlyVault {
        require(amount > 0, "Invalid amount");

        // Withdraw from Aave
        AAVE_POOL.withdraw(address(asset), amount, vault);

        emit Withdrawn(amount);
    }

    /**
     * @notice Withdraw all assets from Aave
     */
    function withdrawAll() external onlyVault {
        uint256 balance = aToken.balanceOf(address(this));

        if (balance > 0) {
            AAVE_POOL.withdraw(address(asset), type(uint256).max, vault);
            emit Withdrawn(balance);
        }
    }

    /**
     * @notice Harvest accrued interest
     */
    function harvest() external {
        // Calculate profit (aToken balance - deposited)
        uint256 aTokenBalance = aToken.balanceOf(address(this));
        uint256 currentAssets = asset.balanceOf(address(this));

        if (aTokenBalance > currentAssets) {
            uint256 profit = aTokenBalance - currentAssets;

            // Withdraw profit to vault
            if (profit > 0) {
                AAVE_POOL.withdraw(address(asset), profit, vault);
                emit Harvested(profit);
            }
        }
    }

    /**
     * @notice Emergency withdraw - owner can pull all funds
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = aToken.balanceOf(address(this));

        if (balance > 0) {
            AAVE_POOL.withdraw(address(asset), type(uint256).max, vault);
        }
    }

    /**
     * @notice Get total assets managed by strategy
     */
    function totalAssets() external view returns (uint256) {
        return aToken.balanceOf(address(this));
    }

    /**
     * @notice Get current APY from Aave (approximation)
     * @dev This is a view function that estimates current APY
     */
    function getCurrentAPY() external view returns (uint256) {
        ReserveData memory reserveData = AAVE_POOL.getReserveData(address(asset));
        // Convert ray (27 decimals) to percentage with 2 decimals
        // liquidityRate is in ray (10^27), we want percentage (10^2)
        return reserveData.currentLiquidityRate / 10**25;
    }
}

/**
 * @notice Aave V3 Pool interface
 */
interface IPool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
    function getReserveData(address asset) external view returns (ReserveData memory);
}

struct ReserveData {
    uint256 configuration;
    uint128 liquidityIndex;
    uint128 currentLiquidityRate;
    uint128 variableBorrowIndex;
    uint128 currentVariableBorrowRate;
    uint128 currentStableBorrowRate;
    uint40 lastUpdateTimestamp;
    uint16 id;
    address aTokenAddress;
    address stableDebtTokenAddress;
    address variableDebtTokenAddress;
    address interestRateStrategyAddress;
    uint128 accruedToTreasury;
    uint128 unbacked;
    uint128 isolationModeTotalDebt;
}
