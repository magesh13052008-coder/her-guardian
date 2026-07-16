import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2, RefreshCw } from "lucide-react";
import { getLogs, clearLogs, subscribeLogs, getLastWakeLockTime, type LogEntry } from "@/lib/debug-log";
import { isNative } from "@/lib/native-bridge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/debug")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  component: DebugPage,
  head: () => ({
    meta: [
      { title: "Debug Logs — Her Guardian" },
      { name: "description", content: "Internal debug logs for SMS and location events." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const kindColor: Record<LogEntry["kind"], string> = {
  sms: "text-emerald-300 bg-emerald-500/10",
  location: "text-blue-300 bg-blue-500/10",
  wakelock: "text-purple-300 bg-purple-500/10",
  permission: "text-amber-300 bg-amber-500/10",
  sos: "text-pink-300 bg-pink-500/10",
  info: "text-slate-300 bg-slate-500/10",
  error: "text-red-300 bg-red-500/10",
};

function DebugPage() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>("all");

  const refresh = () => setEntries(getLogs());
  useEffect(() => { refresh(); return subscribeLogs(refresh); }, []);

  const filtered = filter === "all" ? entries : entries.filter((e) => e.kind === filter);
  const lastWake = getLastWakeLockTime();

  return (
    <div className="min-h-screen bg-background text-foreground p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex gap-2">
          <button onClick={refresh} className="inline-flex items-center gap-1 text-xs rounded-md border border-white/10 px-3 py-1.5 hover:bg-white/5"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
          <button onClick={() => { clearLogs(); refresh(); }} className="inline-flex items-center gap-1 text-xs rounded-md border border-red-500/30 text-red-300 px-3 py-1.5 hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /> Clear</button>
        </div>
      </div>

      <h1 className="text-2xl font-bold">Debug Logs</h1>
      <p className="text-xs text-muted-foreground mt-1">SMS, location, wake-lock, permission events. Most recent first. Stored on this device only.</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="glass rounded-lg p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Runtime</div>
          <div className="mt-1 text-sm font-medium">{isNative() ? "📱 Native (Capacitor)" : "🌐 Web browser"}</div>
        </div>
        <div className="glass rounded-lg p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Last wake lock</div>
          <div className="mt-1 text-sm font-medium">{lastWake ? new Date(lastWake).toLocaleString() : "—"}</div>
        </div>
      </div>

      <div className="mt-4 flex gap-2 flex-wrap">
        {(["all", "sms", "location", "wakelock", "permission", "sos", "info", "error"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition ${filter === k ? "bg-white/10 border-white/30" : "border-white/10 hover:bg-white/5"}`}
          >{k} {k !== "all" && `(${entries.filter((e) => e.kind === k).length})`}</button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {filtered.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-12 glass rounded-lg">No log entries yet.</div>
        )}
        {filtered.map((e, i) => (
          <div key={i} className="glass rounded-lg p-3 text-xs">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className={`inline-block text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded ${kindColor[e.kind]}`}>{e.kind}</span>
              <span className="text-[10px] text-muted-foreground">{new Date(e.ts).toLocaleString()}</span>
            </div>
            <div className="text-foreground">{e.message}</div>
            {e.data && (
              <pre className="mt-1.5 text-[10px] text-muted-foreground bg-black/20 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words">{JSON.stringify(e.data, null, 2)}</pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
