/**
 * Vercel serverless: create Stripe Checkout Session.
 * 7-day free trial only for Ranger (Pro) monthly; other plans/intervals have no trial.
 *
 * POST body: { planId: 'pro' | 'enterprise', interval: 'monthly' | 'yearly' }
 * Headers: Authorization: Bearer <supabase_access_token>
 *
 * Env: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_ANON_KEY,
 *      STRIPE_PRICE_RANGER_MONTHLY, STRIPE_PRICE_RANGER_YEARLY,
 *      STRIPE_PRICE_COMMANDER_MONTHLY, STRIPE_PRICE_COMMANDER_YEARLY,
 *      STRIPE_PRICE_SCOUT_FREE_PLAN (optional, free plan),
 *      SITE_URL (e.g. https://pain-scope.vercel.app)
 */
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const TRIAL_DAYS_RANGER_MONTHLY = 7;

function getPriceId(planId: string, interval: string): string | null {
  const key =
    planId === 'pro' && interval === 'monthly'
      ? process.env.STRIPE_PRICE_RANGER_MONTHLY
      : planId === 'pro' && interval === 'yearly'
        ? process.env.STRIPE_PRICE_RANGER_YEARLY
        : planId === 'enterprise' && interval === 'monthly'
          ? process.env.STRIPE_PRICE_COMMANDER_MONTHLY
          : planId === 'enterprise' && interval === 'yearly'
            ? process.env.STRIPE_PRICE_COMMANDER_YEARLY
            : null;
  return key ?? null;
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnon = process.env.SUPABASE_ANON_KEY;
  const siteUrl = process.env.SITE_URL || request.headers.get('origin') || 'https://pain-scope.vercel.app';

  if (!stripeSecret || !supabaseUrl || !supabaseAnon) {
    return new Response(
      JSON.stringify({ error: 'Server configuration missing (Stripe or Supabase)' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing or invalid authorization' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { planId?: string; interval?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const planId = body.planId === 'enterprise' ? 'enterprise' : body.planId === 'pro' ? 'pro' : null;
  const interval = body.interval === 'yearly' ? 'yearly' : 'monthly';
  if (!planId || planId === 'free') {
    return new Response(JSON.stringify({ error: 'Invalid or free plan' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const priceId = getPriceId(planId, interval);
  if (!priceId) {
    return new Response(
      JSON.stringify({ error: 'Price not configured for this plan/interval' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnon);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized or invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const stripe = new Stripe(stripeSecret);
  const trialDays = planId === 'pro' && interval === 'monthly' ? TRIAL_DAYS_RANGER_MONTHLY : 0;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      ...(trialDays > 0 && { subscription_data: { trial_period_days: trialDays } }),
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      success_url: `${siteUrl}/dashboard?checkout=success`,
      cancel_url: `${siteUrl}/pricing`,
      metadata: { planId, interval },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stripe error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
