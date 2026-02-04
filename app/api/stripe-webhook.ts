/**
 * Vercel serverless: Stripe webhook handler.
 * Updates profiles.subscription_* when subscription is created/updated/deleted.
 *
 * Env: STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      STRIPE_PRICE_RANGER_*, STRIPE_PRICE_COMMANDER_*, STRIPE_PRICE_SCOUT_FREE_PLAN (optional)
 *
 * In Stripe Dashboard: add endpoint with this URL, subscribe to
 * checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
 */
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function toPlanId(priceId: string | undefined, metadataPlanId?: string): 'free' | 'pro' | 'enterprise' {
  if (metadataPlanId === 'enterprise' || metadataPlanId === 'pro') return metadataPlanId;
  if (priceId && process.env.STRIPE_PRICE_SCOUT_FREE_PLAN && priceId === process.env.STRIPE_PRICE_SCOUT_FREE_PLAN) return 'free';
  if (priceId && process.env.STRIPE_PRICE_COMMANDER_MONTHLY && priceId === process.env.STRIPE_PRICE_COMMANDER_MONTHLY) return 'enterprise';
  if (priceId && process.env.STRIPE_PRICE_COMMANDER_YEARLY && priceId === process.env.STRIPE_PRICE_COMMANDER_YEARLY) return 'enterprise';
  if (priceId && (process.env.STRIPE_PRICE_RANGER_MONTHLY === priceId || process.env.STRIPE_PRICE_RANGER_YEARLY === priceId)) return 'pro';
  return 'pro'; // default paid to pro
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!webhookSecret || !stripeSecret || !supabaseUrl || !supabaseServiceKey) {
    console.error('Webhook env missing');
    return new Response('Server configuration missing', { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid signature';
    console.error('Stripe webhook signature verification failed:', msg);
    return new Response(msg, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id ?? undefined;
        if (!userId) break;
        const subId = session.subscription as string | null;
        const planId = (session.metadata?.planId as string) || 'pro';
        const plan = planId === 'enterprise' ? 'enterprise' : 'pro';
        // Get trial end from subscription if we have it
        let trialEndsAt: string | null = null;
        if (subId) {
          const stripe = new Stripe(stripeSecret);
          const sub = await stripe.subscriptions.retrieve(subId);
          if (sub.trial_end) trialEndsAt = new Date(sub.trial_end * 1000).toISOString();
        }
        await supabase
          .from('profiles')
          .update({
            subscription_plan: plan,
            subscription_status: 'trialing',
            trial_ends_at: trialEndsAt,
            stripe_subscription_id: subId,
            stripe_customer_id: session.customer as string | null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const subId = subscription.id;
        const customerId = subscription.customer as string;
        const status = subscription.status;
        const plan = toPlanId(
          subscription.items?.data?.[0]?.price?.id,
          subscription.metadata?.planId as string | undefined
        );
        const trialEnd = subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null;
        const isTrialing = subscription.status === 'trialing' && subscription.trial_end && subscription.trial_end > Math.floor(Date.now() / 1000);
        const subscriptionStatus =
          event.type === 'customer.subscription.deleted' || status === 'canceled' || status === 'unpaid'
            ? 'canceled'
            : isTrialing
              ? 'trialing'
              : 'active';

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_subscription_id', subId);
        if (profiles?.length) {
          await supabase
            .from('profiles')
            .update({
              subscription_plan: subscriptionStatus === 'canceled' ? 'free' : plan,
              subscription_status: subscriptionStatus,
              trial_ends_at: trialEnd,
              updated_at: new Date().toISOString(),
            })
            .eq('id', profiles[0].id);
        } else {
          // Match by customer id if subscription id not set yet
          const { data: byCustomer } = await supabase
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId);
          if (byCustomer?.length) {
            await supabase
              .from('profiles')
              .update({
                subscription_plan: subscriptionStatus === 'canceled' ? 'free' : plan,
                subscription_status: subscriptionStatus,
                trial_ends_at: trialEnd,
                stripe_subscription_id: subId,
                updated_at: new Date().toISOString(),
              })
              .eq('id', byCustomer[0].id);
          }
        }
        break;
      }

      default:
        // Unhandled event type
        break;
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return new Response('Webhook handler error', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
