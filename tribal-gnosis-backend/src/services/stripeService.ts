import Stripe from 'stripe';
import { Tenant, BillingEvent } from '../models/index';
import { SUBSCRIPTION_TIERS } from '../models/index';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

// Stripe Price IDs for each tier (these would be created in Stripe Dashboard)
const STRIPE_PRICE_IDS = {
  STARTER: process.env.STRIPE_PRICE_STARTER || 'price_starter', // Free tier
  GROWTH: process.env.STRIPE_PRICE_GROWTH || 'price_growth', 
  PROFESSIONAL: process.env.STRIPE_PRICE_PROFESSIONAL || 'price_professional',
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise',
  ENTERPRISE_PLUS: process.env.STRIPE_PRICE_ENTERPRISE_PLUS || 'price_enterprise_plus'
};

// Create Stripe customer for tenant
export const createStripeCustomer = async (tenant: any) => {
  try {
    const customer = await stripe.customers.create({
      email: `admin@${tenant.domain}`,
      name: tenant.name,
      metadata: {
        tenantId: tenant._id.toString(),
        companyCode: tenant.companyCode
      }
    });

    // Update tenant with Stripe customer ID
    tenant.subscription.stripeCustomerId = customer.id;
    await tenant.save();

    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
};

// Create subscription for tenant
export const createSubscription = async (tenantId: string, priceId: string) => {
  try {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    let customerId = tenant.subscription.stripeCustomerId;
    
    // Create customer if doesn't exist
    if (!customerId) {
      const customer = await createStripeCustomer(tenant);
      customerId = customer.id;
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        tenantId: tenant._id.toString()
      }
    });

    // Update tenant subscription info
    tenant.subscription.stripeSubscriptionId = subscription.id;
    tenant.subscription.status = subscription.status;
    tenant.subscription.currentPeriodStart = new Date(subscription.current_period_start * 1000);
    tenant.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);

    // Update tier based on price ID
    const tier = Object.keys(STRIPE_PRICE_IDS).find(
      key => STRIPE_PRICE_IDS[key as keyof typeof STRIPE_PRICE_IDS] === priceId
    );
    if (tier) {
      tenant.subscription.tier = tier;
    }

    await tenant.save();

    return {
      subscription,
      clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret
    };
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
};

// Update subscription tier
export const updateSubscription = async (tenantId: string, newTier: string) => {
  try {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const subscriptionId = tenant.subscription.stripeSubscriptionId;
    if (!subscriptionId) throw new Error('No active subscription found');

    const newPriceId = STRIPE_PRICE_IDS[newTier as keyof typeof STRIPE_PRICE_IDS];
    if (!newPriceId) throw new Error('Invalid subscription tier');

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Update subscription with new price
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId
      }],
      proration_behavior: 'always_invoice'
    });

    // Update tenant
    tenant.subscription.tier = newTier;
    tenant.subscription.status = updatedSubscription.status;
    await tenant.save();

    return updatedSubscription;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
};

// Cancel subscription
export const cancelSubscription = async (tenantId: string, immediate: boolean = false) => {
  try {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const subscriptionId = tenant.subscription.stripeSubscriptionId;
    if (!subscriptionId) throw new Error('No active subscription found');

    if (immediate) {
      // Cancel immediately
      await stripe.subscriptions.cancel(subscriptionId);
      tenant.subscription.status = 'canceled';
    } else {
      // Cancel at period end
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      });
      tenant.subscription.cancelAtPeriodEnd = true;
    }

    await tenant.save();
    return { success: true };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
};

// Get subscription details
export const getSubscriptionDetails = async (tenantId: string) => {
  try {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    const subscriptionId = tenant.subscription.stripeSubscriptionId;
    if (!subscriptionId) {
      return {
        tier: tenant.subscription.tier,
        status: 'inactive',
        usage: tenant.usage.currentPeriod
      };
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice']
    });

    return {
      tier: tenant.subscription.tier,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      usage: tenant.usage.currentPeriod,
      latestInvoice: subscription.latest_invoice
    };
  } catch (error) {
    console.error('Error getting subscription details:', error);
    throw error;
  }
};

// Create payment intent for one-time charges
export const createPaymentIntent = async (
  tenantId: string,
  amount: number,
  description: string
) => {
  try {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    let customerId = tenant.subscription.stripeCustomerId;
    
    if (!customerId) {
      const customer = await createStripeCustomer(tenant);
      customerId = customer.id;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      customer: customerId,
      description,
      metadata: {
        tenantId: tenant._id.toString()
      }
    });

    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

// Handle Stripe webhooks
export const handleWebhook = async (event: Stripe.Event) => {
  try {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Record billing event
    await recordBillingEvent(event);
  } catch (error) {
    console.error('Error handling webhook:', error);
    throw error;
  }
};

// Helper functions for webhook handling
const handlePaymentSucceeded = async (event: Stripe.Event) => {
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = invoice.subscription as string;
  
  if (subscriptionId) {
    const tenant = await Tenant.findOne({ 
      'subscription.stripeSubscriptionId': subscriptionId 
    });
    
    if (tenant) {
      tenant.subscription.status = 'active';
      await tenant.save();
    }
  }
};

const handlePaymentFailed = async (event: Stripe.Event) => {
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = invoice.subscription as string;
  
  if (subscriptionId) {
    const tenant = await Tenant.findOne({ 
      'subscription.stripeSubscriptionId': subscriptionId 
    });
    
    if (tenant) {
      tenant.subscription.status = 'past_due';
      await tenant.save();
    }
  }
};

const handleSubscriptionUpdated = async (event: Stripe.Event) => {
  const subscription = event.data.object as Stripe.Subscription;
  
  const tenant = await Tenant.findOne({ 
    'subscription.stripeSubscriptionId': subscription.id 
  });
  
  if (tenant) {
    tenant.subscription.status = subscription.status;
    tenant.subscription.currentPeriodStart = new Date(subscription.current_period_start * 1000);
    tenant.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    tenant.subscription.cancelAtPeriodEnd = subscription.cancel_at_period_end;
    
    await tenant.save();
  }
};

const handleSubscriptionDeleted = async (event: Stripe.Event) => {
  const subscription = event.data.object as Stripe.Subscription;
  
  const tenant = await Tenant.findOne({ 
    'subscription.stripeSubscriptionId': subscription.id 
  });
  
  if (tenant) {
    tenant.subscription.status = 'canceled';
    tenant.subscription.tier = 'STARTER'; // Downgrade to free tier
    await tenant.save();
  }
};

const recordBillingEvent = async (event: Stripe.Event) => {
  try {
    let tenantId: string | undefined;
    
    // Extract tenant ID from event metadata
    if ('metadata' in event.data.object) {
      tenantId = (event.data.object as any).metadata?.tenantId;
    }
    
    if (!tenantId) return;

    const billingEvent = new BillingEvent({
      tenantId,
      stripeEventId: event.id,
      eventType: event.type,
      amount: ('amount_paid' in event.data.object) ? 
        (event.data.object as any).amount_paid : 0,
      status: ('status' in event.data.object) ? 
        (event.data.object as any).status : 'unknown',
      metadata: event.data.object
    });

    await billingEvent.save();
  } catch (error) {
    console.error('Error recording billing event:', error);
  }
};

export {
  stripe,
  STRIPE_PRICE_IDS
};