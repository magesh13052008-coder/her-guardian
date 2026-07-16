import { useEffect, useRef, useState } from "react";
import { Brain, Mic, MicOff, AlertTriangle, History } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { distanceMeters, prepareSOS, createNotification, type Contact, type Profile } from "@/lib/safety-core";
import { useLiveTracker } from "@/hooks/use-live-tracker";
import { useI18n } from "@/lib/i18n";


type ThreatLog = { id: string; threat_type: string; risk_level: string; detail: string | null; action_taken: string | null; created_at: string };
type Zone = { latitude: number; longitude: number; radius_m: number };

type Risk = "safe" | "moderate" | "high";

export function ThreatDetectorCard({ user, profile, contacts }: { user: { id: string; email?: string | null }; profile: Profile | null; contacts: Contact[] }) {
  const { t } = useI18n();

  const [audioOn, setAudioOn] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [logs, setLogs] = useState<ThreatLog[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [prompt, setPrompt] = useState<{ kind: string; deadline: number } | null>(null);
  const pos = useLiveTracker(user.id, true);

  const audioRef = useRef<{ ctx: AudioContext; analyser: AnalyserNode; stream: MediaStream } | null>(null);
  const lastAlert = useRef(0);
  const stationarySince = useRef<{ at: number; lat: number; lng: number } | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: l }, { data: z }] = await Promise.all([
        supabase.from("threat_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
        supabase.from("safe_zones").select("latitude,longitude,radius_m").eq("user_id", user.id),
      ]);
      setLogs((l as ThreatLog[]) ?? []);
      setZones((z as Zone[]) ?? []);
    })();
  }, [user.id]);

  // Compute current risk
  const hour = new Date().getHours();
  const isNight = hour >= 21 || hour < 6;
  const inSafeZone = pos && zones.some((z) => distanceMeters({ lat: z.latitude, lng: z.longitude }, { lat: pos.lat, lng: pos.lng }) <= z.radius_m);
  const moving = pos && (pos.speed ?? 0) > 0.5;
  const risk: Risk = isNight && !inSafeZone ? (moving ? "moderate" : "high") : isNight ? "moderate" : "safe";

  // Stationary watcher (15min at night, unknown location)
  useEffect(() => {
    if (!pos) return;
    if (inSafeZone) { stationarySince.current = null; return; }
    if (!moving) {
      if (!stationarySince.current) stationarySince.current = { at: Date.now(), lat: pos.lat, lng: pos.lng };
      else if (isNight && Date.now() - stationarySince.current.at > 15 * 60 * 1000 && Date.now() - lastAlert.current > 60_000) {
        lastAlert.current = Date.now();
        triggerPreAlert("stationary_night", "Stationary 15+ min at night in an unknown location");
      }
    } else {
      stationarySince.current = null;
    }
  }, [pos?.ts, isNight, inSafeZone, moving]);

  const triggerPreAlert = async (kind: string, detail: string) => {
    await supabase.from("threat_logs").insert({
      user_id: user.id, threat_type: kind, risk_level: "high",
      latitude: pos?.lat, longitude: pos?.lng, detail, action_taken: "pre-alert",
    });
    await createNotification({
      userId: user.id, type: "threat", priority: "high",
      title: t("td.notifTitle"),
      body: t("td.notifBody", { detail }),
      locationUrl: pos ? `https://www.google.com/maps?q=${pos.lat},${pos.lng}` : undefined,
    });

    setPrompt({ kind, deadline: Date.now() + 30_000 });
    if (navigator.vibrate) navigator.vibrate(300);
    // reload logs
    const { data } = await supabase.from("threat_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
    setLogs((data as ThreatLog[]) ?? []);
  };

  // 30s auto-SOS countdown
  useEffect(() => {
    if (!prompt) return;
    const id = setInterval(async () => {
      if (Date.now() >= prompt.deadline) {
        clearInterval(id);
        setPrompt(null);
        try {
          await prepareSOS({ user, profile, contacts, source: "threat" });
          await supabase.from("threat_logs").insert({
            user_id: user.id, threat_type: prompt.kind, risk_level: "high",
            latitude: pos?.lat, longitude: pos?.lng, detail: "Auto SOS — no response", action_taken: "sos_triggered",
          });
        } catch { /* noop */ }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [prompt]);

  const dismiss = async () => {
    if (!prompt) return;
    await supabase.from("threat_logs").insert({
      user_id: user.id, threat_type: prompt.kind, risk_level: "moderate",
      latitude: pos?.lat, longitude: pos?.lng, detail: "User confirmed safe", action_taken: "dismissed",
    });
    setPrompt(null);
    const { data } = await supabase.from("threat_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
    setLogs((data as ThreatLog[]) ?? []);
  };

  // Audio monitoring
  const toggleAudio = async () => {
    if (audioOn) {
      audioRef.current?.stream.getTracks().forEach((t) => t.stop());
      audioRef.current?.ctx.close();
      audioRef.current = null;
      setAudioOn(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      audioRef.current = { ctx, analyser, stream };
      setAudioOn(true); setAudioError(null);

      const buf = new Uint8Array(analyser.fftSize);
      let consecutiveLoud = 0;
      const tick = () => {
        if (!audioRef.current) return;
        analyser.getByteTimeDomainData(buf);
        let sumSq = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sumSq += v * v; }
        const rms = Math.sqrt(sumSq / buf.length);
        const db = 20 * Math.log10(rms || 0.00001) + 100; // rough dB approximation
        if (db > 80) consecutiveLoud++; else consecutiveLoud = Math.max(0, consecutiveLoud - 1);
        if (consecutiveLoud >= 5 && Date.now() - lastAlert.current > 60_000 && isNight) {
          lastAlert.current = Date.now();
          consecutiveLoud = 0;
          triggerPreAlert("loud_sound", `Loud sound detected (~${Math.round(db)}dB) at night`);
        }
        requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setAudioError(t("td.audioDenied"));
    }
  };

  return (
    <div className="glass-strong rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-pink-400" />
        <h3 className="font-semibold">{t("td.title")}</h3>
        <span className={`ml-auto inline-flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 font-medium ${
          risk === "safe" ? "bg-emerald-500/15 text-emerald-300" : risk === "moderate" ? "bg-yellow-500/15 text-yellow-300" : "bg-red-500/15 text-red-300"
        }`}>
          <span className={`h-2 w-2 rounded-full ${risk === "safe" ? "bg-emerald-400" : risk === "moderate" ? "bg-yellow-400" : "bg-red-400"} animate-pulse`} />
          {risk === "safe" ? t("td.statusSafe") : risk === "moderate" ? t("td.statusModerate") : t("td.statusHigh")}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="glass rounded-lg p-2">
          <div className="text-muted-foreground">{t("td.tod")}</div>
          <div className="font-medium">{isNight ? t("td.night") : t("td.day")}</div>
        </div>
        <div className="glass rounded-lg p-2">
          <div className="text-muted-foreground">{t("td.zone")}</div>
          <div className="font-medium">{inSafeZone ? t("td.inSafeZone") : pos ? t("td.unknownArea") : "—"}</div>
        </div>
      </div>

      <button onClick={toggleAudio} className={`w-full glass rounded-lg px-4 py-2 text-sm font-medium hover:bg-white/10 transition flex items-center justify-center gap-2 ${audioOn ? "border border-emerald-500/40" : ""}`}>
        {audioOn ? <><Mic className="h-4 w-4 text-emerald-400" /> {t("td.audioOn")}</> : <><MicOff className="h-4 w-4" /> {t("td.enableAudio")}</>}
      </button>
      {audioError && <p className="text-xs text-red-300">{audioError}</p>}
      <p className="text-[11px] text-muted-foreground">{t("td.audioHelp")}</p>

      {prompt && <ThreatPrompt deadline={prompt.deadline} t={t} onSafe={dismiss} onSos={async () => {
        setPrompt(null);
        await prepareSOS({ user, profile, contacts, source: "threat" });
        toast.warning(t("td.detected"));
      }} />}

      <div className="border-t border-white/5 pt-3">
        <div className="flex items-center gap-2 mb-2"><History className="h-4 w-4 text-pink-400" /><h4 className="text-sm font-semibold">{t("td.history")}</h4></div>
        {logs.length === 0 && <p className="text-xs text-muted-foreground py-2 text-center">{t("td.noneYet")}</p>}
        <div className="space-y-1">
          {logs.map((l) => (
            <div key={l.id} className="text-xs flex items-center gap-2 py-1">
              <span className={`h-2 w-2 rounded-full shrink-0 ${l.risk_level === "high" ? "bg-red-400" : "bg-yellow-400"}`} />
              <span className="font-medium">{l.threat_type}</span>
              <span className="text-muted-foreground truncate flex-1">{l.detail}</span>
              <span className="text-muted-foreground">{new Date(l.created_at).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ThreatPrompt({ deadline, onSafe, onSos, t }: { deadline: number; onSafe: () => void; onSos: () => void; t: (k: string, v?: Record<string, string | number>) => string }) {
  const [left, setLeft] = useState(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))), 500);
    return () => clearInterval(id);
  }, [deadline]);
  return (
    <div className="rounded-xl border-2 border-red-500/60 bg-red-500/10 p-4 animate-pulse-glow">
      <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-5 w-5 text-red-400" /><div className="font-semibold text-sm">{t("td.detected")}</div></div>
      <div className="text-xs text-muted-foreground mb-3">{t("td.autoIn", { s: left })}</div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onSafe} className="rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 px-3 py-2 text-sm font-medium">{t("td.imSafe")}</button>
        <button onClick={onSos} className="rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 px-3 py-2 text-sm font-medium">{t("td.sendSos")}</button>
      </div>
    </div>
  );
}

