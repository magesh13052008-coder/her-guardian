import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

const InputSchema = z.object({
  query: z.string().trim().min(2).max(200),
});

export const geocodePlace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) {
      throw new Error("Geocoding is not configured.");
    }

    const url = `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(data.query)}&region=in`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
      },
    });
    if (!res.ok) throw new Error(`Geocode failed (${res.status})`);
    const body = (await res.json()) as {
      status: string;
      results: Array<{
        formatted_address: string;
        geometry: { location: { lat: number; lng: number } };
      }>;
    };

    if (body.status !== "OK" || body.results.length === 0) {
      return { ok: false as const };
    }
    const top = body.results[0];
    return {
      ok: true as const,
      lat: top.geometry.location.lat,
      lng: top.geometry.location.lng,
      formatted: top.formatted_address,
    };
  });
