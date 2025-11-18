import express from 'express';
import { requireAuth, loadUser } from '../middleware/auth';
import { createCheckoutSession, createPortalSession, handleStripeWebhook, stripe } from '../services/stripe';
import { supabase } from '../db';

const router = express.Router();

// POST /api/subscriptions/checkout
router.post('/checkout', requireAuth, loadUser, async (req, res) => {
  try {
    const user = req.user;
    const { plan } = req.body;

    if (!['starter', 'professional'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const session = await createCheckoutSession(user.id, plan, user.email);
    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/subscriptions/portal
router.post('/portal', requireAuth, loadUser, async (req, res) => {
  try {
    const user = req.user;

    // Get user's subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!subscription || !subscription.stripe_customer_id) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const session = await createPortalSession(subscription.stripe_customer_id);
    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Portal error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/subscriptions/status
router.get('/status', requireAuth, loadUser, async (req, res) => {
  try {
    const user = req.user;

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    res.json({
      tier: user.subscription_tier,
      subscription: subscription || null,
    });
  } catch (error: any) {
    console.error('Status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/subscriptions/webhook (Stripe webhook)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('⚠️  Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    await handleStripeWebhook(event);
    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
