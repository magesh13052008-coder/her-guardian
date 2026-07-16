import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Shield, ArrowLeft, Loader2, Search, Siren, CheckCircle2, Navigation } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { GoogleMapView } from "@/components/GoogleMapView";
import { useLiveTracker } from "@/hooks/use-live-tracker";
import { distanceMeters, getPosition, prepareSOS, type Contact, type Profile } from "@/lib/safety-core";
import { geocodePlace } from "@/lib/geocode.functions";
import { useI18n } from "@/lib/i18n";


export const Route = createFileRoute("/journey")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  component: JourneyPage,
  head: () => ({
    meta: [
      { title: "Plan Journey — Her Guardian 2.0" },
      { name: "description", content: "Plan a monitored journey: enter a destination and share live location with trusted contacts." },
      { property: "og:title", content: "Plan Journey — Her Guardian 2.0" },
      { property: "og:description", content: "Plan a monitored trip with live location sharing." },
      { property: "og:url", content: "https://https-her-guardian-app-com.lovable.app/journey" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://https-her-guardian-app-com.lovable.app/journey" }],
  }),
});

type Journey = {
  id: string; user_id: string;
  start_lat: number | null; start_lng: number | null;
  dest_lat: number; dest_lng: number; dest_name: string;
  expected_arrival: string; status: string;
  deviation_alerted: boolean; late_alerted: boolean;
};

function JourneyPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const geocode = useServerFn(geocodePlace);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [active, setActive] = useState<Journey | null>(null);
  const [dest, setDest] = useState("");
  const [destLat, setDestLat] = useState<number | null>(null);
  const [destLng, setDestLng] = useState<number | null>(null);
  const [destPretty, setDestPretty] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const [eta, setEta] = useState(30);
  const [busy, setBusy] = useState(false);
  const [route, setRoute] = useState<{ lat: number; lng: number }[]>([]);
  const pos = useLiveTracker(user?.id ?? null, !!active);
  const deviationRef = useRef(false);

  const lookup = async () => {
    setGeoErr(null);
    const q = dest.trim();
    if (q.length < 2) { setGeoErr(t("j.destEmpty")); return; }
    setGeoBusy(true);
    try {
      const res = await geocode({ data: { query: q } });
      if (!res.ok) { setGeoErr(t("j.geocodeFail")); setDestLat(null); setDestLng(null); return; }
      setDestLat(res.lat); setDestLng(res.lng); setDestPretty(res.formatted);
      toast.success(t("j.geocoded"));
    } catch (e) {
      setGeoErr(e instanceof Error ? e.message : t("j.geocodeFail"));
    } finally { setGeoBusy(false); }
  };


  useEffect(() => { if (!authLoading && !user) navigate({ to: "/login" }); }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: c }, { data: j }] = await Promise.all([
        supabase.from("profiles").select("display_name,avatar_url,phone,bio").eq("id", user.id).maybeSingle(),
        supabase.from("emergency_contacts").select("*").eq("user_id", user.id),
        supabase.from("journeys").select("*").eq("user_id", user.id).eq("status", "active").order("created_at", { ascending: false }).maybeSingle(),
      ]);
      setProfile(p ?? null);
      setContacts((c as Contact[]) ?? []);
      if (j) { setActive(j as Journey); loadRoute(j as Journey); }
    })();
  }, [user]);

  const loadRoute = async (j: Journey) => {
    if (!j.start_lat || !j.start_lng) return;
    // Privacy: do NOT send coordinates to third-party routing servers.
    // Use a straight-line "expected corridor" between start and destination instead.
    const steps = 32;
    const pts: { lat: number; lng: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      pts.push({
        lat: j.start_lat + (j.dest_lat - j.start_lat) * t,
        lng: j.start_lng + (j.dest_lng - j.start_lng) * t,
      });
    }
    setRoute(pts);
  };

  const start = async () => {
    if (!user || !dest.trim() || destLat === null || destLng === null) {
      toast.error(t("j.destEmpty"));
      return;
    }
    setBusy(true);
    try {
      const startPos = await getPosition();
      const expected = new Date(Date.now() + eta * 60_000).toISOString();
      const { data, error } = await supabase.from("journeys").insert({
        user_id: user.id,
        start_lat: startPos.coords.latitude, start_lng: startPos.coords.longitude,
        dest_lat: destLat, dest_lng: destLng, dest_name: destPretty ?? dest.trim(),
        expected_arrival: expected, status: "active",
      }).select().single();
      if (error) throw error;
      setActive(data as Journey);
      loadRoute(data as Journey);
      toast.success(t("j.started"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("j.couldNotStart"));
    } finally { setBusy(false); }
  };

  const finish = async (safe = true) => {
    if (!active) return;
    await supabase.from("journeys").update({ status: safe ? "completed" : "cancelled", ended_at: new Date().toISOString() }).eq("id", active.id);
    if (safe) {
      await supabase.from("notifications").insert({
        user_id: user!.id, type: "arrival", priority: "normal",
        title: `✅ Arrived safely at ${active.dest_name}`, body: "Journey monitoring ended.",
      });
    }
    setActive(null); setRoute([]); deviationRef.current = false;
    toast.success(safe ? t("j.arrivedToast") : t("j.cancelled"));
  };


  // Deviation + late checks
  useEffect(() => {
    if (!active || !pos || !user) return;
    const distToRoute = route.length > 0
      ? Math.min(...route.map((p) => distanceMeters(p, { lat: pos.lat, lng: pos.lng })))
      : Infinity;
    const distToDest = distanceMeters({ lat: active.dest_lat, lng: active.dest_lng }, { lat: pos.lat, lng: pos.lng });

    // Arrived
    if (distToDest < 100) { finish(true); return; }

    // Deviation > 500m from route
    if (route.length > 0 && distToRoute > 500 && !deviationRef.current && !active.deviation_alerted) {
      deviationRef.current = true;
      (async () => {
        await prepareSOS({ user, profile, contacts, source: "journey" });
        await supabase.from("journeys").update({ deviation_alerted: true }).eq("id", active.id);
        toast.warning("Route deviation alert sent to contacts");
      })();
    }

    // Late
    if (Date.now() > new Date(active.expected_arrival).getTime() && !active.late_alerted) {
      (async () => {
        await prepareSOS({ user, profile, contacts, source: "journey", customPrefix: `⏰ ${profile?.display_name ?? "Someone"} hasn't arrived yet at ${active.dest_name}.` });
        await supabase.from("journeys").update({ late_alerted: true }).eq("id", active.id);
      })();
    }
  }, [pos?.ts, active?.id, route.length]);

  if (authLoading || !user) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-pink-400" /></div>;

  const center = pos ? { lat: pos.lat, lng: pos.lng } : active ? { lat: active.dest_lat, lng: active.dest_lng } : null;
  const markers = active
    ? [
      ...(pos ? [{ lat: pos.lat, lng: pos.lng, label: t("map.you"), color: "#ec4899" }] : []),
      { lat: active.dest_lat, lng: active.dest_lng, label: active.dest_name || t("map.destination"), color: "#10b981" },
    ]
    : pos ? [{ lat: pos.lat, lng: pos.lng, label: t("map.you"), color: "#ec4899" }] : [];

  const etaCountdown = active ? Math.max(0, Math.round((new Date(active.expected_arrival).getTime() - Date.now()) / 60000)) : 0;

  return (
    <div className="min-h-screen px-4 py-6">
      <header className="mx-auto max-w-4xl glass-strong rounded-2xl px-5 py-3 flex items-center justify-between mb-6">
        <Link to="/dashboard" className="flex items-center gap-2 text-sm hover:text-pink-400 transition"><ArrowLeft className="h-4 w-4" /> {t("nav.dashboard")}</Link>
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 glow-pink"><Shield className="h-5 w-5 text-white" /></div>
          <span className="font-bold">{t("j.title")}</span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-4">
        <GoogleMapView center={center} markers={markers} trail={route} height={400} />

        {!active ? (
          <div className="glass-strong rounded-2xl p-6 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><Navigation className="h-5 w-5 text-pink-400" /> {t("j.start")}</h3>
            <div className="flex gap-2">
              <input
                value={dest}
                onChange={(e) => { setDest(e.target.value); setDestLat(null); setDestLng(null); setDestPretty(null); setGeoErr(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lookup(); } }}
                placeholder={t("j.destPlaceholder")}
                maxLength={200}
                className="flex-1 glass rounded-lg px-3 py-2 text-sm outline-none"
              />
              <button
                type="button"
                onClick={lookup}
                disabled={geoBusy || dest.trim().length < 2}
                className="glass rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/10 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {geoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {geoBusy ? t("j.searching") : t("j.searchPlace")}
              </button>
            </div>
            {destLat !== null && destLng !== null && (
              <p className="text-[11px] text-emerald-300">✓ {destPretty} ({destLat.toFixed(4)}, {destLng.toFixed(4)})</p>
            )}
            {geoErr && <p className="text-[11px] text-red-300">{geoErr}</p>}
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">{t("j.etaLabel")}</label>
              <input type="number" value={eta} onChange={(e) => setEta(Number(e.target.value) || 30)} min={5} max={300} className="glass rounded-lg px-3 py-2 text-sm w-24 outline-none" />
            </div>
            <button onClick={start} disabled={busy || contacts.length === 0 || destLat === null} className="w-full rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-semibold py-2.5 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : t("j.startBtn")}
            </button>
            {contacts.length === 0 && <p className="text-[11px] text-amber-300">{t("j.noContacts")}</p>}
          </div>
        ) : (
          <div className="glass-strong rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 bg-emerald-500/15 text-emerald-300 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> {t("j.active")}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">{t("j.eta")}: {etaCountdown} min</span>
            </div>
            <div className="text-sm">→ <span className="font-medium">{active.dest_name}</span></div>
            {pos && <div className="text-xs text-muted-foreground font-mono">{pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}</div>}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => finish(true)} className="rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 px-3 py-2.5 text-sm font-semibold flex items-center justify-center gap-2"><CheckCircle2 className="h-4 w-4" /> {t("j.arrived")}</button>
              <button onClick={async () => { await prepareSOS({ user, profile, contacts, source: "manual" }); toast.warning("SOS sent"); }} className="rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 px-3 py-2.5 text-sm font-semibold flex items-center justify-center gap-2"><Siren className="h-4 w-4" /> {t("j.sos")}</button>
            </div>
            <button onClick={() => finish(false)} className="w-full text-xs text-muted-foreground hover:text-foreground">{t("j.cancel")}</button>

          </div>
        )}
      </div>
    </div>
  );
}
