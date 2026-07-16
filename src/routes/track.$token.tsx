import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, MapPin, Activity, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GoogleMapView } from "@/components/GoogleMapView";

export const Route = createFileRoute("/track/$token")({
  component: TrackPage,
  head: () => ({ meta: [{ title: "Live Location — Her Guardian" }, { name: "robots", content: "noindex" }] }),
});

type Live = {
  display_name: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  speed: number | null;
  updated_at: string | null;
  expires_at: string | null;
};

function TrackPage() {
  const { token } = Route.useParams();
  const [data, setData] = useState<Live | null>(null);
  const [trail, setTrail] = useState<{ lat: number; lng: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const [{ data: live, error: liveErr }, { data: tr }] = await Promise.all([
      supabase.rpc("get_shared_location", { _token: token }),
      supabase.rpc("get_shared_trail", { _token: token }),
    ]);
    if (liveErr || !live || (Array.isArray(live) && live.length === 0)) {
      setError("This tracking link has expired or is invalid.");
      return;
    }
    const row = Array.isArray(live) ? live[0] : live;
    setData(row as Live);
    setTrail(((tr ?? []) as any[]).reverse().map((r) => ({ lat: r.latitude, lng: r.longitude })));
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [token]);

  if (error) return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="glass-strong rounded-2xl p-8 max-w-sm text-center">
        <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <div className="font-semibold">{error}</div>
        <p className="text-xs text-muted-foreground mt-2">Tracking links auto-expire after 24 hours.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen px-4 py-6">
      <header className="mx-auto max-w-3xl glass-strong rounded-2xl px-5 py-3 flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 glow-pink"><Shield className="h-5 w-5 text-white" /></div>
          <span className="font-bold">Her Guardian <span className="text-gradient">2.0</span></span>
        </div>
        <span className="text-xs text-muted-foreground">Live tracking</span>
      </header>

      <div className="mx-auto max-w-3xl space-y-4">
        <div className="glass-strong rounded-2xl p-4">
          <div className="text-xs text-muted-foreground">Tracking</div>
          <div className="text-lg font-semibold">{data?.display_name ?? "Friend"}</div>
        </div>

        <GoogleMapView
          center={data?.latitude && data?.longitude ? { lat: data.latitude, lng: data.longitude } : null}
          markers={data?.latitude && data?.longitude ? [{ lat: data.latitude, lng: data.longitude, label: data.display_name ?? "Live", color: "#ec4899" }] : []}
          showAccuracy accuracy={data?.accuracy}
          trail={trail}
          height={420}
        />

        <div className="grid grid-cols-3 gap-2 text-xs">
          <Stat icon={<MapPin className="h-3.5 w-3.5" />} label="Position" value={data?.latitude ? `${data.latitude.toFixed(4)}, ${data.longitude!.toFixed(4)}` : "—"} />
          <Stat icon={<Activity className="h-3.5 w-3.5" />} label="Accuracy" value={data?.accuracy ? `±${Math.round(data.accuracy)}m` : "—"} />
          <Stat icon={<Clock className="h-3.5 w-3.5" />} label="Updated" value={data?.updated_at ? new Date(data.updated_at).toLocaleTimeString() : "—"} />
        </div>

        {data?.expires_at && (
          <p className="text-[11px] text-muted-foreground text-center">Link expires {new Date(data.expires_at).toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass rounded-lg p-2">
      <div className="flex items-center gap-1 text-muted-foreground">{icon} {label}</div>
      <div className="font-mono mt-0.5">{value}</div>
    </div>
  );
}
