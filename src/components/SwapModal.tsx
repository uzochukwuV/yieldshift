import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, ArrowRight, Copy, Check, ExternalLink, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { createQuote, createOrder, type SideShiftOrder } from '../services/sideshift';
import { formatApy, type YieldToken } from '../services/defillama';

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  yieldToken: YieldToken;
}

export function SwapModal({ isOpen, onClose, yieldToken }: SwapModalProps) {
  const [fromAsset, setFromAsset] = useState('btc');
  const [fromNetwork, setFromNetwork] = useState('btc');
  const [amount, setAmount] = useState('');
  const [receiveAddress, setReceiveAddress] = useState('');
  const [refundAddress, setRefundAddress] = useState('');
  const [order, setOrder] = useState<SideShiftOrder | null>(null);
  const [copied, setCopied] = useState(false);

  const quoteMutation = useMutation({
    mutationFn: async () => {
      if (!amount || !receiveAddress) {
        throw new Error('Please fill in all required fields');
      }

      const quote = await createQuote({
        depositCoin: fromAsset,
        depositNetwork: fromNetwork,
        settleCoin: yieldToken.ssId!,
        settleNetwork: yieldToken.ssNetwork!,
        depositAmount: amount,
      });

      const shift = await createOrder({
        quoteId: quote.id!,
        settleAddress: receiveAddress,
        refundAddress: refundAddress || undefined,
      });

      return shift;
    },
    onSuccess: (data) => {
      setOrder(data);
      // Save order ID to portfolio
      try {
        const stored = localStorage.getItem('yieldshift_portfolio_orders');
        const orderIds = stored ? JSON.parse(stored) : [];
        if (!orderIds.includes(data.id)) {
          orderIds.push(data.id);
          localStorage.setItem('yieldshift_portfolio_orders', JSON.stringify(orderIds));
        }
      } catch (error) {
        console.error('Failed to save order to portfolio:', error);
      }
    },
  });

  const handleCopyAddress = () => {
    if (order?.depositAddress.address) {
      navigator.clipboard.writeText(order.depositAddress.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setOrder(null);
    setAmount('');
    setReceiveAddress('');
    setRefundAddress('');
    quoteMutation.reset();
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Swap to Earn {formatApy(yieldToken.totalApy)}</span>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Swap {fromAsset.toUpperCase()} to {yieldToken.symbol} and start earning yield instantly
          </DialogDescription>
        </DialogHeader>

        {!order ? (
          <div className="space-y-6">
            {/* Swap Preview */}
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                    {fromAsset.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{fromAsset.toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">From</p>
                  </div>
                </div>

                <ArrowRight className="h-6 w-6 text-muted-foreground" />

                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 font-bold text-accent">
                    {yieldToken.symbol.substring(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{yieldToken.symbol}</p>
                    <p className="text-xs text-muted-foreground">To (Earning {formatApy(yieldToken.totalApy)})</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Token Info */}
            <div className="grid gap-2 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Protocol</span>
                <span className="text-sm font-medium text-foreground">{yieldToken.project}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Chain</span>
                <Badge variant="secondary">{yieldToken.chain}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Base APY</span>
                <span className="text-sm font-medium text-foreground">{formatApy(yieldToken.apyBase)}</span>
              </div>
              {yieldToken.apyReward > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Reward APY</span>
                  <span className="text-sm font-medium text-accent">{formatApy(yieldToken.apyReward)}</span>
                </div>
              )}
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount to Swap</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.00000001"
                  placeholder={`Enter ${fromAsset.toUpperCase()} amount`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receiveAddress">
                  Receive Address ({yieldToken.chain})
                </Label>
                <Input
                  id="receiveAddress"
                  placeholder={`Your ${yieldToken.chain} wallet address`}
                  value={receiveAddress}
                  onChange={(e) => setReceiveAddress(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {yieldToken.symbol} will be sent directly to this address
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="refundAddress">
                  Refund Address (Optional)
                </Label>
                <Input
                  id="refundAddress"
                  placeholder={`Your ${fromAsset.toUpperCase()} refund address`}
                  value={refundAddress}
                  onChange={(e) => setRefundAddress(e.target.value)}
                />
              </div>
            </div>

            {quoteMutation.error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {quoteMutation.error.message}
                </AlertDescription>
              </Alert>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={() => quoteMutation.mutate()}
              disabled={quoteMutation.isPending || !amount || !receiveAddress}
            >
              {quoteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Swap...
                </>
              ) : (
                'Create Swap Order'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Success Message */}
            <Alert className="border-accent bg-accent/10">
              <AlertDescription className="text-foreground">
                Swap order created successfully! Send {fromAsset.toUpperCase()} to the deposit address below.
              </AlertDescription>
            </Alert>

            {/* Deposit Address */}
            <div className="space-y-2">
              <Label>Deposit Address</Label>
              <div className="flex gap-2">
                <Input
                  value={order.depositAddress.address}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyAddress}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-accent" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {order.depositAddress.memo && (
                <div className="mt-2">
                  <Label>Memo/Tag</Label>
                  <Input
                    value={order.depositAddress.memo}
                    readOnly
                    className="font-mono text-sm"
                  />
                </div>
              )}
            </div>

            {/* Order Details */}
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-3 font-semibold text-foreground">Order Details</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Order ID</span>
                  <span className="font-mono text-sm text-foreground">{order.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Deposit Amount</span>
                  <span className="text-sm font-medium text-foreground">
                    {order.depositAmount} {order.depositCoin.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">You Will Receive</span>
                  <span className="text-sm font-medium text-accent">
                    {order.settleAmount} {order.settleCoin.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="secondary">{order.status}</Badge>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open(`https://sideshift.ai/orders/${order.id}`, '_blank')}
              >
                Track Order
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
              <Button
                className="flex-1"
                onClick={handleReset}
              >
                Create Another Swap
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
