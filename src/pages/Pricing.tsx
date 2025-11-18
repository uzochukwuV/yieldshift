import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Sparkles, Zap, Crown, Building2 } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Navbar } from '../components/Navbar';
import { apiClient } from '../services/api';
import { useToast } from '../hooks/use-toast';

const plans = [
  {
    name: 'Free',
    price: 0,
    icon: Sparkles,
    color: 'from-gray-500 to-gray-600',
    description: 'Perfect for exploring DeFi yields',
    features: [
      'Browse 1000+ yield opportunities',
      'Manual swap creation',
      'Track up to 5 orders',
      'Basic APY calculator',
      'Compare up to 2 yields',
      'Email support (48hr response)',
    ],
    limitations: [
      'No AI recommendations',
      'No auto-rebalancing',
      'Limited order tracking',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Starter',
    price: 100,
    priceYearly: 960,
    icon: Zap,
    color: 'from-blue-500 to-purple-600',
    description: 'For individual DeFi investors',
    features: [
      'Everything in Free, plus:',
      '🤖 AI Portfolio Analyzer',
      '⚡ 4 auto-rebalances per month',
      '🔔 Smart yield alerts',
      '📊 Portfolio analytics & ROI tracking',
      '🛡️ Risk scoring system',
      '⏰ Gas optimization',
      '📧 Priority email support (24hr)',
      'Track unlimited orders',
    ],
    limitations: [],
    cta: 'Start Free Trial',
    popular: true,
    roi: 'Break-even on $48K portfolio with just 2% extra yield',
  },
  {
    name: 'Professional',
    price: 500,
    priceYearly: 4800,
    icon: Crown,
    color: 'from-purple-500 to-pink-600',
    description: 'For active traders & serious investors',
    features: [
      'Everything in Starter, plus:',
      '🚀 Unlimited auto-rebalancing',
      '🎯 Custom yield strategies',
      '👛 Manage 5 wallets',
      '🔮 AI yield forecasting (30-day)',
      '📈 Advanced analytics (Sharpe ratio)',
      '💼 Tax reporting & export',
      '⚡ DeFi hedging & stop-loss',
      '💬 Dedicated Slack support',
      '📞 Monthly strategy call',
    ],
    limitations: [],
    cta: 'Start Free Trial',
    popular: false,
    roi: 'Break-even on $480K portfolio with just 1% extra yield',
  },
  {
    name: 'Institutional',
    price: 'Custom',
    icon: Building2,
    color: 'from-orange-500 to-red-600',
    description: 'For DAOs, family offices & funds',
    features: [
      'Everything in Professional, plus:',
      '👔 Dedicated success manager',
      '🏢 Unlimited wallets',
      '🔐 Multi-sig support (Gnosis Safe)',
      '🤖 Custom AI models',
      '⚖️ Compliance & AML tools',
      '🔄 Automated compounding',
      '🌐 API access & webhooks',
      '📊 Quarterly business reviews',
      '⚡ 24/7 priority support',
      '✅ Custom SLAs & insurance',
    ],
    limitations: [],
    cta: 'Contact Sales',
    popular: false,
    roi: 'Manage $2M+ portfolios with institutional-grade automation',
  },
];

export default function Pricing() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const { isSignedIn, getToken } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Set token getter for API client
  useEffect(() => {
    if (isSignedIn) {
      apiClient.setTokenGetter(getToken);
    }
  }, [isSignedIn, getToken]);

  const handlePlanSelect = async (planName: string) => {
    if (planName === 'Free') {
      navigate('/dashboard');
      return;
    }

    if (planName === 'Institutional') {
      // TODO: Open contact form or mailto
      window.location.href = 'mailto:sales@yieldshift.com?subject=Institutional Plan Inquiry';
      return;
    }

    if (!isSignedIn) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to subscribe to a plan',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(planName);
      const plan = planName.toLowerCase() as 'starter' | 'professional';
      const { url } = await apiClient.createCheckoutSession(plan);
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: 'Checkout failed',
        description: 'Failed to create checkout session. Please try again.',
        variant: 'destructive',
      });
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="border-b border-border bg-gradient-to-br from-background via-background to-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold sm:text-5xl">
              Choose Your{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Yield Strategy
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              From exploring yields to full AI automation. Start free, upgrade as you grow.
            </p>

            {/* Billing Toggle */}
            <div className="mt-8 flex items-center justify-center gap-4">
              <span className={billingPeriod === 'monthly' ? 'font-semibold' : 'text-muted-foreground'}>
                Monthly
              </span>
              <button
                onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-gradient-to-r from-blue-600 to-purple-600"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    billingPeriod === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={billingPeriod === 'yearly' ? 'font-semibold' : 'text-muted-foreground'}>
                Yearly
                <Badge className="ml-2 bg-green-500">Save 20%</Badge>
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card
                  className={`relative h-full p-6 ${
                    plan.popular
                      ? 'border-2 border-blue-500 shadow-xl scale-105'
                      : 'hover:shadow-lg transition-shadow'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-1">
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  {/* Icon */}
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${plan.color}`}>
                    <plan.icon className="h-6 w-6 text-white" />
                  </div>

                  {/* Plan Name */}
                  <h3 className="mb-2 text-2xl font-bold">{plan.name}</h3>
                  <p className="mb-4 text-sm text-muted-foreground">{plan.description}</p>

                  {/* Price */}
                  <div className="mb-6">
                    {typeof plan.price === 'number' ? (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold">
                            ${billingPeriod === 'yearly' && plan.priceYearly ? plan.priceYearly / 12 : plan.price}
                          </span>
                          <span className="text-muted-foreground">/month</span>
                        </div>
                        {billingPeriod === 'yearly' && plan.priceYearly && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            ${plan.priceYearly}/year (save ${plan.price * 12 - plan.priceYearly})
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="text-3xl font-bold">{plan.price}</div>
                    )}
                  </div>

                  {/* CTA Button */}
                  <Button
                    className={`mb-6 w-full ${
                      plan.popular
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                        : ''
                    }`}
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handlePlanSelect(plan.name)}
                    disabled={loading === plan.name}
                  >
                    {loading === plan.name ? 'Loading...' : plan.cta}
                  </Button>

                  {/* Features */}
                  <div className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* ROI Note */}
                  {plan.roi && (
                    <div className="mt-4 rounded-lg bg-green-50 dark:bg-green-950/20 p-3 text-xs text-green-700 dark:text-green-400">
                      💡 {plan.roi}
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold">Feature Comparison</h2>
            <p className="mt-2 text-muted-foreground">See what's included in each plan</p>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-4 text-left">Feature</th>
                    <th className="p-4 text-center">Free</th>
                    <th className="p-4 text-center bg-blue-50 dark:bg-blue-950/20">Starter</th>
                    <th className="p-4 text-center">Professional</th>
                    <th className="p-4 text-center">Institutional</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="p-4 font-medium">Auto-Rebalances/Month</td>
                    <td className="p-4 text-center">—</td>
                    <td className="p-4 text-center bg-blue-50/50 dark:bg-blue-950/10">4</td>
                    <td className="p-4 text-center">Unlimited</td>
                    <td className="p-4 text-center">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium">AI Recommendations</td>
                    <td className="p-4 text-center">—</td>
                    <td className="p-4 text-center bg-blue-50/50 dark:bg-blue-950/10">✅</td>
                    <td className="p-4 text-center">✅</td>
                    <td className="p-4 text-center">✅</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium">Wallets</td>
                    <td className="p-4 text-center">1</td>
                    <td className="p-4 text-center bg-blue-50/50 dark:bg-blue-950/10">1</td>
                    <td className="p-4 text-center">5</td>
                    <td className="p-4 text-center">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium">Custom Strategies</td>
                    <td className="p-4 text-center">—</td>
                    <td className="p-4 text-center bg-blue-50/50 dark:bg-blue-950/10">—</td>
                    <td className="p-4 text-center">✅</td>
                    <td className="p-4 text-center">✅</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium">Multi-Sig Support</td>
                    <td className="p-4 text-center">—</td>
                    <td className="p-4 text-center bg-blue-50/50 dark:bg-blue-950/10">—</td>
                    <td className="p-4 text-center">—</td>
                    <td className="p-4 text-center">✅</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium">Support</td>
                    <td className="p-4 text-center text-sm">48hr Email</td>
                    <td className="p-4 text-center text-sm bg-blue-50/50 dark:bg-blue-950/10">24hr Email</td>
                    <td className="p-4 text-center text-sm">Slack + Monthly Call</td>
                    <td className="p-4 text-center text-sm">24/7 Dedicated</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-6">
            {[
              {
                q: 'Can I try before buying?',
                a: 'Yes! The Free tier lets you explore all yields and manually create swaps. Starter and Professional plans include a 7-day free trial.',
              },
              {
                q: 'How does auto-rebalancing work?',
                a: 'Our AI scans your portfolio daily and recommends moving funds to higher-yielding opportunities. With one click, we execute the entire swap automatically.',
              },
              {
                q: 'Is my crypto safe?',
                a: 'YieldShift is 100% non-custodial. We never hold your funds. You connect your wallet and approve transactions - you stay in full control.',
              },
              {
                q: 'Can I cancel anytime?',
                a: 'Absolutely. No long-term commitments. Cancel your subscription anytime from your dashboard.',
              },
              {
                q: 'What chains do you support?',
                a: 'We support Ethereum, Solana, Avalanche, Polygon, Arbitrum, Optimism, and 10+ more chains via SideShift.',
              },
            ].map((faq, i) => (
              <Card key={i} className="p-6">
                <h3 className="mb-2 font-semibold">{faq.q}</h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4">
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-12 text-center text-white">
            <h2 className="text-3xl font-bold sm:text-4xl">Ready to Maximize Your Yields?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-blue-50">
              Join thousands of users earning more with AI-powered yield optimization
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link to="/dashboard">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                  Start Free
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Contact Sales
              </Button>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
