import { supabase } from "@/integrations/supabase/client";
import { debugLog } from "./debug-log";

export type Contact = { id: string; name: string; phone: string; relation: string | null };
export type Profile = { display_name: string | null; avatar_url: string | null; phone: string | null; bio: string | null };
export type DeliveryStatus = "pending" | "opened" | "blocked" | "confirmed" | "failed";
export type Delivery = {
  contactId: string;
  name: string;
  relation: string | null;
  phone: string;
  whatsappPhone: string;
  url: string;
  smsUrl: string;
  status: DeliveryStatus;
};


export const SUPPORT_PHONE = "+91 63829 88384";
export const SUPPORT_PHONE_DIGITS = "916382988384";
export const SUPPORT_EMAIL = "mageshsiva1305@gmail.com";
export const SUPPORT_WHATSAPP = `https://wa.me/${SUPPORT_PHONE_DIGITS}`;

export const normalizeWhatsAppPhone = (value: string): string | null => {
  let digits = value.replace(/[^\d]/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
};

export const buildWhatsAppUrl = (phone: string, message: string) => {
  const encoded = encodeURIComponent(message);
  const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    return `https://wa.me/${phone}?text=${encoded}`;
  }
  return `https://web.whatsapp.com/send?phone=${phone}&text=${encoded}`;
};

// Native SMS deep link — free for the user (uses their carrier's SMS app).
// Works on iOS/Android without backend or API costs.
export const buildSmsUrl = (phone: string, message: string) => {
  const encoded = encodeURIComponent(message);
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  // iOS uses &body=, Android uses ?body= but accepts both. + prefix required for E.164.
  return isIOS ? `sms:+${phone}&body=${encoded}` : `sms:+${phone}?body=${encoded}`;
};


// Safe word is encrypted client-side with AES-GCM. The PBKDF2 input
// combines the user's auth id with a server-derived pepper (HMAC of a
// server-only secret + userId), so a DB dump alone cannot derive the key.
const SAFEWORD_SALT = "her-guardian-safeword-v3";
const SAFEWORD_PREFIX = "v3:";

const b64encode = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
};
const b64decode = (s: string) => {
  const raw = atob(s);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

let pepperCache: { userId: string; pepper: string } | null = null;
const fetchPepper = async (userId: string): Promise<string> => {
  if (pepperCache && pepperCache.userId === userId) return pepperCache.pepper;
  const { getSafewordPepper } = await import("./safeword.functions");
  const { pepper } = await getSafewordPepper();
  pepperCache = { userId, pepper };
  return pepper;
};

const deriveSafeWordKey = async (userId: string, pepper: string): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw", enc.encode(`${pepper}:${userId}`), "PBKDF2", false, ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode(SAFEWORD_SALT), iterations: 100_000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

export const encodeSafeWord = async (raw: string, userId: string): Promise<string> => {
  const pepper = await fetchPepper(userId);
  const key = await deriveSafeWordKey(userId, pepper);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(raw.trim().toLowerCase());
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data));
  const combined = new Uint8Array(iv.length + ct.length);
  combined.set(iv, 0); combined.set(ct, iv.length);
  return SAFEWORD_PREFIX + b64encode(combined);
};

export const decodeSafeWord = async (encoded: string, userId: string): Promise<string> => {
  if (!encoded) return "";
  if (!encoded.startsWith(SAFEWORD_PREFIX)) {
    // Legacy record (v1/v2) — cannot be decrypted with the new key. User must re-save.
    return "";
  }
  try {
    const pepper = await fetchPepper(userId);
    const key = await deriveSafeWordKey(userId, pepper);
    const combined = b64decode(encoded.slice(SAFEWORD_PREFIX.length));
    const iv = combined.slice(0, 12);
    const ct = combined.slice(12);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return new TextDecoder().decode(pt);
  } catch { return ""; }
};

export const getPosition = (timeout = 10000) =>
  new Promise<GeolocationPosition>((res, rej) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      debugLog("error", "Geolocation API unavailable");
      return rej(new Error("Geolocation not supported"));
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        debugLog("location", "Position acquired", {
          lat: pos.coords.latitude.toFixed(5),
          lng: pos.coords.longitude.toFixed(5),
          accuracy: Math.round(pos.coords.accuracy),
        });
        res(pos);
      },
      (err) => {
        debugLog("error", "getCurrentPosition failed", { code: err.code, message: err.message });
        rej(err);
      },
      { enableHighAccuracy: true, timeout, maximumAge: 5000 },
    );
  });


// Haversine distance in meters
export const distanceMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
};

export const vibrate = (pattern: number | number[]) => {
  try { if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern); } catch { /* noop */ }
};

export const speedLabel = (mps: number | null | undefined) => {
  if (mps == null || isNaN(mps)) return "Stationary";
  const kmh = mps * 3.6;
  if (kmh < 1) return "Stationary";
  if (kmh < 7) return "Walking";
  if (kmh < 15) return "Running";
  if (kmh < 40) return "Cycling";
  return "Vehicle";
};

export const createNotification = async (params: {
  userId: string;
  type: string;
  priority?: "critical" | "high" | "normal" | "low";
  title: string;
  body: string;
  locationUrl?: string;
  channel?: "inapp" | "sms" | "push";
}) => {
  await supabase.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    priority: params.priority ?? "normal",
    title: params.title,
    body: params.body,
    location_url: params.locationUrl ?? null,
    channel: params.channel ?? "inapp",
  });
};

export type SOSResult = {
  message: string;
  deliveries: Delivery[];
  lat: number | null;
  lng: number | null;
  warning: string | null;
};

export const prepareSOS = async (params: {
  user: { id: string; email?: string | null };
  profile: Profile | null;
  contacts: Contact[];
  source: "manual" | "safeword" | "threat" | "journey" | "test";
  isTest?: boolean;
  customPrefix?: string;
}): Promise<SOSResult> => {
  const who = params.profile?.display_name ?? params.user.email ?? "Someone";
  const sentAt = new Date().toLocaleString();
  let lat: number | null = null;
  let lng: number | null = null;
  let warning: string | null = null;
  let mapsUrl = "";
  let accuracy: number | null = null;

  try {
    const pos = await getPosition(8000);
    lat = pos.coords.latitude;
    lng = pos.coords.longitude;
    accuracy = pos.coords.accuracy;
    mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  } catch (e) {
    warning = e instanceof Error ? e.message : "Location unavailable";
  }

  const prefix = params.customPrefix ?? (
    params.source === "safeword"
      ? `🚨 ${who} has triggered an emergency Safe Word alert!`
      : params.source === "threat"
        ? `⚠️ Her Guardian detected a potential threat near ${who}.`
        : params.source === "journey"
          ? `📍 ${who} has deviated from planned route!`
          : params.isTest
            ? `[TEST] Her Guardian test alert from ${who}.`
            : `🚨 EMERGENCY SOS from ${who}!`
  );

  let message = `${prefix}\n\n`;
  if (mapsUrl) {
    message += `Live Location: ${mapsUrl}\nLat: ${lat!.toFixed(5)}, Lng: ${lng!.toFixed(5)}`;
    if (accuracy) message += ` (±${Math.round(accuracy)}m)`;
    message += `\n`;
  } else {
    message += `Location unavailable on device — please call immediately.\n`;
  }
  message += `Time: ${sentAt}\n`;
  if (params.source === "safeword") message += `\nThis was triggered silently via voice — please respond immediately!`;
  if (params.isTest) message += `\n\n(This is only a test.)`;

  // Insert sos_alert (skip for tests)
  if (!params.isTest) {
    const { data } = await supabase.from("sos_alerts").insert({
      user_id: params.user.id,
      latitude: lat,
      longitude: lng,
      accuracy,
      address: lat != null ? `${lat.toFixed(5)}, ${lng!.toFixed(5)}` : "Location unavailable",
    }).select().single();
    void data;
  }

  // Build deliveries
  const whatsappContacts = params.contacts
    .map((c) => ({ ...c, whatsappPhone: normalizeWhatsAppPhone(c.phone) }))
    .filter((c): c is Contact & { whatsappPhone: string } => Boolean(c.whatsappPhone));

  const deliveries: Delivery[] = whatsappContacts.map((c) => ({
    contactId: c.id,
    name: c.name,
    relation: c.relation,
    phone: c.phone,
    whatsappPhone: c.whatsappPhone,
    url: buildWhatsAppUrl(c.whatsappPhone, message),
    smsUrl: buildSmsUrl(c.whatsappPhone, message),
    status: "pending",

  }));

  // Trigger log
  await supabase.from("trigger_logs").insert({
    user_id: params.user.id,
    source: params.source,
    latitude: lat,
    longitude: lng,
    contacts_notified: deliveries.length,
    is_test: !!params.isTest,
  });

  // In-app notification
  await createNotification({
    userId: params.user.id,
    type: params.isTest ? "test" : params.source === "threat" ? "threat" : "sos",
    priority: params.isTest ? "low" : "critical",
    title: params.isTest ? "✅ Test alert sent" : `🚨 SOS triggered (${params.source})`,
    body: lat != null ? `Location captured · ${deliveries.length} contact(s) notified` : `Sent without GPS · ${deliveries.length} contact(s)`,
    locationUrl: mapsUrl || undefined,
  });

  return { message, deliveries, lat, lng, warning };
};
