import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ShieldCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/security")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: SecurityPage,
  head: () => ({
    meta: [
      { title: "Security Monitor — Her Guardian 2.0" },
      { name: "description", content: "Internal security baseline monitor: review RLS alerts and database posture for the Her Guardian app." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

type Alert = {
  id: string;
  table_name: string;
  kind: string;
  detail: string | null;
  detected_at: string;
  resolved: boolean;
  resolved_at: string | null;
};

type Baseline = { table_name: string; rls_enabled: boolean; expected_policy_count: number; updated_at: string };

function SecurityPage() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [baseline, setBaseline] = useState<Baseline[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      setIsAdmin(!!roles?.some((r: any) => r.role === "admin"));
    })();
  }, []);

  const load = async () => {
    setLoading(true);
    const [a, b] = await Promise.all([
      supabase.from("security_alerts").select("*").order("detected_at", { ascending: false }).limit(100),
      supabase.from("security_baseline").select("*").order("table_name"),
    ]);
    if (!a.error) setAlerts((a.data ?? []) as Alert[]);
    if (!b.error) setBaseline((b.data ?? []) as Baseline[]);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const resolve = async (id: string) => {
    const { error } = await supabase
      .from("security_alerts")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Resolved"); load(); }
  };


  if (isAdmin === null) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold">Security monitoring</h1>
        <p className="text-sm text-muted-foreground">
          This page is restricted to admin accounts. Admin access can only be granted by an existing admin
          or directly in the backend — it cannot be claimed from the app for security reasons.
        </p>
        <Button variant="ghost" onClick={() => navigate({ to: "/dashboard" })}>Back</Button>
      </div>
    );
  }

  const openAlerts = alerts.filter((a) => !a.resolved);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {openAlerts.length === 0 ? <ShieldCheck className="text-emerald-500" /> : <ShieldAlert className="text-red-500" />}
            Security monitoring
          </h1>
          <p className="text-sm text-muted-foreground">Hourly scan checks RLS and policies against your baseline.</p>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Open regressions ({openAlerts.length})</h2>
        {openAlerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No regressions detected. ✅</p>
        ) : (
          <ul className="space-y-3">
            {openAlerts.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-4 border-b pb-3 last:border-0">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">{a.kind}</Badge>
                    <span className="font-mono text-sm">{a.table_name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{a.detail}</p>
                  <p className="text-xs text-muted-foreground">{new Date(a.detected_at).toLocaleString()}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => resolve(a.id)}>Mark resolved</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">Baseline ({baseline.length} tables tracked)</h2>
        <div className="text-xs grid grid-cols-3 font-semibold text-muted-foreground pb-2 border-b">
          <span>Table</span><span>RLS</span><span>Policies</span>
        </div>
        {baseline.map((b) => (
          <div key={b.table_name} className="text-sm grid grid-cols-3 py-1.5 border-b last:border-0">
            <span className="font-mono">{b.table_name}</span>
            <span>{b.rls_enabled ? "✅ on" : "❌ off"}</span>
            <span>{b.expected_policy_count}</span>
          </div>
        ))}
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-2">Recent activity</h2>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No alerts logged yet.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {alerts.slice(0, 20).map((a) => (
              <li key={a.id} className="flex items-center justify-between">
                <span>
                  <span className={a.resolved ? "text-muted-foreground line-through" : ""}>
                    {a.kind} · {a.table_name}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">{new Date(a.detected_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
