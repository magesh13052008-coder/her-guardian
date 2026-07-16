import { useEffect, useState } from "react";
import { Home, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getPosition } from "@/lib/safety-core";

type Zone = { id: string; name: string; latitude: number; longitude: number; radius_m: number };

export function SafeZonesCard({ userId }: { userId: string }) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [name, setName] = useState("");
  const [radius, setRadius] = useState(150);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("safe_zones").select("*").eq("user_id", userId).order("created_at");
      setZones((data as Zone[]) ?? []);
    })();
  }, [userId]);

  const add = async () => {
    if (!name.trim()) return toast.error("Name your zone");
    setAdding(true);
    try {
      const pos = await getPosition();
      const { data, error } = await supabase.from("safe_zones").insert({
        user_id: userId, name: name.trim(), latitude: pos.coords.latitude, longitude: pos.coords.longitude, radius_m: radius,
      }).select().single();
      if (error) throw error;
      setZones((z) => [...z, data as Zone]);
      setName("");
      toast.success(`Saved "${data.name}" at your current location`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save zone");
    } finally { setAdding(false); }
  };

  const remove = async (id: string) => {
    await supabase.from("safe_zones").delete().eq("id", id);
    setZones((z) => z.filter((x) => x.id !== id));
  };

  return (
    <div className="glass-strong rounded-2xl p-6 space-y-3">
      <div className="flex items-center gap-2">
        <Home className="h-5 w-5 text-pink-400" />
        <h3 className="font-semibold">Safe Zones</h3>
        <span className="ml-auto text-xs text-muted-foreground">{zones.length}</span>
      </div>
      <p className="text-xs text-muted-foreground">Mark places like home, college, office. After 10 PM, leaving a zone alerts contacts via the threat watcher.</p>
      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Zone name (e.g. Home)" className="glass rounded-lg px-3 py-2 text-sm outline-none" />
        <input type="number" value={radius} onChange={(e) => setRadius(Number(e.target.value) || 100)} min={50} max={1000} className="glass rounded-lg px-3 py-2 text-sm w-24 outline-none" />
        <button onClick={add} disabled={adding} className="rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-medium px-3 disabled:opacity-50">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>
      <div className="space-y-1.5">
        {zones.map((z) => (
          <div key={z.id} className="glass rounded-lg px-3 py-2 flex items-center gap-2 text-xs">
            <span className="font-medium flex-1">{z.name}</span>
            <span className="text-muted-foreground font-mono">{z.latitude.toFixed(3)}, {z.longitude.toFixed(3)}</span>
            <span className="text-muted-foreground">±{z.radius_m}m</span>
            <button onClick={() => remove(z.id)} className="p-1 rounded hover:bg-red-500/20 text-red-400"><Trash2 className="h-3 w-3" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
