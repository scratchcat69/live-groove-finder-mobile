-- Create subscription enums if they don't exist
DO $$ BEGIN
  CREATE TYPE public.subscription_tier AS ENUM ('free', 'discovery', 'premium');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trial');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier subscription_tier NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users can read own subscription"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- RPC to get subscription tier (used by edge functions)
CREATE OR REPLACE FUNCTION public.get_user_subscription_tier(_user_id UUID)
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT tier::TEXT FROM public.subscriptions WHERE user_id = _user_id AND status IN ('active', 'trial') LIMIT 1),
    'free'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
