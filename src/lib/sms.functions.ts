import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  to: z.string().min(5).max(20),
  body: z.string().min(1).max(1500),
});

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

// Map common Twilio error codes to user-friendly messages.
// Reference: https://www.twilio.com/docs/api/errors
const friendlyTwilioError = (code: number | undefined, message: string | undefined): string => {
  switch (code) {
    case 21211: return "Invalid destination phone number (check country code and format).";
    case 21212: return "Invalid 'From' phone number — configure a valid Twilio number in Settings.";
    case 21214: return "'To' number cannot receive SMS (landline or unreachable).";
    case 21408: return "SMS to this country is not enabled on your Twilio account (check Geo Permissions).";
    case 21606: return "'From' number is not SMS-capable — use a Twilio SMS-enabled number.";
    case 21610: return "This recipient has unsubscribed (STOP) from your Twilio number.";
    case 21612: return "Cannot deliver to this destination from your Twilio number.";
    case 21614: return "'To' is not a valid mobile number.";
    case 21618: return "Message body exceeds SMS length limit.";
    case 21659: return "'From' number does not match a Twilio number you own.";
    case 21660: return "'From' number is not owned by your Twilio account.";
    case 20003: return "Twilio authentication failed — check TWILIO_API_KEY.";
    case 20404: return "Twilio account/number not found — check credentials.";
    case 21611: return "This 'From' has exceeded the queue size — throttle sends.";
    case 30003: return "Recipient handset unreachable (off/no signal).";
    case 30004: return "Recipient blocked messages from this number.";
    case 30005: return "Recipient phone number is unknown.";
    case 30006: return "Landline or unreachable — SMS not delivered.";
    case 63016: return "WhatsApp-only number — cannot send plain SMS.";
    default: return message ?? (code ? `Twilio error ${code}` : "Unknown SMS error");
  }
};

type SendResult =
  | { ok: true; sid: string | null }
  | { ok: false; error: string; code?: number; unverified?: boolean };

export const sendEmergencySms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<SendResult> => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const twilioKey = process.env.TWILIO_API_KEY;
    const from = process.env.TWILIO_FROM_NUMBER;
    if (!lovableKey || !twilioKey) {
      return { ok: false, error: "SMS gateway not configured (missing Twilio connection)." };
    }
    if (!from) {
      return { ok: false, error: "TWILIO_FROM_NUMBER is not configured. Set it in Settings → Twilio." };
    }
    const to = data.to.startsWith("+") ? data.to : `+${data.to.replace(/[^\d]/g, "")}`;
    try {
      const res = await fetch(`${GATEWAY_URL}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": twilioKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: data.body }),
      });
      const json = (await res.json().catch(() => ({}))) as { sid?: string; message?: string; code?: number };
      if (!res.ok) {
        const err = friendlyTwilioError(json.code, json.message);
        const unverified = json.code === 21608 || /unverified/i.test(json.message ?? "");
        return {
          ok: false,
          error: unverified
            ? "Trial account: verify this number in Twilio Console → Phone Numbers → Verified Caller IDs, or upgrade the account."
            : err,
          code: json.code,
          unverified,
        };
      }
      return { ok: true, sid: json.sid ?? null };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Network error reaching SMS gateway" };
    }
  });

// Read-only status check for Settings UI — never returns secret values.
export const getSmsConfigStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const from = process.env.TWILIO_FROM_NUMBER ?? "";
    const masked = from
      ? from.length > 6 ? `${from.slice(0, 3)}••••${from.slice(-3)}` : "•••"
      : null;
    return {
      hasLovableKey: !!process.env.LOVABLE_API_KEY,
      hasTwilioKey: !!process.env.TWILIO_API_KEY,
      hasFromNumber: !!from,
      fromNumberMasked: masked,
    };
  });
