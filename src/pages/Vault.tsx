import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  DollarSign,
  Info,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { apiClient } from '../services/api';
import { useToast } from '../hooks/use-toast';

// Placeholder for Web3 integration
// In production, use wagmi/viem for actual wallet connection
const useWalletConnect = () => {
  const [address, setAddress] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);

  const connect = async () => {
    // TODO: Implement actual wallet connection with wagmi
    // For now, allow manual address input
    const addr = prompt('Enter your wallet address:');
    if (addr) {
      setAddress(addr);
      setIsConnected(true);
    }
  };

  const disconnect = () => {
    setAddress('');
    setIsConnected(false);
  };

  return { address, isConnected, connect, disconnect };
};

export default function Vault() {
  const { isSignedIn, getToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { address, isConnected, connect, disconnect } = useWalletConnect();

  const [depositAmount, setDepositAmount] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);

  useEffect(() => {
    if (isSignedIn) {
      apiClient.setTokenGetter(getToken);
    }
  }, [isSignedIn, getToken]);

  // Fetch vault stats
  const { data: vaultStats, isLoading: statsLoading } = useQuery({
    queryKey: ['vault-stats'],
    queryFn: () => fetch('http://localhost:3001/api/vault/stats').then(r => r.json()),
    refetchInterval: 30000, // Refresh every 30s
  });

  // Fetch user position (if wallet connected)
  const { data: userPosition, refetch: refetchPosition } = useQuery({
    queryKey: ['vault-position', address],
    queryFn: () => fetch(`http://localhost:3001/api/vault/user/${address}`).then(r => r.json()),
    enabled: !!address && isConnected,
    refetchInterval: 15000,
  });

  // Fetch current APY
  const { data: apyData } = useQuery({
    queryKey: ['vault-apy'],
    queryFn: () => fetch('http://localhost:3001/api/vault/apy').then(r => r.json()),
    refetchInterval: 60000, // Refresh every minute
  });

  const handleApprove = async () => {
    if (!address || !depositAmount) {
      toast({
        title: 'Missing information',
        description: 'Please connect wallet and enter amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsApproving(true);

      // TODO: Implement actual USDC approval with wagmi
      toast({
        title: 'Approve USDC',
        description: 'Please approve USDC in your wallet (this is a demo)',
      });

      // Simulate approval
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: 'Approval successful',
        description: 'You can now deposit into the vault',
      });
    } catch (error: any) {
      toast({
        title: 'Approval failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeposit = async () => {
    if (!address || !depositAmount) {
      toast({
        title: 'Missing information',
        description: 'Please connect wallet and enter amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsDepositing(true);

      // TODO: Implement actual vault deposit with wagmi
      toast({
        title: 'Depositing...',
        description: 'Please confirm the transaction in your wallet',
      });

      // Simulate deposit
      await new Promise(resolve => setTimeout(resolve, 3000));

      const mockTxHash = '0x' + Math.random().toString(16).substring(2);

      // Track deposit in backend
      if (isSignedIn) {
        await apiClient.setTokenGetter(getToken);
        await fetch('http://localhost:3001/api/vault/track-deposit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getToken()}`,
          },
          body: JSON.stringify({
            tx_hash: mockTxHash,
            amount: depositAmount,
          }),
        });
      }

      toast({
        title: 'Deposit successful!',
        description: `Deposited ${depositAmount} USDC into the vault`,
      });

      setDepositAmount('');
      refetchPosition();
      queryClient.invalidateQueries({ queryKey: ['vault-stats'] });
    } catch (error: any) {
      toast({
        title: 'Deposit failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDepositing(false);
    }
  };

  const currentAPY = apyData?.currentAPY || 4.5;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
                <DollarSign className="h-8 w-8 text-green-600" />
                YieldShift Vault
              </h1>
              <p className="text-muted-foreground">
                Deposit USDC and earn {currentAPY}% APY automatically
              </p>
            </div>

            {/* Wallet Connection */}
            {!isConnected ? (
              <Button onClick={connect} size="lg" className="gap-2">
                <Wallet className="h-5 w-5" />
                Connect Wallet
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="px-4 py-2">
                  {address.substring(0, 6)}...{address.substring(38)}
                </Badge>
                <Button variant="ghost" onClick={disconnect} size="sm">
                  Disconnect
                </Button>
              </div>
            )}
          </div>

          {/* Info Alert */}
          <Alert className="bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10">
            <Info className="h-4 w-4" />
            <AlertTitle>Web2-Friendly DeFi</AlertTitle>
            <AlertDescription>
              Simply deposit USDC and we'll automatically deploy your funds to the highest-yielding protocols on Base.
              Your funds earn yield 24/7 with no manual work required. Withdraw anytime.
            </AlertDescription>
          </Alert>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Deposit Interface */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vault Stats */}
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-6">Vault Statistics</h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Value Locked</p>
                  <p className="text-2xl font-bold">
                    ${statsLoading ? '...' : parseFloat(vaultStats?.totalAssets || '0').toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Current APY</p>
                  <p className="text-2xl font-bold text-green-600">{currentAPY}%</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Deposited</p>
                  <p className="text-2xl font-bold">
                    ${statsLoading ? '...' : parseFloat(vaultStats?.totalDeposited || '0').toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Yield Earned</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${statsLoading ? '...' : parseFloat(vaultStats?.totalYieldEarned || '0').toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>

            {/* Deposit Card */}
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-6">Deposit USDC</h2>

              {!isConnected ? (
                <div className="text-center py-12">
                  <Wallet className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
                  <p className="text-muted-foreground mb-6">
                    Connect your wallet to deposit into the vault
                  </p>
                  <Button onClick={connect} size="lg" className="gap-2">
                    <Wallet className="h-5 w-5" />
                    Connect Wallet
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Amount Input */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Amount (USDC)
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="text-2xl py-6 pr-20"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Badge>USDC</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Estimated yearly return: ${(parseFloat(depositAmount || '0') * currentAPY / 100).toFixed(2)}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <Button
                      onClick={handleApprove}
                      disabled={!depositAmount || isApproving || isDepositing}
                      className="flex-1 gap-2"
                      variant="outline"
                    >
                      {isApproving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Approving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          1. Approve USDC
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={handleDeposit}
                      disabled={!depositAmount || isApproving || isDepositing}
                      className="flex-1 gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      {isDepositing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Depositing...
                        </>
                      ) : (
                        <>
                          <DollarSign className="h-4 w-4" />
                          2. Deposit
                        </>
                      )}
                    </Button>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Demo mode: Actual wallet integration coming soon. This simulates the deposit flow.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column - User Position */}
          <div className="space-y-6">
            {/* User Position */}
            {isConnected && userPosition && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Your Position</h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Deposited</p>
                    <p className="text-2xl font-bold">
                      ${parseFloat(userPosition.deposited || '0').toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${parseFloat(userPosition.currentBalance || '0').toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Yield Earned</p>
                    <p className="text-xl font-bold text-emerald-600">
                      +${parseFloat(userPosition.yieldEarned || '0').toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Vault Shares</p>
                    <p className="text-lg font-medium">
                      {parseFloat(userPosition.shares || '0').toFixed(4)} ysUSDC
                    </p>
                  </div>
                </div>

                <Button className="w-full mt-6" variant="outline">
                  Withdraw
                </Button>
              </Card>
            )}

            {/* How It Works */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">How It Works</h3>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center text-green-600 font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium mb-1">Deposit USDC</p>
                    <p className="text-sm text-muted-foreground">
                      Deposit your USDC into the vault on Base chain
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center text-green-600 font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium mb-1">Auto-Deploy</p>
                    <p className="text-sm text-muted-foreground">
                      Funds are automatically deployed to Aave V3 for lending
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center text-green-600 font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium mb-1">Earn Yield</p>
                    <p className="text-sm text-muted-foreground">
                      Your deposits earn {currentAPY}% APY automatically, compounded daily
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center text-green-600 font-bold">
                    4
                  </div>
                  <div>
                    <p className="font-medium mb-1">Withdraw Anytime</p>
                    <p className="text-sm text-muted-foreground">
                      Withdraw your principal + yield whenever you want
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Contract Info */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Contract Info</h3>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Network</p>
                  <Badge>Base Mainnet</Badge>
                </div>

                <div>
                  <p className="text-muted-foreground mb-1">Vault Contract</p>
                  <a
                    href={`https://basescan.org/address/${vaultStats?.vaultAddress || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    View on BaseScan
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div>
                  <p className="text-muted-foreground mb-1">Strategy</p>
                  <p className="font-medium">Aave V3 USDC Lending</p>
                </div>

                <div>
                  <p className="text-muted-foreground mb-1">Standard</p>
                  <p className="font-medium">ERC-4626</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
