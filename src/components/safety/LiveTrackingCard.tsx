import { useEffect, useState } from "react";
import { MapPin, Share2, Copy, X, Loader2, Activity } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GoogleMapView } from "@/components/GoogleMapView";
import { useLiveTracker } from "@/hooks/use-live-tracker";
import { speedLabel } from "@/lib/safety-core";

type Share = { id: string; token: string; expires_at: string; active: boolean };

export function LiveTrackingCard({ user, displayName }: { user: { id: string }; displayName: string }) {
  const [tracking, setTracking] = useState(false);
  const pos = useLiveTracker(user.id, tracking);
  const [shares, setShares] = useState<Share[]>([]);
  const [creating, setCreating] = useState(false);
  const [trail, setTrail] = useState<{ lat: number; lng: number }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("location_shares").select("*").eq("user_id", user.id).eq("active", true).order("created_at", { ascending: false });
      setShares((data as Share[]) ?? []);
    })();
  }, [user.id]);

  useEffect(() => {
    if (!tracking) return;
    (async () => {
      const { data } = await supabase.from("location_trail").select("latitude,longitude").eq("user_id", user.id).order("recorded_at", { ascending: false }).limit(10);
      setTrail((data ?? []).reverse().map((r: any) => ({ lat: r.latitude, lng: r.longitude })));
    })();
  }, [tracking, pos?.ts, user.id]);

  const createShare = async () => {
    setCreating(true);
    // Cryptographically secure token (128-bit) — no Math.random fallback
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const token = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.from("location_shares").insert({
      token, user_id: user.id, display_name: displayName, expires_at, active: true,
    }).select().single();
    setCreating(false);
    if (error) return toast.error(error.message);
    setShares((s) => [data as Share, ...s]);
    const url = `${window.location.origin}/track/${token}`;
    try { await navigator.clipboard.writeText(url); toast.success("Tracking link copied to clipboard"); }
    catch { toast.success("Link created"); }
  };

  const revoke = async (id: string) => {
    await supabase.from("location_shares").update({ active: false }).eq("id", id);
    setShares((s) => s.filter((x) => x.id !== id));
  };

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/track/${token}`;
    try { await navigator.clipboard.writeText(url); toast.success("Copied"); } catch { toast.error("Copy failed"); }
  };

  return (
    <div className="glass-strong rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-pink-400" />
        <h3 className="font-semibold">Live GPS Tracking</h3>
        <button
          onClick={() => setTracking((t) => !t)}
          className={`ml-auto text-xs rounded-lg px-3 py-1.5 font-medium transition ${tracking ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30" : "glass hover:bg-white/10"}`}
        >
          {tracking ? "● Tracking" : "Start tracking"}
        </button>
      </div>

      <GoogleMapView
        center={pos ? { lat: pos.lat, lng: pos.lng } : null}
        markers={pos ? [{ lat: pos.lat, lng: pos.lng, label: "You", color: "#ec4899" }] : []}
        showAccuracy
        accuracy={pos?.accuracy}
        trail={trail}
        height={280}
      />

      {pos && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="glass rounded-lg p-2"><div className="text-muted-foreground">Speed</div><div className="font-mono">{speedLabel(pos.speed)}</div></div>
          <div className="glass rounded-lg p-2"><div className="text-muted-foreground">Accuracy</div><div className="font-mono">±{Math.round(pos.accuracy)}m</div></div>
          <div className="glass rounded-lg p-2"><div className="text-muted-foreground">Updated</div><div className="font-mono">{new Date(pos.ts).toLocaleTimeString()}</div></div>
        </div>
      )}

      <div className="border-t border-white/5 pt-4">
        <div className="flex items-center gap-2 mb-2">
          <Share2 className="h-4 w-4 text-pink-400" />
          <h4 className="text-sm font-semibold">Share live location (24h)</h4>
          <button onClick={createShare} disabled={creating} className="ml-auto text-xs rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white px-3 py-1.5 font-medium disabled:opacity-50">
            {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : "+ New link"}
          </button>
        </div>
        {shares.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No active share links</p>}
        <div className="space-y-1.5">
          {shares.map((s) => {
            const url = `${window.location.origin}/track/${s.token}`;
            const hoursLeft = Math.max(0, Math.round((new Date(s.expires_at).getTime() - Date.now()) / 3600000));
            return (
              <div key={s.id} className="glass rounded-lg px-3 py-2 flex items-center gap-2 text-xs">
                <Activity className="h-3 w-3 text-emerald-400 shrink-0" />
                <span className="font-mono truncate flex-1">{url}</span>
                <span className="text-muted-foreground shrink-0">{hoursLeft}h</span>
                <button onClick={() => copyLink(s.token)} className="p-1 rounded hover:bg-white/10"><Copy className="h-3 w-3" /></button>
                <button onClick={() => revoke(s.id)} className="p-1 rounded hover:bg-red-500/20 text-red-400"><X className="h-3 w-3" /></button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
