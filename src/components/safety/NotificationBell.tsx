import { useEffect, useState } from "react";
import { Bell, X, CheckCheck, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type N = {
  id: string;
  type: string;
  priority: string;
  title: string;
  body: string;
  location_url: string | null;
  read: boolean;
  created_at: string;
};

export function NotificationBell({ userId }: { userId: string }) {
  const [items, setItems] = useState<N[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data as N[]) ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`notifications:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  const unread = items.filter((i) => !i.read).length;

  const markAll = async () => {
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    load();
  };
  const clearAll = async () => {
    await supabase.from("notifications").delete().eq("user_id", userId);
    load();
  };

  const relative = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative glass rounded-xl p-2 hover:bg-white/10 transition" aria-label="Notifications">
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 grid place-items-center h-4 min-w-4 rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[70vh] glass-strong rounded-2xl p-3 z-50 overflow-y-auto shadow-2xl">
          <div className="flex items-center mb-2">
            <h4 className="text-sm font-semibold">Notifications</h4>
            <div className="ml-auto flex gap-1">
              {unread > 0 && <button onClick={markAll} title="Mark all read" className="p-1.5 rounded hover:bg-white/10"><CheckCheck className="h-3.5 w-3.5" /></button>}
              {items.length > 0 && <button onClick={clearAll} title="Clear" className="p-1.5 rounded hover:bg-white/10"><Trash2 className="h-3.5 w-3.5" /></button>}
              <button onClick={() => setOpen(false)} className="p-1.5 rounded hover:bg-white/10"><X className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No notifications yet</p>}
          <div className="space-y-2">
            {items.map((n) => (
              <div key={n.id} className={`glass rounded-lg p-2.5 text-xs ${!n.read ? "border border-pink-500/40" : ""}`}>
                <div className="flex items-start gap-2">
                  <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${n.priority === "critical" ? "bg-red-500" : n.priority === "high" ? "bg-yellow-400" : "bg-emerald-400"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{n.title}</div>
                    <div className="text-muted-foreground mt-0.5">{n.body}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">{relative(n.created_at)}</span>
                      {n.location_url && <a href={n.location_url} target="_blank" rel="noreferrer" className="text-[10px] text-pink-400 hover:underline">View map →</a>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
