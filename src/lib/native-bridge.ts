// SMS bridge.
// 1. Native Android: silent SIM SMS via Capacitor plugin (if installed).
// 2. Backend Twilio: server-side automatic SMS (no user action).
// 3. Web fallback: open phone Messages app pre-filled (sms: link).

import { debugLog } from "./debug-log";
import { sendEmergencySms } from "./sms.functions";

let cachedIsNative: boolean | null = null;

export const isNative = (): boolean => {
  if (cachedIsNative !== null) return cachedIsNative;
  try {
    const cap = (typeof window !== "undefined" ? (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor : null);
    cachedIsNative = !!(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform());
  } catch {
    cachedIsNative = false;
  }
  return cachedIsNative;
};

export type PerRecipientResult = {
  phone: string;
  ok: boolean;
  via?: "sim" | "twilio" | "sms-link";
  error?: string;
  code?: number;
  unverified?: boolean;
};

export type SmsResult = {
  sent: boolean;             // true = at least one silently delivered (native SIM or Twilio)
  fallback: boolean;         // true = web sms: link opened
  recipients: number;
  via?: "sim" | "twilio" | "sms-link";
  error?: string;
  perRecipient?: PerRecipientResult[];
};

const tryNativeSim = async (phones: string[], message: string): Promise<SmsResult | null> => {
  if (!isNative()) return null;
  try {
    const mod = await import("@byteowls/capacitor-sms" as string).catch(() => null) as null | { SmsManager?: { send: (o: { numbers: string[]; text: string }) => Promise<unknown> }; default?: { SmsManager?: { send: (o: { numbers: string[]; text: string }) => Promise<unknown> } } };
    const SmsManager = mod?.SmsManager ?? mod?.default?.SmsManager;
    if (!SmsManager) return null;
    await SmsManager.send({ numbers: phones, text: message });
    debugLog("sms", `Native SIM SMS sent to ${phones.length}`, { phones });
    return {
      sent: true,
      fallback: false,
      recipients: phones.length,
      via: "sim",
      perRecipient: phones.map((p) => ({ phone: p, ok: true, via: "sim" })),
    };
  } catch (e) {
    debugLog("error", "Native SIM SMS failed", { error: String(e) });
    return null;
  }
};

const tryTwilio = async (phone: string, message: string): Promise<PerRecipientResult> => {
  try {
    const res = await sendEmergencySms({ data: { to: phone, body: message } });
    if (res.ok) {
      debugLog("sms", `Twilio SMS sent to ${phone}`, { sid: res.sid });
      return { phone, ok: true, via: "twilio" };
    }
    debugLog("error", `Twilio SMS failed for ${phone}`, { error: res.error, code: res.code });
    return { phone, ok: false, via: "twilio", error: res.error, code: res.code, unverified: res.unverified };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    debugLog("error", `Twilio SMS exception for ${phone}`, { error: err });
    return { phone, ok: false, via: "twilio", error: err };
  }
};

const openSmsLink = (phones: string[], message: string): SmsResult => {
  if (typeof window === "undefined") {
    return { sent: false, fallback: false, recipients: phones.length, error: "No window" };
  }
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const joined = phones.map((p) => (p.startsWith("+") ? p : `+${p}`)).join(",");
  const encoded = encodeURIComponent(message);
  const url = isIOS ? `sms:${joined}&body=${encoded}` : `sms:${joined}?body=${encoded}`;
  try { window.location.href = url; } catch { /* noop */ }
  debugLog("sms", `Opened sms: link (${phones.length} recipients)`);
  return {
    sent: false,
    fallback: true,
    recipients: phones.length,
    via: "sms-link",
    perRecipient: phones.map((p) => ({ phone: p, ok: false, via: "sms-link" })),
  };
};

export const sendSms = async (phones: string[], message: string): Promise<SmsResult> => {
  if (!phones.length) return { sent: false, fallback: false, recipients: 0 };

  // 1. Native SIM (silent)
  const native = await tryNativeSim(phones, message);
  if (native) return native;

  // 2. Backend Twilio (one-by-one, capture per-recipient errors)
  const perRecipient: PerRecipientResult[] = await Promise.all(phones.map((p) => tryTwilio(p, message)));
  const anyOk = perRecipient.some((r) => r.ok);
  const allOk = perRecipient.every((r) => r.ok);
  const lastErr = perRecipient.find((r) => !r.ok)?.error;

  if (allOk) return { sent: true, fallback: false, recipients: phones.length, via: "twilio", perRecipient };

  // 3. Fallback to sms: link on mobile
  const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    const fb = openSmsLink(phones, message);
    // Merge Twilio errors with fallback flag for UI
    return { ...fb, sent: anyOk, perRecipient };
  }
  return {
    sent: anyOk,
    fallback: false,
    recipients: phones.length,
    error: lastErr ?? "SMS send failed (desktop has no sms: fallback)",
    perRecipient,
  };
};

// Deprecated — WhatsApp auto-open removed per safety policy.
export const sendWhatsApp = async (_phone: string, _message: string): Promise<{ opened: boolean }> => {
  return { opened: false };
};

let wakeLock: { release?: () => Promise<void> } | null = null;
export const acquireWakeLock = async () => {
  try {
    if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
      wakeLock = await (navigator as Navigator & { wakeLock: { request: (t: string) => Promise<{ release?: () => Promise<void> }> } }).wakeLock.request("screen");
      debugLog("wakelock", "Wake lock acquired");
    }
  } catch (e) {
    debugLog("error", "Wake lock acquire failed", { error: String(e) });
  }
};
export const releaseWakeLock = async () => {
  try { await wakeLock?.release?.(); debugLog("wakelock", "Wake lock released"); } catch { /* noop */ }
  wakeLock = null;
};
