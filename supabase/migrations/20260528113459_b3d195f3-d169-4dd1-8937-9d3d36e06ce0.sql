
-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;

CREATE POLICY "view own role" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Security baseline
CREATE TABLE IF NOT EXISTS public.security_baseline (
  table_name text PRIMARY KEY,
  rls_enabled boolean NOT NULL,
  expected_policy_count int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.security_baseline TO authenticated;
GRANT ALL ON public.security_baseline TO service_role;
ALTER TABLE public.security_baseline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read baseline" ON public.security_baseline FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin write baseline" ON public.security_baseline FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Alerts
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  kind text NOT NULL,
  detail text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_security_alerts_open ON public.security_alerts (resolved, detected_at DESC);

GRANT SELECT, UPDATE ON public.security_alerts TO authenticated;
GRANT ALL ON public.security_alerts TO service_role;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read alerts" ON public.security_alerts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update alerts" ON public.security_alerts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Seed baseline from current state
INSERT INTO public.security_baseline (table_name, rls_enabled, expected_policy_count)
SELECT c.relname,
       c.relrowsecurity,
       (SELECT count(*) FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=c.relname)
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r'
  AND c.relname IN ('emergency_contacts','journeys','live_locations','location_shares','location_trail',
                    'notification_prefs','notifications','profiles','safe_zones','safeword_settings',
                    'sos_alerts','threat_logs','trigger_logs')
ON CONFLICT (table_name) DO UPDATE
  SET rls_enabled = EXCLUDED.rls_enabled,
      expected_policy_count = EXCLUDED.expected_policy_count,
      updated_at = now();

-- Checker
CREATE OR REPLACE FUNCTION public.check_security_baseline()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  b RECORD;
  live_rls boolean;
  live_count int;
  inserted int := 0;
  exists_open boolean;
BEGIN
  FOR b IN SELECT * FROM public.security_baseline LOOP
    SELECT c.relrowsecurity INTO live_rls
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=b.table_name AND c.relkind='r';

    IF live_rls IS NULL THEN
      SELECT EXISTS(SELECT 1 FROM public.security_alerts
        WHERE table_name=b.table_name AND kind='table_missing' AND NOT resolved) INTO exists_open;
      IF NOT exists_open THEN
        INSERT INTO public.security_alerts(table_name, kind, detail)
        VALUES (b.table_name,'table_missing','Tracked table no longer exists in public schema.');
        inserted := inserted + 1;
      END IF;
      CONTINUE;
    END IF;

    IF b.rls_enabled AND NOT live_rls THEN
      SELECT EXISTS(SELECT 1 FROM public.security_alerts
        WHERE table_name=b.table_name AND kind='rls_disabled' AND NOT resolved) INTO exists_open;
      IF NOT exists_open THEN
        INSERT INTO public.security_alerts(table_name, kind, detail)
        VALUES (b.table_name,'rls_disabled','Row-Level Security was disabled on this table.');
        inserted := inserted + 1;
      END IF;
    END IF;

    SELECT count(*) INTO live_count FROM pg_policies
      WHERE schemaname='public' AND tablename=b.table_name;

    IF live_count < b.expected_policy_count THEN
      SELECT EXISTS(SELECT 1 FROM public.security_alerts
        WHERE table_name=b.table_name AND kind='policy_removed' AND NOT resolved) INTO exists_open;
      IF NOT exists_open THEN
        INSERT INTO public.security_alerts(table_name, kind, detail)
        VALUES (b.table_name,'policy_removed',
          format('Policy count dropped from %s to %s.', b.expected_policy_count, live_count));
        inserted := inserted + 1;
      END IF;
    END IF;
  END LOOP;
  RETURN inserted;
END $$;

GRANT EXECUTE ON FUNCTION public.check_security_baseline() TO service_role;

-- Schedule hourly
DO $$ BEGIN
  PERFORM cron.unschedule('security-baseline-check');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'security-baseline-check',
  '0 * * * *',
  $$ SELECT public.check_security_baseline(); $$
);
