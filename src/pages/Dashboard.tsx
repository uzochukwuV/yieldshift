import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, TrendingUp, Loader2, RefreshCw, Info, Sparkles, Shield, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { getCoins } from '../services/sideshift';
import { getSupportedYieldTokens, formatApy, formatTvl, type YieldToken } from '../services/defillama';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { SwapModal } from '../components/SwapModal';
import { Navbar } from '../components/Navbar';

const getApyColor = (apy: number) => {
  if (apy >= 10) return 'text-green-600 dark:text-green-400';
  if (apy >= 5) return 'text-emerald-600 dark:text-emerald-400';
  return 'text-blue-600 dark:text-blue-400';
};

export default function Dashboard() {
  const [selectedToken, setSelectedToken] = useState<YieldToken | null>(null);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);

  // Fetch supported coins from SideShift
  const { data: coins, isLoading: coinsLoading } = useQuery({
    queryKey: ['sideshift-coins'],
    queryFn: getCoins,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch yield tokens
  const {
    data: yieldTokens,
    isLoading: yieldsLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['yield-tokens', coins],
    queryFn: async () => {
      if (!coins) return [];
      const supportedIds = coins.map((c) => c.coin);
      return getSupportedYieldTokens(supportedIds);
    },
    enabled: !!coins,
    staleTime: 2 * 60 * 1000,
  });

  const isLoading = coinsLoading || yieldsLoading;

  const handleSwapClick = (token: YieldToken) => {
    setSelectedToken(token);
    setIsSwapModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <Navbar />

      {/* Header */}
      <header className="border-b border-border bg-gradient-to-br from-background via-background to-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-4xl font-bold text-foreground">
                Discover Top DeFi Yields
              </h1>
              <p className="mt-2 text-base text-muted-foreground">
                Browse high-yield opportunities and swap into them from any crypto you own
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Live data from DefiLlama
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Zap className="h-3 w-3" />
                  Instant cross-chain swaps
                </Badge>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              {isRefetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Refresh</span>
            </Button>
          </motion.div>
        </div>
      </header>

      {/* Info Alert */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Alert className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border-blue-500/20">
            <Info className="h-4 w-4" />
            <AlertTitle>How It Works</AlertTitle>
            <AlertDescription>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:gap-6">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold">1</div>
                  <span className="text-sm">Browse yields below</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold">2</div>
                  <span className="text-sm">Click "Swap & Earn"</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold">3</div>
                  <span className="text-sm">Send any crypto, receive yield tokens</span>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </motion.div>
      </div>

      {/* Stats Cards */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-4 md:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Opportunities</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">
                    {yieldTokens?.length || 0}
                  </p>
                </div>
                <div className="rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-3">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Highest APY</p>
                  <p className="mt-2 text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {yieldTokens && yieldTokens.length > 0
                      ? formatApy(yieldTokens[0].totalApy)
                      : '0%'}
                  </p>
                </div>
                <div className="rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-3">
                  <ArrowUpRight className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total TVL</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">
                    {yieldTokens
                      ? formatTvl(yieldTokens.reduce((sum, t) => sum + t.tvlUsd, 0))
                      : '$0'}
                  </p>
                </div>
                <div className="rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-3">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Yield Tokens Table */}
      <div className="mx-auto max-w-7xl px-4 pb-12">
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-foreground">Top Yield Opportunities</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Swap any asset into yield-bearing tokens and start earning instantly
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : yieldTokens && yieldTokens.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Chain</TableHead>
                    <TableHead>Protocol</TableHead>
                    <TableHead className="text-right">APY</TableHead>
                    <TableHead className="text-right">TVL</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yieldTokens.map((token, index) => (
                    <TableRow key={token.pool} className="hover:bg-muted/50">
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                            {token.symbol.substring(0, 2)}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{token.symbol}</p>
                            <p className="text-xs text-muted-foreground">
                              {token.ssId?.toUpperCase()}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{token.chain}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-foreground">{token.project}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className={`font-bold text-lg ${getApyColor(token.totalApy)}`}>
                            {formatApy(token.totalApy)}
                          </span>
                          {token.apyReward > 0 && (
                            <span className="text-xs text-muted-foreground">
                              Base: {formatApy(token.apyBase)} + Reward: {formatApy(token.apyReward)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm text-foreground">{formatTvl(token.tvlUsd)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleSwapClick(token)}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                          Swap & Earn
                          <ArrowUpRight className="ml-1 h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No yield opportunities found</p>
            </div>
          )}
        </Card>
      </div>

      {/* Swap Modal */}
      {selectedToken && (
        <SwapModal
          isOpen={isSwapModalOpen}
          onClose={() => setIsSwapModalOpen(false)}
          yieldToken={selectedToken}
        />
      )}
    </div>
  );
}
