import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Zap,
  Shield,
  TrendingUp,
  Layers,
  ArrowUpRight,
  CheckCircle2,
  Sparkles,
  Check
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const features = [
  {
    icon: Zap,
    title: 'Instant Cross-Chain Swaps',
    description: 'Swap from any supported crypto into high-yield assets. No bridging, no complexity.',
  },
  {
    icon: TrendingUp,
    title: 'Real-Time Yield Data',
    description: 'Live APY data from 1000+ DeFi protocols powered by DefiLlama.',
  },
  {
    icon: Shield,
    title: 'Non-Custodial & Secure',
    description: 'Your funds go directly to your wallet. We never hold your assets.',
  },
  {
    icon: Layers,
    title: 'Multi-Chain Support',
    description: 'Access yields across Ethereum, Solana, Avalanche, and more.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Browse Yields',
    description: 'Explore top-earning DeFi opportunities sorted by APY',
  },
  {
    number: '02',
    title: 'Click Swap & Earn',
    description: 'Choose any yield opportunity and select what crypto you want to swap from',
  },
  {
    number: '03',
    title: 'Send & Receive',
    description: 'Send your crypto to the deposit address and receive yield-bearing tokens instantly',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                YieldShift
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/pricing">
                <Button variant="ghost">Pricing</Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="ghost">Browse Yields</Button>
              </Link>
              <Link to="/dashboard">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10" />
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-6 flex justify-center"
            >
              <Badge className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
                <Sparkles className="mr-2 h-3 w-3" />
                Powered by SideShift + DefiLlama
              </Badge>
            </motion.div>

            <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                One-Click Entry
              </span>
              <br />
              <span className="text-foreground">into DeFi Yields</span>
            </h1>

            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Swap any crypto into high-yield DeFi assets instantly. No bridging, no complexity.
              Just swap and start earning.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link to="/dashboard">
                <Button
                  size="lg"
                  className="h-12 px-8 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  Explore Opportunities
                  <ArrowUpRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/swap">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                  Start Swapping
                </Button>
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3"
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">1000+</div>
                <div className="mt-1 text-sm text-muted-foreground">DeFi Protocols</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">100+</div>
                <div className="mt-1 text-sm text-muted-foreground">Supported Assets</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Up to 15%
                </div>
                <div className="mt-1 text-sm text-muted-foreground">Annual Yield</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl font-bold tracking-tight sm:text-4xl"
            >
              How YieldShift Works
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="mt-4 text-lg text-muted-foreground"
            >
              Three simple steps to start earning
            </motion.p>

            <div className="mt-16 grid gap-8 sm:grid-cols-3">
              {steps.map((step, index) => (
                <motion.div
                  key={step.number}
                  variants={fadeInUp}
                >
                  <Card className="relative h-full p-8 border-2 hover:border-primary/50 transition-colors">
                    <div className="absolute -top-4 left-8">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-sm font-bold text-white">
                        {index + 1}
                      </div>
                    </div>
                    <div className="text-6xl font-bold text-muted-foreground/20 mb-4">
                      {step.number}
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-24 sm:py-32 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Why Choose YieldShift?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                The easiest way to access DeFi yields across any blockchain
              </p>
            </motion.div>

            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <motion.div
                  key={feature.title}
                  variants={fadeInUp}
                >
                  <Card className="h-full p-6 hover:shadow-lg transition-shadow">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                      <feature.icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Example Yields Section */}
      <section className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Popular Yield Opportunities
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="mt-4 text-lg text-muted-foreground"
            >
              Start earning on these top-performing assets
            </motion.p>

            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { symbol: 'JITOSOL', apy: '7.2%', chain: 'Solana', protocol: 'Jito' },
                { symbol: 'STETH', apy: '3.1%', chain: 'Ethereum', protocol: 'Lido' },
                { symbol: 'SAVAX', apy: '6.8%', chain: 'Avalanche', protocol: 'BenQi' },
              ].map((token, index) => (
                <motion.div
                  key={token.symbol}
                  variants={fadeInUp}
                >
                  <Card className="p-6 border-2 hover:border-primary/50 transition-all hover:shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 font-bold text-lg">
                          {token.symbol.substring(0, 2)}
                        </div>
                        <div className="text-left">
                          <div className="font-semibold">{token.symbol}</div>
                          <div className="text-xs text-muted-foreground">{token.protocol}</div>
                        </div>
                      </div>
                      <Badge variant="secondary">{token.chain}</Badge>
                    </div>
                    <div className="mb-4">
                      <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        {token.apy}
                      </div>
                      <div className="text-sm text-muted-foreground">APY</div>
                    </div>
                    <Link to="/dashboard">
                      <Button className="w-full">
                        Swap & Earn
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </Card>
                </motion.div>
              ))}
            </div>

            <motion.div variants={fadeInUp} className="mt-12">
              <Link to="/dashboard">
                <Button variant="outline" size="lg">
                  View All Opportunities
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="relative py-24 sm:py-32 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Choose Your Plan
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="mt-4 text-lg text-muted-foreground"
            >
              From free exploration to full AI automation
            </motion.p>

            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { name: 'Free', price: '$0', features: ['Browse yields', 'Manual swaps', 'Track 5 orders'] },
                { name: 'Starter', price: '$100', features: ['AI recommendations', '4 rebalances/mo', 'Analytics'], popular: true },
                { name: 'Professional', price: '$500', features: ['Unlimited rebalancing', '5 wallets', 'Tax reports'] },
                { name: 'Institutional', price: 'Custom', features: ['Unlimited wallets', 'Multi-sig', '24/7 support'] },
              ].map((plan, i) => (
                <motion.div key={plan.name} variants={fadeInUp}>
                  <Card className={`p-6 h-full ${plan.popular ? 'border-2 border-blue-500 relative' : ''}`}>
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-gradient-to-r from-blue-600 to-purple-600">Most Popular</Badge>
                      </div>
                    )}
                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                    <div className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {plan.price}
                      {plan.price !== 'Custom' && <span className="text-sm text-muted-foreground">/mo</span>}
                    </div>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </motion.div>
              ))}
            </div>

            <motion.div variants={fadeInUp} className="mt-12">
              <Link to="/pricing">
                <Button size="lg" variant="outline">
                  View Full Pricing & Features
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-12 text-center">
              <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:60px_60px]" />
              <div className="relative">
                <h2 className="text-3xl font-bold text-white sm:text-4xl">
                  Ready to Start Earning?
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-lg text-blue-50">
                  Join thousands of users maximizing their crypto yields with YieldShift
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/dashboard">
                    <Button
                      size="lg"
                      className="bg-white text-blue-600 hover:bg-blue-50"
                    >
                      Browse Yields Now
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/swap">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white text-white hover:bg-white/10"
                    >
                      Start Swapping
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold">YieldShift</span>
            </div>
            <div className="flex gap-6">
              <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <Link to="/swap" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Swap
              </Link>
              <Link to="/orders" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Track Orders
              </Link>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-muted-foreground">
            Powered by SideShift.ai & DefiLlama • Built for SideShift WaveHack 2025
          </div>
        </div>
      </footer>
    </div>
  );
}
