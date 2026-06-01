import { Router } from 'express';
import type { Request, Response } from 'express';
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireMinRole } from '../middleware/rbac.js';
import { supabase } from '../middleware/db.js';
import type { AuthenticatedRequest } from '../types.js';

const router = Router();
const API_VERSION = 'v1';
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || '';

const STRIPE_PRICES: Record<string, string> = {
  pro: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_monthly',
  team: process.env.STRIPE_TEAM_PRICE_ID || 'price_team_monthly',
};

// ── Checkout Session ──
router.post(`/api/${API_VERSION}/billing/checkout`, authenticate, requireMinRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  if (!STRIPE_SECRET) return res.status(503).json({ error: 'Stripe not configured' });

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(STRIPE_SECRET);
    const { plan = 'pro' } = req.body;
    const priceId = STRIPE_PRICES[plan];
    if (!priceId) return res.status(400).json({ error: 'Invalid plan' });

    let customerId = req.org.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user?.email || undefined,
        metadata: { org_id: req.org.id, org_name: req.org.name },
      });
      customerId = customer.id;
      await supabase!.from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', req.org.id);
    }

    const origin = req.headers.origin || 'https://stoicagentos.com';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?upgraded=true`,
      cancel_url: `${origin}/dashboard?cancelled=true`,
      metadata: { org_id: req.org.id },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err: unknown) {
    console.error('Stripe checkout error:', (err as Error).message);
    res.status(500).json({ error: 'Failed to create checkout session', detail: (err as Error).message });
  }
});

// ── Customer Portal ──
router.post(`/api/${API_VERSION}/billing/portal`, authenticate, requireMinRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  if (!STRIPE_SECRET) return res.status(503).json({ error: 'Stripe not configured' });

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(STRIPE_SECRET);
    const customerId = req.org.stripe_customer_id;
    if (!customerId) return res.status(400).json({ error: 'No billing account. Upgrade first.' });

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.headers.origin || 'https://stoicagentos.com'}/dashboard`,
    });

    res.json({ url: portal.url });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// ── Stripe Webhook ──
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  if (!STRIPE_SECRET) return res.status(503).send('Stripe not configured');

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(STRIPE_SECRET);
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
      console.error('CRITICAL: STRIPE_WEBHOOK_SECRET not configured — rejecting webhook');
      return res.status(503).json({ error: 'Webhook verification not configured' });
    }

    const sig = req.headers['stripe-signature'] as string;
    if (!sig) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }
    const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret) as unknown as Record<string, unknown>;

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = (event.data as Record<string, unknown>).object as Record<string, unknown>;
        const orgId = (session.metadata as Record<string, string>)?.org_id;
        if (orgId) {
          let detectedPlan = 'pro';
          if (session.subscription) {
            try {
              const sub = await stripe.subscriptions.retrieve(session.subscription as string);
              const priceId = ((sub as any).items?.data?.[0]?.price?.id) as string | undefined;
              if (priceId === STRIPE_PRICES.team) detectedPlan = 'team';
              else if (priceId === STRIPE_PRICES.pro) detectedPlan = 'pro';
              console.log(`🔍 Detected price ${priceId} → plan: ${detectedPlan}`);
            } catch (subErr: unknown) {
              console.error('Could not retrieve subscription for plan detection:', (subErr as Error).message);
            }
          }
          await supabase!.from('organizations').update({
            plan: detectedPlan,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            updated_at: new Date().toISOString(),
          }).eq('id', orgId);
          console.log(`✅ Org ${orgId} upgraded to ${detectedPlan.toUpperCase()}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = (event.data as Record<string, unknown>).object as Record<string, unknown>;
        const customerId = sub.customer as string;
        const { data: org } = await supabase!.from('organizations')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();
        if (org) {
          let plan = 'free';
          if (sub.status === 'active' || sub.status === 'trialing') {
            const priceId = ((sub as any).items?.data?.[0]?.price?.id) as string | undefined;
            if (priceId === STRIPE_PRICES.team) plan = 'team';
            else if (priceId === STRIPE_PRICES.pro) plan = 'pro';
            else plan = 'pro';
          }
          await supabase!.from('organizations').update({
            plan,
            stripe_subscription_id: sub.id,
            updated_at: new Date().toISOString(),
          }).eq('id', org.id);
          console.log(`📋 Org ${org.id} subscription updated → ${plan}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = (event.data as Record<string, unknown>).object as Record<string, unknown>;
        const { data: org } = await supabase!.from('organizations')
          .select('id')
          .eq('stripe_customer_id', sub.customer as string)
          .single();
        if (org) {
          await supabase!.from('organizations').update({
            plan: 'free',
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          }).eq('id', org.id);
          console.log(`⬇️ Org ${org.id} downgraded to FREE`);
        }
        break;
      }

      default:
        break;
    }

    res.json({ received: true });
  } catch (err: unknown) {
    console.error('Webhook error:', (err as Error).message);
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
