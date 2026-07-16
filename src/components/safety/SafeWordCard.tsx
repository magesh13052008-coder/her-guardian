import { useEffect, useRef, useState } from "react";
import { Shield, Eye, EyeOff, Mic, Loader2, CheckCircle2, AlertTriangle, Siren } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { encodeSafeWord, decodeSafeWord, vibrate, prepareSOS, type Contact, type Profile } from "@/lib/safety-core";
import { useSafeWordListener } from "@/hooks/use-safe-word-listener";
import { sendSms, acquireWakeLock, releaseWakeLock } from "@/lib/native-bridge";
import { enqueueBulkSms, subscribeSmsQueue, clearFinishedJobs, type SmsJob } from "@/lib/sms-queue";

type Settings = { word: string; enabled: boolean };

const TEST_NUMBER_KEY = "hg_test_sms_number";

export function SafeWordCard({ user, profile, contacts }: { user: { id: string; email?: string | null }; profile: Profile | null; contacts: Contact[] }) {
  const [settings, setSettings] = useState<Settings>({ word: "", enabled: false });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testNumber, setTestNumber] = useState<string>(() => (typeof localStorage !== "undefined" ? localStorage.getItem(TEST_NUMBER_KEY) ?? "" : ""));
  const [testResult, setTestResult] = useState<string | null>(null);
  const [smsJobs, setSmsJobs] = useState<SmsJob[]>([]);

  useEffect(() => subscribeSmsQueue(setSmsJobs), []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("safeword_settings").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        const word = data.word_encoded ? await decodeSafeWord(data.word_encoded, user.id) : "";
        setSettings({ word, enabled: !!data.enabled });
      }
      setLoading(false);
    })();
  }, [user.id]);

  const save = async () => {
    if (!settings.word.trim()) return toast.error("Type a safe word first");
    setSaving(true);
    const word_encoded = await encodeSafeWord(settings.word, user.id);
    const { error } = await supabase.from("safeword_settings").upsert({
      user_id: user.id,
      word_encoded,
      enabled: settings.enabled,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Safe word saved");
  };

  const toggle = async (enabled: boolean) => {
    if (enabled && !settings.word.trim()) return toast.error("Set a safe word before enabling");
    if (enabled) {
      // request mic permission proactively
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        return toast.error("Microphone permission required");
      }
    }
    setSettings((s) => ({ ...s, enabled }));
    const word_encoded = await encodeSafeWord(settings.word, user.id);
    await supabase.from("safeword_settings").upsert({
      user_id: user.id,
      word_encoded,
      enabled,
      updated_at: new Date().toISOString(),
    });
  };

  // Acquire/release wake lock when armed so the tab keeps listening with screen on
  useEffect(() => {
    if (settings.enabled && settings.word.trim()) {
      void acquireWakeLock();
      return () => { void releaseWakeLock(); };
    }
  }, [settings.enabled, settings.word]);

  const triggeringRef = useRef(false);
  const handleTrigger = async () => {
    if (triggeringRef.current) return; // prevent duplicate triggers
    triggeringRef.current = true;
    vibrate([200, 100, 200]);
    try {
      const r = await prepareSOS({ user, profile, contacts, source: "safeword" });
      if (r.deliveries.length > 0) {
        const phones = r.deliveries.map((d) => `+${d.whatsappPhone}`);
        // Queue automatic SMS via Twilio backend (with sms: link fallback on mobile).
        enqueueBulkSms(phones, r.message);
      }
      await supabase.from("safeword_settings").update({
        last_triggered: new Date().toISOString(),
        trigger_count: ((await supabase.from("safeword_settings").select("trigger_count").eq("user_id", user.id).maybeSingle()).data?.trigger_count ?? 0) + 1,
      }).eq("user_id", user.id);
    } catch { /* silent */ }
    finally {
      setTimeout(() => { triggeringRef.current = false; }, 15_000);
    }
  };


  const runTest = async () => {
    if (!testNumber.trim()) return toast.error("Enter a test phone number first");
    setTesting(true);
    setTestResult(null);
    try {
      localStorage.setItem(TEST_NUMBER_KEY, testNumber.trim());
      vibrate([200, 100, 200]);
      const who = profile?.display_name ?? user.email ?? "Someone";
      const msg = `[TEST] Her Guardian Safe Word test from ${who} at ${new Date().toLocaleString()}.\n\nThis is only a test — no action needed.`;
      const phone = testNumber.trim().replace(/[^\d+]/g, "");
      const res = await sendSms([phone], msg);
      const summary = res.sent
        ? `✅ Silently sent via SIM to ${phone}`
        : res.fallback
          ? `📱 Opened Messages app (web fallback) — tap Send`
          : `❌ Failed${res.error ? `: ${res.error}` : ""}`;
      setTestResult(summary);
      toast.success("Test fired", { description: summary });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Test failed";
      setTestResult(`❌ ${msg}`);
      toast.error(msg);
    } finally { setTesting(false); }
  };

  const { supported, listening, error, micPermission, requestMic } = useSafeWordListener({
    enabled: settings.enabled && !!settings.word.trim(),
    phrase: settings.word,
    onTrigger: handleTrigger,
  });

  if (loading) return <div className="glass-strong rounded-2xl p-6 grid place-items-center h-40"><Loader2 className="h-5 w-5 animate-spin text-pink-400" /></div>;

  // Three-state mic status
  const micBlocked = micPermission === "denied" || micPermission === "unsupported";
  const statusPill = !supported
    ? { label: "Voice unsupported", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30", dot: "bg-yellow-400" }
    : micBlocked
      ? { label: "Permission blocked", cls: "bg-red-500/15 text-red-300 border-red-500/30", dot: "bg-red-400" }
      : settings.enabled && listening
        ? { label: "Listening", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400 animate-pulse" }
        : { label: "Not listening", cls: "bg-white/10 text-muted-foreground border-white/10", dot: "bg-white/40" };

  return (
    <div className="glass-strong rounded-2xl p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shrink-0"><Shield className="h-5 w-5 text-white" /></div>
        <div className="flex-1">
          <h3 className="font-semibold">Safe Word Protection</h3>
          <p className="text-xs text-muted-foreground">Trigger SOS with just your voice — completely silent</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusPill.cls}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${statusPill.dot}`} /> {statusPill.label}
        </span>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Your secret word or phrase</label>
        <div className="mt-1 flex gap-2">
          <div className="flex-1 glass rounded-lg flex items-center px-3">
            <input
              type={show ? "text" : "password"}
              value={settings.word}
              onChange={(e) => setSettings((s) => ({ ...s, word: e.target.value }))}
              placeholder='e.g. "Hello Priya" or "Amma help"'
              className="flex-1 bg-transparent py-2 text-sm outline-none"
            />
            <button onClick={() => setShow((s) => !s)} className="text-muted-foreground hover:text-foreground">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button onClick={save} disabled={saving} className="rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-medium px-4 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">💡 Choose a word you use naturally in conversation</p>
      </div>

      <div className="glass rounded-lg px-4 py-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Enable Safe Word</div>
          <div className="text-[11px] text-muted-foreground">Listens silently while this tab is open</div>
        </div>
        <button
          onClick={() => toggle(!settings.enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${settings.enabled ? "bg-emerald-500" : "bg-white/20"}`}
          aria-pressed={settings.enabled}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white transition ${settings.enabled ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>

      {!supported && (
        <div className="glass rounded-lg px-3 py-2 text-xs text-yellow-300 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>Voice recognition isn't supported in this browser. Use Chrome or Edge on Android/desktop. Manual emergency button below still works.</div>
        </div>
      )}
      {micPermission === "denied" && (
        <div className="glass rounded-lg px-3 py-2 text-xs text-red-300 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            Microphone permission is blocked. Voice trigger cannot work until you allow the microphone.
            <div className="mt-1 text-[10px] text-muted-foreground">
              Tap the lock icon in the address bar → Site settings → Microphone → Allow, then reload.
            </div>
          </div>
          <button onClick={requestMic} className="text-[11px] rounded bg-white/10 hover:bg-white/20 px-2 py-1">Retry</button>
        </div>
      )}
      {micPermission === "prompt" && settings.enabled && (
        <button onClick={requestMic} className="w-full glass rounded-lg px-3 py-2 text-xs flex items-center justify-center gap-2 hover:bg-white/10">
          <Mic className="h-3.5 w-3.5" /> Grant microphone permission
        </button>
      )}
      {error && micPermission !== "denied" && (
        <div className="glass rounded-lg px-3 py-2 text-xs text-red-300 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /><div>{error} — use the manual emergency button.</div>
        </div>
      )}

      {/* Manual fallback ALWAYS available regardless of voice state */}
      <button
        onClick={handleTrigger}
        className="w-full rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 px-4 py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
      >
        <Siren className="h-4 w-4" /> Manual emergency trigger
      </button>

      <div className="glass rounded-lg p-3 space-y-2">
        <label className="text-xs text-muted-foreground">Test SMS number (with country code)</label>
        <input
          type="tel"
          value={testNumber}
          onChange={(e) => setTestNumber(e.target.value)}
          placeholder="+91 98765 43210"
          className="w-full bg-transparent rounded border border-white/10 px-3 py-2 text-sm outline-none focus:border-pink-400"
        />
        <button onClick={runTest} disabled={testing} className="w-full glass rounded-lg px-4 py-2 text-sm font-medium hover:bg-white/10 transition flex items-center justify-center gap-2 disabled:opacity-50">
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Mic className="h-4 w-4" /> Send Test SOS SMS</>}
        </button>
        {testResult && (
          <div className="text-[11px] px-2 py-1.5 rounded bg-white/5 break-words">{testResult}</div>
        )}
      </div>

      {smsJobs.length > 0 && (
        <div className="glass rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold">SMS Delivery Status</div>
            <button onClick={clearFinishedJobs} className="text-[10px] text-muted-foreground hover:text-foreground">Clear done</button>
          </div>
          <div className="space-y-1.5 max-h-44 overflow-y-auto">
            {smsJobs.map((j) => {
              const color =
                j.status === "sent" ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
                : j.status === "failed" ? "text-red-300 bg-red-500/10 border-red-500/30"
                : j.status === "fallback" ? "text-amber-300 bg-amber-500/10 border-amber-500/30"
                : j.status === "retrying" ? "text-orange-300 bg-orange-500/10 border-orange-500/30"
                : "text-blue-300 bg-blue-500/10 border-blue-500/30";
              const label =
                j.status === "queued" ? "QUEUED"
                : j.status === "sending" ? "SENDING…"
                : j.status === "retrying" ? `RETRYING (${j.attempt}/${j.maxAttempts})`
                : j.status === "sent" ? "✅ SENT"
                : j.status === "fallback" ? "📱 OPENED COMPOSER"
                : "❌ FAILED";
              return (
                <div key={j.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-mono truncate flex-1">{j.phone}</span>
                  <span className={`px-2 py-0.5 rounded border text-[9px] font-semibold ${color}`}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="text-[11px] text-muted-foreground flex items-start gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-emerald-400 shrink-0" />
        <div>Trigger is silent: phone vibrates 2x and SMS is auto-sent to your emergency contacts via secure backend (with retries). Word is encrypted (AES-GCM) on your device before being saved.</div>
      </div>
    </div>
  );
}

