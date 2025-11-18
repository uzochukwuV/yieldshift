import Stripe from 'stripe';
import { supabase } from '../db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const PLANS = {
  starter: {
    name: 'Starter',
    price_id: process.env.STRIPE_STARTER_PRICE_ID!,
    price: 100,
  },
  professional: {
    name: 'Professional',
    price_id: process.env.STRIPE_PROFESSIONAL_PRICE_ID!,
    price: 500,
  },
};

// Create checkout session
export async function createCheckoutSession(
  userId: string,
  plan: 'starter' | 'professional',
  email: string
) {
  if (!PLANS[plan]) {
    throw new Error(`Invalid plan: ${plan}`);
  }

  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: PLANS[plan].price_id,
        quantity: 1,
      },
    ],
    success_url: `${process.env.FRONTEND_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/pricing?canceled=true`,
    metadata: {
      userId,
      plan,
    },
    subscription_data: {
      trial_period_days: 7, // 7-day free trial
      metadata: {
        userId,
        plan,
      },
    },
  });

  return session;
}

// Create customer portal session
export async function createPortalSession(customerId: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.FRONTEND_URL}/dashboard`,
  });

  return session;
}

// Handle successful payment
export async function handleSuccessfulPayment(session: Stripe.Checkout.Session) {
  const { userId, plan } = session.metadata!;

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

  // Create or update subscription in database
  const { error } = await supabase.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: session.customer as string,
    stripe_subscription_id: session.subscription as string,
    plan,
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000),
    current_period_end: new Date(subscription.current_period_end * 1000),
    cancel_at_period_end: subscription.cancel_at_period_end,
  });

  if (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }

  // Update user tier
  await supabase
    .from('users')
    .update({ subscription_tier: plan })
    .eq('id', userId);

  console.log(`✅ Subscription created for user ${userId} - Plan: ${plan}`);
}

// Handle subscription update
export async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const { userId, plan } = subscription.metadata;

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end,
      plan: plan || 'starter', // Fallback in case metadata is missing
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }

  // Update user tier if subscription is active
  if (subscription.status === 'active' && plan) {
    await supabase
      .from('users')
      .update({ subscription_tier: plan })
      .eq('id', userId);
  }

  // Downgrade to free if subscription canceled/past_due
  if (['canceled', 'unpaid'].includes(subscription.status)) {
    await supabase
      .from('users')
      .update({ subscription_tier: 'free' })
      .eq('id', userId);
  }

  console.log(`✅ Subscription updated: ${subscription.id} - Status: ${subscription.status}`);
}

// Handle subscription cancellation
export async function handleSubscriptionCancellation(subscription: Stripe.Subscription) {
  const { userId } = subscription.metadata;

  // Mark as canceled
  await supabase
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('stripe_subscription_id', subscription.id);

  // Downgrade to free tier
  await supabase
    .from('users')
    .update({ subscription_tier: 'free' })
    .eq('id', userId);

  console.log(`❌ Subscription canceled for user ${userId}`);
}

// Handle Stripe webhook
export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleSuccessfulPayment(session);
      break;
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdate(subscription);
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionCancellation(subscription);
      break;
    }
    case 'invoice.payment_succeeded': {
      console.log('✅ Payment succeeded:', event.data.object.id);
      break;
    }
    case 'invoice.payment_failed': {
      console.log('❌ Payment failed:', event.data.object.id);
      break;
    }
  }
}

export { stripe };
