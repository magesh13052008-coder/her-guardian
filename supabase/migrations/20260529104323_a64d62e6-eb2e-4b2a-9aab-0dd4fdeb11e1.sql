
-- Subscription plans (publicly readable catalog)
CREATE TABLE public.subscription_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  price_inr integer NOT NULL,
  interval text NOT NULL DEFAULT 'month',
  tier integer NOT NULL,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans public read" ON public.subscription_plans FOR SELECT USING (active = true);

-- User subscriptions (owner-scoped)
CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id text NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  razorpay_payment_id text,
  razorpay_order_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_subscriptions TO authenticated;
GRANT ALL ON public.user_subscriptions TO service_role;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sub select" ON public.user_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_user_subs_user ON public.user_subscriptions(user_id, status);

-- Payment transactions audit log (owner-scoped read; only service role writes)
CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id text NOT NULL,
  razorpay_order_id text NOT NULL,
  razorpay_payment_id text,
  razorpay_signature text,
  amount_inr integer NOT NULL,
  status text NOT NULL DEFAULT 'created',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tx select" ON public.payment_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_pay_tx_order ON public.payment_transactions(razorpay_order_id);

-- Seed plans
INSERT INTO public.subscription_plans (id, name, price_inr, tier, features) VALUES
  ('free', 'Free', 0, 0, '["Emergency SOS button","1 emergency contact","Basic safety alerts","Limited location sharing"]'::jsonb),
  ('premium', 'Premium', 99, 1, '["Live location tracking","Unlimited emergency contacts","Instant SOS alerts","SMS notifications","Route tracking","Faster support"]'::jsonb),
  ('super_premium', 'Super Premium', 299, 2, '["All Premium features","AI danger detection","Voice activated SOS","Family safety dashboard","Fake call escape feature","Audio/video evidence backup","Priority emergency support","Cloud backup"]'::jsonb);

-- Update baseline so the security monitor knows about new tables
INSERT INTO public.security_baseline (table_name, rls_enabled, expected_policy_count) VALUES
  ('subscription_plans', true, 1),
  ('user_subscriptions', true, 1),
  ('payment_transactions', true, 1)
ON CONFLICT DO NOTHING;
