import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight, Loader2, Info } from 'lucide-react';
import { getCoins, createQuote, createOrder, type SideShiftCoin } from '../services/sideshift';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useToast } from '../hooks/use-toast';
import { Navbar } from '../components/Navbar';
import { Badge } from '../components/ui/badge';

export default function Swap() {
  const { toast } = useToast();
  const [depositCoin, setDepositCoin] = useState('');
  const [settleCoin, setSettleCoin] = useState('');
  const [depositNetwork, setDepositNetwork] = useState('');
  const [settleNetwork, setSettleNetwork] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [settleAddress, setSettleAddress] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [quoteData, setQuoteData] = useState<any>(null);

  const { data: coins, isLoading: coinsLoading } = useQuery({
    queryKey: ['sideshift-coins'],
    queryFn: getCoins,
    staleTime: 5 * 60 * 1000,
  });

  const activeCoins = coins?.filter((c) => !c.deprecated) || [];

  const depositCoinData = activeCoins.find((c) => c.coin === depositCoin);
  const settleCoinData = activeCoins.find((c) => c.coin === settleCoin);

  const handleGetQuote = async () => {
    if (!depositCoin || !settleCoin || !depositNetwork || !settleNetwork || !depositAmount) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all fields to get a quote',
        variant: 'destructive',
      });
      return;
    }

    try {
      const quote = await createQuote({
        depositCoin,
        depositNetwork,
        settleCoin,
        settleNetwork,
        depositAmount,
        affiliateId: import.meta.env.VITE_SIDESHIFT_AFFILIATE_ID,
      });

      if (quote.error) {
        toast({
          title: 'Quote Error',
          description: quote.error.message,
          variant: 'destructive',
        });
        return;
      }

      setQuoteData(quote);
      toast({
        title: 'Quote Retrieved',
        description: `You will receive ${quote.settleAmount} ${settleCoin.toUpperCase()}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to get quote',
        variant: 'destructive',
      });
    }
  };

  const handleSwap = async () => {
    if (!quoteData || !settleAddress) {
      toast({
        title: 'Missing Information',
        description: 'Please get a quote and provide a settle address',
        variant: 'destructive',
      });
      return;
    }

    setIsSwapping(true);
    try {
      const order = await createOrder({
        quoteId: quoteData.id,
        settleAddress,
        affiliateId: import.meta.env.VITE_SIDESHIFT_AFFILIATE_ID || '',
      });

      // Save order ID to portfolio
      try {
        const stored = localStorage.getItem('yieldshift_portfolio_orders');
        const orderIds = stored ? JSON.parse(stored) : [];
        if (!orderIds.includes(order.id)) {
          orderIds.push(order.id);
          localStorage.setItem('yieldshift_portfolio_orders', JSON.stringify(orderIds));
        }
      } catch (error) {
        console.error('Failed to save order to portfolio:', error);
      }

      toast({
        title: 'Swap Created!',
        description: `Order ID: ${order.id}. Send ${depositAmount} ${depositCoin.toUpperCase()} to the deposit address.`,
      });

      // Reset form
      setDepositAmount('');
      setSettleAddress('');
      setQuoteData(null);
    } catch (error: any) {
      toast({
        title: 'Swap Failed',
        description: error.message || 'Failed to create swap order',
        variant: 'destructive',
      });
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">Swap Crypto</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Exchange any supported cryptocurrency instantly
          </p>
        </div>

        <Card className="p-6">
          {coinsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Deposit Section */}
              <div className="space-y-4 rounded-lg border border-border p-4">
                <Label className="text-base font-semibold">You Send</Label>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Coin</Label>
                    <Select value={depositCoin} onValueChange={(val) => {
                      setDepositCoin(val);
                      setDepositNetwork('');
                      setQuoteData(null);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select coin" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeCoins.map((coin) => (
                          <SelectItem key={coin.coin} value={coin.coin}>
                            {coin.name} ({coin.coin.toUpperCase()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Network</Label>
                    <Select
                      value={depositNetwork}
                      onValueChange={(val) => {
                        setDepositNetwork(val);
                        setQuoteData(null);
                      }}
                      disabled={!depositCoin}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select network" />
                      </SelectTrigger>
                      <SelectContent>
                        {depositCoinData?.networks.map((network) => (
                          <SelectItem key={network} value={network}>
                            {network}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={depositAmount}
                    onChange={(e) => {
                      setDepositAmount(e.target.value);
                      setQuoteData(null);
                    }}
                  />
                </div>
              </div>

              {/* Swap Icon */}
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-2">
                  <ArrowLeftRight className="h-5 w-5 text-primary" />
                </div>
              </div>

              {/* Settle Section */}
              <div className="space-y-4 rounded-lg border border-border p-4">
                <Label className="text-base font-semibold">You Receive</Label>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Coin</Label>
                    <Select value={settleCoin} onValueChange={(val) => {
                      setSettleCoin(val);
                      setSettleNetwork('');
                      setQuoteData(null);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select coin" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeCoins.map((coin) => (
                          <SelectItem key={coin.coin} value={coin.coin}>
                            {coin.name} ({coin.coin.toUpperCase()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Network</Label>
                    <Select
                      value={settleNetwork}
                      onValueChange={(val) => {
                        setSettleNetwork(val);
                        setQuoteData(null);
                      }}
                      disabled={!settleCoin}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select network" />
                      </SelectTrigger>
                      <SelectContent>
                        {settleCoinData?.networks.map((network) => (
                          <SelectItem key={network} value={network}>
                            {network}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Your Receive Address</Label>
                  <Input
                    placeholder="Enter your wallet address"
                    value={settleAddress}
                    onChange={(e) => setSettleAddress(e.target.value)}
                  />
                </div>
              </div>

              {/* Quote Display */}
              {quoteData && (
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Info className="h-4 w-4 text-primary" />
                    Quote Details
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rate:</span>
                      <span className="font-medium">{quoteData.rate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">You receive:</span>
                      <span className="font-medium">
                        {quoteData.settleAmount} {settleCoin.toUpperCase()}
                      </span>
                    </div>
                    {quoteData.expiresAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expires:</span>
                        <span className="font-medium">
                          {new Date(quoteData.expiresAt).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleGetQuote}
                  variant="outline"
                  className="flex-1"
                  disabled={!depositCoin || !settleCoin || !depositAmount}
                >
                  Get Quote
                </Button>
                <Button
                  onClick={handleSwap}
                  className="flex-1"
                  disabled={!quoteData || !settleAddress || isSwapping}
                >
                  {isSwapping ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Swap...
                    </>
                  ) : (
                    'Create Swap'
                  )}
                </Button>
              </div>

              {/* Info Banner */}
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  <strong>Note:</strong> After creating the swap, you'll receive a deposit address. 
                  Send your funds to that address to complete the transaction.
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
