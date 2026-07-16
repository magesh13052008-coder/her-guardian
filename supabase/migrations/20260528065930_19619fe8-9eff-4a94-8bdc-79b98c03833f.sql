
-- 1. Remove permissive token-bypass policies on location_shares
DROP POLICY IF EXISTS "public ls read by token" ON public.location_shares;
DROP POLICY IF EXISTS "auth ls read by token" ON public.location_shares;
-- Owner-only "owner ls all" policy remains; anonymous tracking uses get_shared_location() SECURITY DEFINER RPC.

-- 2. Realtime channel access control (broadcast/presence)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users subscribe to own topic" ON realtime.messages;
CREATE POLICY "users subscribe to own topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE (auth.uid()::text || ':%')
  OR realtime.topic() = auth.uid()::text
);

DROP POLICY IF EXISTS "users publish to own topic" ON realtime.messages;
CREATE POLICY "users publish to own topic"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() LIKE (auth.uid()::text || ':%')
  OR realtime.topic() = auth.uid()::text
);
