import { useEffect, useState } from "react";
import { Loader2, Phone, CheckCircle2, AlertTriangle, Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { getSmsConfigStatus, sendEmergencySms } from "@/lib/sms.functions";

const TEST_KEY = "hg_twilio_test_number";

type Status = {
  hasLovableKey: boolean;
  hasTwilioKey: boolean;
  hasFromNumber: boolean;
  fromNumberMasked: string | null;
};

export function TwilioSettingsCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [testNumber, setTestNumber] = useState<string>(() =>
    typeof localStorage !== "undefined" ? localStorage.getItem(TEST_KEY) ?? "" : "",
  );
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await getSmsConfigStatus();
        setStatus(s);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not read SMS config");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const runTest = async () => {
    const phone = testNumber.trim();
    if (!phone) return toast.error("Enter your phone number (with country code)");
    if (!/^\+?\d{7,15}$/.test(phone.replace(/[\s-]/g, ""))) {
      return toast.error("Number must be in E.164 format, e.g. +919876543210");
    }
    setTesting(true);
    setTestResult(null);
    localStorage.setItem(TEST_KEY, phone);
    try {
      const msg = `[TEST] Her Guardian test SMS at ${new Date().toLocaleString()}. If you received this, Twilio is configured correctly.`;
      const r = await sendEmergencySms({ data: { to: phone, body: msg } });
      if (r.ok) {
        setTestResult({ ok: true, msg: `Sent — SID ${r.sid ?? "(no sid)"}` });
        toast.success("Test SMS sent");
      } else {
        setTestResult({ ok: false, msg: r.error });
        toast.error("Test SMS failed", { description: r.error });
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : "Send failed";
      setTestResult({ ok: false, msg: err });
      toast.error(err);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-strong rounded-2xl p-6 grid place-items-center h-32">
        <Loader2 className="h-5 w-5 animate-spin text-pink-400" />
      </div>
    );
  }

  const ready = status && status.hasLovableKey && status.hasTwilioKey && status.hasFromNumber;

  return (
    <div className="glass-strong rounded-2xl p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shrink-0">
          <MessageSquare className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">SMS delivery (Twilio)</h3>
          <p className="text-xs text-muted-foreground">Backend that auto-sends emergency SMS to your contacts.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-2 text-xs">
        <ConfigRow label="Gateway key" ok={!!status?.hasLovableKey} />
        <ConfigRow label="Twilio connection" ok={!!status?.hasTwilioKey} />
        <ConfigRow
          label="From number"
          ok={!!status?.hasFromNumber}
          detail={status?.fromNumberMasked ?? "not set"}
        />
      </div>

      {!ready && (
        <div className="glass rounded-lg px-3 py-2 text-xs text-yellow-300 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            {!status?.hasTwilioKey && "Twilio connector not linked. "}
            {!status?.hasFromNumber && "TWILIO_FROM_NUMBER is not set — ask support to configure your Twilio sender number."}
          </div>
        </div>
      )}

      <div className="glass rounded-lg p-3 space-y-2">
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          <Phone className="h-3 w-3" /> Send a test SMS to your own phone
        </label>
        <div className="flex gap-2">
          <input
            type="tel"
            value={testNumber}
            onChange={(e) => setTestNumber(e.target.value)}
            placeholder="+91 98765 43210"
            className="flex-1 bg-transparent rounded border border-white/10 px-3 py-2 text-sm outline-none focus:border-pink-400"
          />
          <button
            onClick={runTest}
            disabled={testing || !ready}
            className="rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-medium px-4 disabled:opacity-50 flex items-center gap-1.5"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-3.5 w-3.5" /> Test</>}
          </button>
        </div>
        {testResult && (
          <div
            className={`text-[11px] px-2 py-1.5 rounded border break-words ${
              testResult.ok
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-red-500/10 border-red-500/30 text-red-300"
            }`}
          >
            {testResult.ok ? "✅ " : "❌ "}
            {testResult.msg}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground">
          Trial Twilio accounts can only SMS numbers verified in the Twilio Console.
        </p>
      </div>
    </div>
  );
}

function ConfigRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div
      className={`glass rounded-lg px-3 py-2 flex items-center gap-2 border ${
        ok ? "border-emerald-500/30" : "border-red-500/30"
      }`}
    >
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
      )}
      <div className="min-w-0">
        <div className="text-[11px] font-medium truncate">{label}</div>
        {detail && <div className="text-[10px] text-muted-foreground font-mono truncate">{detail}</div>}
      </div>
    </div>
  );
}
