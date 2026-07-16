import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LivePos = { lat: number; lng: number; accuracy: number; speed: number | null; heading: number | null; ts: number };

/**
 * Watches user position, writes to live_locations + location_trail every ~10s.
 * Returns latest position for UI use.
 */
export function useLiveTracker(userId: string | null | undefined, enabled: boolean) {
  const [pos, setPos] = useState<LivePos | null>(null);
  const lastWrite = useRef(0);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !userId || typeof navigator === "undefined" || !navigator.geolocation) return;

    watchId.current = navigator.geolocation.watchPosition(
      async (p) => {
        const next: LivePos = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
          speed: p.coords.speed,
          heading: p.coords.heading,
          ts: Date.now(),
        };
        setPos(next);

        // Throttle DB writes to 10s
        if (next.ts - lastWrite.current >= 10_000) {
          lastWrite.current = next.ts;
          await supabase.from("live_locations").upsert({
            user_id: userId,
            latitude: next.lat,
            longitude: next.lng,
            accuracy: next.accuracy,
            speed: next.speed,
            heading: next.heading,
            updated_at: new Date().toISOString(),
          });
          await supabase.from("location_trail").insert({
            user_id: userId,
            latitude: next.lat,
            longitude: next.lng,
            accuracy: next.accuracy,
            speed: next.speed,
          });
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
    );

    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    };
  }, [userId, enabled]);

  return pos;
}
