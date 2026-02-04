# Stripe subscription setup

This app uses Stripe Checkout for paid plans. **7-day free trial applies only to Ranger (Pro) monthly**; Ranger yearly and Commander have no trial. Scout is the free plan. After deployment, configure the following.

## 1. Stripe Dashboard

1. **Products & Prices**  
   Create products and recurring prices for:
   - **Scout (free):** optional $0 price if you use Stripe for the free tier; set `STRIPE_PRICE_SCOUT_FREE_PLAN`.
   - **Ranger (Pro):** monthly and yearly prices (e.g. $49/mo, $39/mo billed yearly). **7-day trial only on monthly.**
   - **Commander (Enterprise):** monthly and yearly (e.g. $149/mo, $119/mo billed yearly).

   Copy each **Price ID** (e.g. `price_xxx`).

2. **API keys**  
   Developers → API keys:
   - **Publishable key** → use in frontend if you add Stripe.js later (optional).
   - **Secret key** → set as `STRIPE_SECRET_KEY` in Vercel (see below).

3. **Webhook** (after the app is deployed)
   - Developers → Webhooks → Add endpoint.
   - **Endpoint URL:** `https://your-app-url.vercel.app/api/stripe-webhook`
   - **Events:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the **Signing secret** → set as `STRIPE_WEBHOOK_SECRET` in Vercel.

## 2. Vercel environment variables

In the Vercel project → Settings → Environment Variables, add:

| Variable | Where to get it | Notes |
|----------|-----------------|--------|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → API keys | Secret key (test or live) |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → your endpoint | Signing secret `whsec_...` |
| `SUPABASE_URL` | Supabase project URL | Same as `VITE_SUPABASE_URL` |
| `SUPABASE_ANON_KEY` | Supabase → API → anon key | Same as `VITE_SUPABASE_ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → service_role key | For webhook; never expose in frontend |
| `SITE_URL` | Your app URL | e.g. `https://pain-scope.vercel.app` |
| `STRIPE_PRICE_SCOUT_FREE_PLAN` | Stripe Dashboard → Scout (free) → $0 price (optional) | `price_xxx` |
| `STRIPE_PRICE_RANGER_MONTHLY` | Ranger (Pro) → monthly price (7-day trial) | `price_xxx` |
| `STRIPE_PRICE_RANGER_YEARLY` | Ranger → yearly price | `price_xxx` |
| `STRIPE_PRICE_COMMANDER_MONTHLY` | Commander (Enterprise) → monthly price | `price_xxx` |
| `STRIPE_PRICE_COMMANDER_YEARLY` | Commander → yearly price | `price_xxx` |

Redeploy after changing env vars.

## 3. Flow

- User clicks “Start 7-Day Free Trial” (Pro or Enterprise) on the Pricing page.
- Frontend calls `POST /api/create-checkout` with the Supabase access token and `planId` / `interval`.
- The API creates a Stripe Checkout session (with 7-day trial) and returns the session URL.
- User is redirected to Stripe Checkout; after completing, they are sent back to `SITE_URL/dashboard?checkout=success`.
- Stripe sends events to `/api/stripe-webhook`; the handler updates `profiles.subscription_plan`, `subscription_status`, `trial_ends_at`, and Stripe IDs.

## 4. Local development

- The frontend runs on Vite (e.g. `localhost:5173`). The `/api` routes run only on Vercel (or with `vercel dev`).
- To test checkout locally, run `vercel dev` so both the app and API run together, or deploy and test against the deployed API (leave `VITE_API_URL` unset so the built app uses the same origin as the deployment).
