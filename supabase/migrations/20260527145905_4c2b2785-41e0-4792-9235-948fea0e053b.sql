
-- Safe Word settings (one row per user)
CREATE TABLE public.safeword_settings (
  user_id UUID PRIMARY KEY,
  word_encoded TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  trigger_count INTEGER NOT NULL DEFAULT 0,
  last_triggered TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safeword_settings TO authenticated;
GRANT ALL ON public.safeword_settings TO service_role;
ALTER TABLE public.safeword_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner sw select" ON public.safeword_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "owner sw insert" ON public.safeword_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner sw update" ON public.safeword_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "owner sw delete" ON public.safeword_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Live current location (one row per user, upserted)
CREATE TABLE public.live_locations (
  user_id UUID PRIMARY KEY,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_locations TO authenticated;
GRANT ALL ON public.live_locations TO service_role;
ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner ll select" ON public.live_locations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "owner ll insert" ON public.live_locations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner ll update" ON public.live_locations FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "owner ll delete" ON public.live_locations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Location trail (last N points)
CREATE TABLE public.location_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX location_trail_user_time_idx ON public.location_trail(user_id, recorded_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.location_trail TO authenticated;
GRANT ALL ON public.location_trail TO service_role;
ALTER TABLE public.location_trail ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner lt select" ON public.location_trail FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "owner lt insert" ON public.location_trail FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner lt delete" ON public.location_trail FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Public location shares (token-based, 24h expiry)
CREATE TABLE public.location_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  display_name TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX location_shares_token_idx ON public.location_shares(token);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.location_shares TO authenticated;
GRANT SELECT ON public.location_shares TO anon;
GRANT ALL ON public.location_shares TO service_role;
ALTER TABLE public.location_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner ls all" ON public.location_shares FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "public ls read by token" ON public.location_shares FOR SELECT TO anon USING (active = true AND expires_at > now());
CREATE POLICY "auth ls read by token" ON public.location_shares FOR SELECT TO authenticated USING (active = true AND expires_at > now());

-- Public RPC to fetch live location by share token (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_shared_location(_token TEXT)
RETURNS TABLE (
  display_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  updated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.display_name, l.latitude, l.longitude, l.accuracy, l.speed, l.updated_at, s.expires_at
  FROM public.location_shares s
  LEFT JOIN public.live_locations l ON l.user_id = s.user_id
  WHERE s.token = _token AND s.active = true AND s.expires_at > now()
  LIMIT 1;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_shared_location(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_shared_trail(_token TEXT)
RETURNS TABLE (latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, recorded_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT t.latitude, t.longitude, t.recorded_at
  FROM public.location_shares s
  JOIN public.location_trail t ON t.user_id = s.user_id
  WHERE s.token = _token AND s.active = true AND s.expires_at > now()
  ORDER BY t.recorded_at DESC
  LIMIT 10;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_shared_trail(TEXT) TO anon, authenticated;

-- Journeys (route monitoring)
CREATE TABLE public.journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  start_lat DOUBLE PRECISION,
  start_lng DOUBLE PRECISION,
  dest_lat DOUBLE PRECISION NOT NULL,
  dest_lng DOUBLE PRECISION NOT NULL,
  dest_name TEXT NOT NULL,
  expected_arrival TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  deviation_alerted BOOLEAN NOT NULL DEFAULT false,
  late_alerted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journeys TO authenticated;
GRANT ALL ON public.journeys TO service_role;
ALTER TABLE public.journeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner j all" ON public.journeys FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Safe zones
CREATE TABLE public.safe_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  radius_m INTEGER NOT NULL DEFAULT 150,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.safe_zones TO authenticated;
GRANT ALL ON public.safe_zones TO service_role;
ALTER TABLE public.safe_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner sz all" ON public.safe_zones FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- In-app notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  location_url TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  delivered BOOLEAN NOT NULL DEFAULT true,
  channel TEXT NOT NULL DEFAULT 'inapp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_time_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner n all" ON public.notifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Notification preferences
CREATE TABLE public.notification_prefs (
  user_id UUID PRIMARY KEY,
  threat_enabled BOOLEAN NOT NULL DEFAULT true,
  journey_enabled BOOLEAN NOT NULL DEFAULT true,
  arrival_enabled BOOLEAN NOT NULL DEFAULT true,
  checkin_enabled BOOLEAN NOT NULL DEFAULT true,
  quiet_start INTEGER,
  quiet_end INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_prefs TO authenticated;
GRANT ALL ON public.notification_prefs TO service_role;
ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner np all" ON public.notification_prefs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Threat detection log
CREATE TABLE public.threat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  threat_type TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  detail TEXT,
  action_taken TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX threat_logs_user_time_idx ON public.threat_logs(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.threat_logs TO authenticated;
GRANT ALL ON public.threat_logs TO service_role;
ALTER TABLE public.threat_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner tl all" ON public.threat_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Safe word trigger logs
CREATE TABLE public.trigger_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  contacts_notified INTEGER NOT NULL DEFAULT 0,
  is_test BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX trigger_logs_user_time_idx ON public.trigger_logs(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trigger_logs TO authenticated;
GRANT ALL ON public.trigger_logs TO service_role;
ALTER TABLE public.trigger_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner trl all" ON public.trigger_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Enable realtime for shareable tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
