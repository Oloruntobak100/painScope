-- =============================================================================
-- PainScope: subscription columns + 7-day free trial for new signups
-- =============================================================================
-- Run once in Supabase Dashboard > SQL Editor (after supabase-profiles-admin.sql).
-- Adds subscription fields and gives every new user a 7-day trial.
-- =============================================================================

-- 1. Add subscription columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

COMMENT ON COLUMN public.profiles.subscription_plan IS 'free | pro | enterprise';
COMMENT ON COLUMN public.profiles.subscription_status IS 'active | trialing | canceled | past_due';

-- 2. New signups get 7-day free trial (update handle_new_user to set trial)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, name, email, role, is_locked, updated_at,
    subscription_plan, subscription_status, trial_ends_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
    NEW.email,
    'user',
    false,
    now(),
    'free',
    'trialing',
    now() + interval '7 days'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(public.profiles.name, EXCLUDED.name),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger already exists from supabase-profiles-admin.sql; no need to recreate.
