
-- Server-side plan tier resolution
CREATE OR REPLACE FUNCTION public.get_active_plan_tier(_user_id uuid)
RETURNS int
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(p.tier), 0)
  FROM public.user_subscriptions s
  JOIN public.subscription_plans p ON p.id = s.plan_id
  WHERE s.user_id = _user_id
    AND s.status = 'active'
    AND s.current_period_end > now()
$$;

GRANT EXECUTE ON FUNCTION public.get_active_plan_tier(uuid) TO authenticated;

-- Gate live tracking inserts/updates (Premium tier >= 1)
DROP POLICY IF EXISTS "owner ll insert" ON public.live_locations;
DROP POLICY IF EXISTS "owner ll update" ON public.live_locations;
CREATE POLICY "premium ll insert" ON public.live_locations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.get_active_plan_tier(auth.uid()) >= 1);
CREATE POLICY "premium ll update" ON public.live_locations
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND public.get_active_plan_tier(auth.uid()) >= 1);

DROP POLICY IF EXISTS "owner lt insert" ON public.location_trail;
CREATE POLICY "premium lt insert" ON public.location_trail
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.get_active_plan_tier(auth.uid()) >= 1);

-- Gate AI threat detection (Super Premium tier >= 2)
DROP POLICY IF EXISTS "owner tl all" ON public.threat_logs;
CREATE POLICY "owner tl select" ON public.threat_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "super tl insert" ON public.threat_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.get_active_plan_tier(auth.uid()) >= 2);
CREATE POLICY "owner tl update" ON public.threat_logs
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner tl delete" ON public.threat_logs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Gate voice safe word (Super Premium tier >= 2)
DROP POLICY IF EXISTS "owner sw insert" ON public.safeword_settings;
DROP POLICY IF EXISTS "owner sw update" ON public.safeword_settings;
CREATE POLICY "super sw insert" ON public.safeword_settings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.get_active_plan_tier(auth.uid()) >= 2);
CREATE POLICY "super sw update" ON public.safeword_settings
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND (NOT enabled OR public.get_active_plan_tier(auth.uid()) >= 2));

-- Enforce emergency contact count by plan (Free=1, Premium+=unlimited)
CREATE OR REPLACE FUNCTION public.enforce_contact_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tier int;
  cnt int;
  cap int;
BEGIN
  tier := public.get_active_plan_tier(NEW.user_id);
  IF tier >= 1 THEN
    RETURN NEW; -- unlimited
  END IF;
  cap := 1; -- free tier
  SELECT count(*) INTO cnt FROM public.emergency_contacts WHERE user_id = NEW.user_id;
  IF cnt >= cap THEN
    RAISE EXCEPTION 'Free plan allows only % emergency contact. Upgrade to add more.', cap
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_contact_limit_trg ON public.emergency_contacts;
CREATE TRIGGER enforce_contact_limit_trg
  BEFORE INSERT ON public.emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_contact_limit();
