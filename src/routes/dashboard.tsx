import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Shield, Siren, MapPin, Users, LogOut, Plus, Trash2, Camera, Loader2, Phone, Clock, AlertTriangle, CheckCircle2, HelpCircle, RefreshCw, X, Send, Ban } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { NotificationBell } from "@/components/safety/NotificationBell";
import { LiveTrackingCard } from "@/components/safety/LiveTrackingCard";
import { ThreatDetectorCard } from "@/components/safety/ThreatDetectorCard";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/dashboard")({
 beforeLoad: async () => {
  if (typeof window === "undefined") return;
  const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard — Her Guardian 2.0" },
      { name: "description", content: "Your safety dashboard: trigger SOS, manage trusted contacts, and monitor live location." },
      { property: "og:title", content: "Dashboard — Her Guardian 2.0" },
      { property: "og:description", content: "Trigger SOS, manage trusted contacts, and monitor live location." },
      { property: "og:url", content: "https://https-her-guardian-app-com.lovable.app/dashboard" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://https-her-guardian-app-com.lovable.app/dashboard" }],
  }),
});

type Contact = { id: string; name: string; phone: string; relation: string | null };
type Alert = { id: string; latitude: number | null; longitude: number | null; address: string | null; status: string; created_at: string };
type Profile = { display_name: string | null; avatar_url: string | null; phone: string | null; bio: string | null };

const normalizeWhatsAppPhone = (value: string) => {
  let digits = value.replace(/[^\d]/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.length === 10) {
    digits = `91${digits}`;
  }

  if (digits.length < 10 || digits.length > 15) {
    return null;
  }

  return digits;
};

// (WhatsApp helper removed — emergency alerts now go through backend Twilio SMS.)


function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sosLoading, setSosLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newC, setNewC] = useState({ name: "", phone: "", relation: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  type GeoState = "unknown" | "checking" | "granted" | "prompt" | "denied" | "unsupported" | "error";
  const [geoState, setGeoState] = useState<GeoState>("unknown");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);

  const checkLocation = async (request = false) => {
    setGeoError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoState("unsupported");
      return;
    }
    try {
      if (navigator.permissions?.query) {
        const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
        if (status.state === "denied") {
          setGeoState("denied");
          if (!request) return;
        } else if (status.state === "granted") {
          setGeoState("granted");
        } else {
          setGeoState("prompt");
          if (!request) return;
        }
      } else if (!request) {
        setGeoState("prompt");
        return;
      }
    } catch {
      // permissions API not available — fall through to getCurrentPosition
    }

    setGeoState("checking");

    const onSuccess = (pos: GeolocationPosition) => {
      setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
      setGeoState("granted");
      setGeoError(null);
    };

    const onFinalError = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) {
        setGeoState("denied");
        setGeoError("Location permission was denied for this site.");
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        setGeoState("error");
        setGeoError("Location unavailable. Check that GPS / Location Services is turned on.");
      } else if (err.code === err.TIMEOUT) {
        setGeoState("error");
        setGeoError("Couldn't get a precise fix. Move near a window or step outside and tap Retry.");
      } else {
        setGeoState("error");
        setGeoError(err.message || "Could not get location.");
      }
    };

    // First try: high accuracy + short timeout. On TIMEOUT/UNAVAILABLE, fall back to
    // low-accuracy network/Wi-Fi positioning with a longer window and a cached fix.
    navigator.geolocation.getCurrentPosition(
      onSuccess,
      (err) => {
        if (err.code === err.PERMISSION_DENIED) return onFinalError(err);
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          onFinalError,
          { enableHighAccuracy: false, timeout: 20000, maximumAge: 60_000 },
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  };

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    checkLocation(false);
    let sub: { unsubscribe: () => void } | null = null;
    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      navigator.permissions.query({ name: "geolocation" as PermissionName }).then((status) => {
        const handler = () => checkLocation(false);
        status.addEventListener("change", handler);
        sub = { unsubscribe: () => status.removeEventListener("change", handler) };
      }).catch(() => {});
    }
    return () => { sub?.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: c }, { data: a }] = await Promise.all([
        supabase.from("profiles").select("display_name,avatar_url,phone,bio").eq("id", user.id).maybeSingle(),
        supabase.from("emergency_contacts").select("*").eq("user_id", user.id).order("created_at"),
        supabase.from("sos_alerts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      ]);
      setProfile(p ?? { display_name: null, avatar_url: null, phone: null, bio: null });
      setContacts(c ?? []);
      setAlerts(a ?? []);
    })();
  }, [user]);

  type DeliveryStatus = "pending" | "opened" | "blocked" | "confirmed" | "failed";
  type Delivery = {
    contactId: string;
    name: string;
    relation: string | null;
    phone: string;
    whatsappPhone: string;
    url: string;
    smsUrl: string;
    whatsappUrl: string;
    status: DeliveryStatus;
    error?: string;
    errorCode?: number;
  };

  const LAST_LOC_KEY = "hg_last_known_location";
  const readLastKnown = (): { lat: number; lng: number; accuracy: number; ts: number } | null => {
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem(LAST_LOC_KEY) : null;
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };
  const writeLastKnown = (lat: number, lng: number, accuracy: number) => {
    try { localStorage.setItem(LAST_LOC_KEY, JSON.stringify({ lat, lng, accuracy, ts: Date.now() })); } catch { /* noop */ }
  };

  const [sosMode, setSosMode] = useState(false);
  const [sosMessage, setSosMessage] = useState<string>("");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

  const updateDelivery = (id: string, patch: Partial<Delivery>) =>
    setDeliveries((d) => d.map((x) => (x.contactId === id ? { ...x, ...patch } : x)));

  const sendSOS = async () => {
    if (!user || sosLoading) return; // prevent duplicate triggers
    const validContacts = contacts
      .map((c) => ({ ...c, whatsappPhone: normalizeWhatsAppPhone(c.phone) }))
      .filter((c): c is Contact & { whatsappPhone: string } => Boolean(c.whatsappPhone));

    if (validContacts.length === 0) {
      toast.error("Add at least one emergency contact first", {
        description: "10-digit Indian numbers are auto-converted to +91 format.",
      });
      return;
    }

    setSosLoading(true);
    try {
      const { sendSms: sendSmsBridge } = await import("@/lib/native-bridge");
      const { sendEmergencySms } = await import("@/lib/sms.functions");
      const who = profile?.display_name ?? user.email ?? "Someone";
      const sentAt = new Date().toLocaleString();
      let lat: number | null = null;
      let lng: number | null = null;
      let mapsUrl = "";
      let accuracy: number | null = null;
      let locationWarning: string | null = null;

      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) => {
          if (!navigator.geolocation) return rej(new Error("Geolocation not supported"));
          navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        accuracy = pos.coords.accuracy;
        mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        writeLastKnown(lat, lng, accuracy);
      } catch (e) {
        // Fall back to last-known cached location (with age warning)
        const last = readLastKnown();
        if (last) {
          const ageMin = Math.round((Date.now() - last.ts) / 60000);
          lat = last.lat; lng = last.lng; accuracy = last.accuracy;
          mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
          locationWarning = `Live GPS unavailable — using last known location (~${ageMin} min old).`;
          toast.warning("Using last known location", { description: locationWarning });
        } else {
          locationWarning = e instanceof Error ? e.message : "Live location unavailable";
        }
      }

      const message =
        `EMERGENCY ALERT!\nI need help.\n` +
        `Name: ${who}\n` +
        (mapsUrl
          ? `Location${locationWarning ? " (last known)" : ""}: ${mapsUrl}\n`
          : `Location: unavailable on device\n`) +
        `Time: ${sentAt}`;

      // Record alert
      const { data: alertData } = await supabase.from("sos_alerts").insert({
        user_id: user.id,
        latitude: lat,
        longitude: lng,
        accuracy,
        address: lat != null ? `${lat.toFixed(5)}, ${lng!.toFixed(5)}` : "Location unavailable",
      }).select().single();
      if (alertData) setAlerts((a) => [alertData as Alert, ...a].slice(0, 5));

      const initialDeliveries: Delivery[] = validContacts.map((c) => ({
        contactId: c.id,
        name: c.name,
        relation: c.relation,
        phone: c.phone,
        whatsappPhone: c.whatsappPhone,
        url: "",
        smsUrl: (/iPhone|iPad|iPod/i.test(navigator.userAgent) ? `sms:+${c.whatsappPhone}&body=` : `sms:+${c.whatsappPhone}?body=`) + encodeURIComponent(message),
        whatsappUrl: `https://wa.me/${c.whatsappPhone}?text=${encodeURIComponent(message)}`,
        status: "pending",
      }));

      setSosMessage(message);
      setDeliveries(initialDeliveries);
      setSosMode(true);

      // Fire backend Twilio SMS for each contact in parallel
      const results = await Promise.all(
        initialDeliveries.map(async (d) => {
          try {
            const r = await sendEmergencySms({ data: { to: `+${d.whatsappPhone}`, body: message } });
            return { id: d.contactId, ok: r.ok, error: r.ok ? undefined : r.error, code: r.ok ? undefined : r.code };
          } catch (e) {
            return { id: d.contactId, ok: false, error: e instanceof Error ? e.message : "Send failed" };
          }
        }),
      );

      setDeliveries((prev) =>
        prev.map((d) => {
          const r = results.find((x) => x.id === d.contactId);
          if (!r) return d;
          return { ...d, status: r.ok ? "confirmed" : "failed", error: r.error, errorCode: r.code };
        }),
      );

      const okCount = results.filter((r) => r.ok).length;
      const failCount = results.length - okCount;
      // Suppress unused-helper warning while keeping the bridge import side-effect ready for native builds.
      void sendSmsBridge;
      if (okCount > 0) toast.success(`SMS sent to ${okCount} contact(s)`);
      if (failCount > 0) toast.error(`${failCount} SMS failed`, { description: "See per-contact reason below and use SMS fallback link." });
      if (locationWarning) toast.warning("Sent without live location", { description: locationWarning });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send SOS");
    } finally {
      setSosLoading(false);
    }
  };

  const retryDelivery = async (d: Delivery) => {
    updateDelivery(d.contactId, { status: "pending", error: undefined, errorCode: undefined });
    try {
      const { sendEmergencySms } = await import("@/lib/sms.functions");
      const r = await sendEmergencySms({ data: { to: `+${d.whatsappPhone}`, body: sosMessage } });
      updateDelivery(d.contactId, {
        status: r.ok ? "confirmed" : "failed",
        error: r.ok ? undefined : r.error,
        errorCode: r.ok ? undefined : r.code,
      });
      if (!r.ok) toast.error(`Retry failed: ${r.error ?? "unknown"}`);
    } catch (e) {
      const err = e instanceof Error ? e.message : "Retry failed";
      updateDelivery(d.contactId, { status: "failed", error: err });
      toast.error(err);
    }
  };

  const exitSosMode = () => {
    setSosMode(false);
    setDeliveries([]);
    setSosMessage("");
  };




  const addContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const name = newC.name.trim();
    if (!name) return toast.error("Contact name is required");
    const normalized = normalizeWhatsAppPhone(newC.phone);
    if (!normalized) {
      return toast.error("Invalid phone number", {
        description: "Enter a 10-digit Indian mobile or full international number with country code.",
      });
    }
    const { data, error } = await supabase.from("emergency_contacts")
      .insert({ user_id: user.id, name, phone: `+${normalized}`, relation: newC.relation.trim() || null })
      .select().single();
    if (error) return toast.error(error.message);
    setContacts((x) => [...x, data as Contact]);
    setNewC({ name: "", phone: "", relation: "" });
    toast.success("Contact added");
  };

  const removeContact = async (id: string) => {
    const { error } = await supabase.from("emergency_contacts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setContacts((x) => x.filter((c) => c.id !== id));
  };

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    // Validate MIME and size — bucket is public so reject non-images and large files.
    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED.includes(file.type)) {
      return toast.error("Only JPG, PNG, WEBP or GIF images are allowed");
    }
    if (file.size > 5 * 1024 * 1024) {
      return toast.error("Image must be 5 MB or smaller");
    }
    const extByType: Record<string, string> = {
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
    };
    setUploading(true);
    try {
      const path = `${user.id}/avatar-${Date.now()}.${extByType[file.type]}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: pErr } = await supabase.from("profiles").upsert({ id: user.id, avatar_url: publicUrl });
      if (pErr) throw pErr;
      setProfile((p) => ({ ...(p ?? {} as Profile), avatar_url: publicUrl }));
      toast.success("Photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };


  if (authLoading || !user) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-pink-400" /></div>;
  }

  return (
    <div className="min-h-screen px-4 py-6">
      <header className="mx-auto max-w-6xl glass-strong rounded-2xl px-5 py-3 flex items-center justify-between mb-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 glow-pink">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold">Her Guardian <span className="text-gradient">2.0</span></span>
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/journey" className="glass rounded-xl px-3 py-2 text-xs hover:bg-white/10 transition">{t("nav.journey")}</Link>
          <Link to="/safe-route" className="glass rounded-xl px-3 py-2 text-xs hover:bg-white/10 transition">{t("nav.safeRoute")}</Link>
          <Link to="/unsafe-zones" className="glass rounded-xl px-3 py-2 text-xs hover:bg-white/10 transition">{t("nav.unsafeZones")}</Link>
          <Link to="/settings" className="glass rounded-xl px-3 py-2 text-xs hover:bg-white/10 transition">{t("nav.settings")}</Link>
          <Link to="/debug" className="glass rounded-xl px-3 py-2 text-xs hover:bg-white/10 transition">{t("nav.debug")}</Link>
          <NotificationBell userId={user.id} />
          <button onClick={async () => { await signOut(); navigate({ to: "/" }); }} className="glass rounded-xl px-3 py-2 text-xs hover:bg-white/10 transition flex items-center gap-2">
            <LogOut className="h-3.5 w-3.5" /> {t("nav.signOut")}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl grid lg:grid-cols-3 gap-6">
        {/* PROFILE + SOS */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-strong rounded-2xl p-6 text-center">
            <div className="relative mx-auto w-24 h-24">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 grid place-items-center text-3xl font-bold text-white glow-pink overflow-hidden">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  : (profile?.display_name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "U")}
              </div>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="absolute -bottom-1 -right-1 grid place-items-center h-8 w-8 rounded-full bg-pink-500 text-white shadow-lg hover:bg-pink-600 transition disabled:opacity-50">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={uploadAvatar} className="hidden" />
            </div>
            <h2 className="mt-4 font-semibold">{profile?.display_name ?? user.email}</h2>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>

          <div className="glass-strong rounded-2xl p-6 text-center animate-pulse-glow">
            <h3 className="font-semibold mb-1">{t("sos.title")}</h3>
            <p className="text-xs text-muted-foreground mb-5">{t("sos.subtitle")}</p>
            <button onClick={sendSOS} disabled={sosLoading}
              className="mx-auto grid h-32 w-32 place-items-center rounded-full bg-gradient-to-br from-red-500 to-pink-600 text-white font-bold text-xl shadow-2xl hover:scale-105 active:scale-95 transition disabled:opacity-60"
              style={{ boxShadow: "0 0 60px -5px rgba(239, 68, 68, 0.7)" }}>
              {sosLoading ? <Loader2 className="h-10 w-10 animate-spin" /> : <><Siren className="h-10 w-10 mb-1" /></>}
            </button>
            <p className="mt-4 text-xs text-muted-foreground">{contacts.length} contact(s) ready</p>
          </div>

          <LocationStatusPanel
            state={geoState}
            error={geoError}
            coords={geoCoords}
            onRetry={() => checkLocation(true)}
          />

          <ComingSoonCard
            icon="🚓"
            title="Police & Crime Branch Direct"
            description="Auto-share your live location with the nearest police station and crime branch the moment SOS fires. Awaiting government integration."
            accent="from-blue-500 to-indigo-600"
          />

          <ComingSoonCard
            icon="⌚"
            title="Wearable Support"
            description="Trigger SOS from your smartwatch with a single press — even when your phone is locked or out of reach."
            accent="from-violet-500 to-fuchsia-600"
          />


          {sosMode && (
            <SosModePanel
              deliveries={deliveries}
              message={sosMessage}
              onRetry={retryDelivery}
              onConfirm={(d) => updateDelivery(d.contactId, { status: "confirmed" })}
              onMarkFailed={(d) => updateDelivery(d.contactId, { status: "failed" })}
              onExit={exitSosMode}
            />
          )}

        </div>

        {/* CONTACTS + ALERTS */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-strong rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-pink-400" />
              <h3 className="font-semibold">Emergency Contacts</h3>
              <span className="ml-auto text-xs text-muted-foreground">{contacts.length}/5</span>
            </div>
            <form onSubmit={addContact} className="grid sm:grid-cols-4 gap-2 mb-4">
              <input placeholder="Name" value={newC.name} onChange={(e) => setNewC({ ...newC, name: e.target.value })}
                className="glass rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-400/50" required />
              <input placeholder="Phone" value={newC.phone} onChange={(e) => setNewC({ ...newC, phone: e.target.value })}
                className="glass rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-400/50" required />
              <input placeholder="Relation" value={newC.relation} onChange={(e) => setNewC({ ...newC, relation: e.target.value })}
                className="glass rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-400/50" />
              <button type="submit" disabled={contacts.length >= 5}
                className="rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-1 disabled:opacity-50">
                <Plus className="h-4 w-4" /> Add
              </button>
            </form>
            <p className="mb-4 text-xs text-muted-foreground">
              Save phone numbers with country code. 10-digit Indian numbers are auto-converted to +91.
            </p>
            <div className="space-y-2">
              {contacts.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No contacts yet. Add up to 5 trusted people.</p>}
              {contacts.map((c) => (
                <div key={c.id} className="glass rounded-lg px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{c.name} {c.relation && <span className="text-xs text-muted-foreground">· {c.relation}</span>}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</div>
                  </div>
                  <button onClick={() => removeContact(c.id)} className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-strong rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-pink-400" />
              <h3 className="font-semibold">Recent SOS Alerts</h3>
            </div>
            <div className="space-y-2">
              {alerts.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No alerts yet — stay safe!</p>}
              {alerts.map((a) => (
                <div key={a.id} className="glass rounded-lg px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> {a.address ?? "Location captured"}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" /> {new Date(a.created_at).toLocaleString()}
                    </div>
                  </div>
                  {a.latitude && a.longitude && (
                    <a href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`} target="_blank" rel="noreferrer"
                      className="text-xs text-pink-400 hover:underline">View map →</a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl grid lg:grid-cols-2 gap-6 mt-6">
        <LiveTrackingCard user={user} displayName={profile?.display_name ?? user.email ?? "User"} />
        <ThreatDetectorCard user={user} profile={profile} contacts={contacts} />
      </div>
    </div>
  );
}

type GeoStateLite = "unknown" | "checking" | "granted" | "prompt" | "denied" | "unsupported" | "error";

function LocationStatusPanel({
  state,
  error,
  coords,
  onRetry,
}: {
  state: GeoStateLite;
  error: string | null;
  coords: { lat: number; lng: number; accuracy: number } | null;
  onRetry: () => void;
}) {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);

  const config: Record<GeoStateLite, { label: string; tone: string; icon: typeof CheckCircle2; desc: string }> = {
    unknown: { label: "Checking location…", tone: "text-muted-foreground", icon: HelpCircle, desc: "Verifying location permission." },
    checking: { label: "Getting your GPS fix…", tone: "text-blue-300", icon: Loader2, desc: "Talking to your device's GPS." },
    granted: { label: "Location ready", tone: "text-emerald-400", icon: CheckCircle2, desc: "GPS will be attached to your SOS." },
    prompt: { label: "Permission needed", tone: "text-yellow-300", icon: AlertTriangle, desc: "Tap Enable location and accept the browser prompt." },
    denied: { label: "Location blocked", tone: "text-red-400", icon: AlertTriangle, desc: "Your browser is blocking location for this site." },
    unsupported: { label: "GPS not supported", tone: "text-red-400", icon: AlertTriangle, desc: "This browser has no Geolocation API." },
    error: { label: "Location failing", tone: "text-red-400", icon: AlertTriangle, desc: "Couldn't get a GPS fix from your device." },
  };
  const c = config[state];
  const Icon = c.icon;
  const spin = state === "checking" || state === "unknown";

  return (
    <div className="glass-strong rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="h-5 w-5 text-pink-400" />
        <h3 className="font-semibold">Location status</h3>
      </div>

      <div className="glass rounded-xl px-4 py-3 flex items-start gap-3">
        <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${c.tone} ${spin ? "animate-spin" : ""}`} />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${c.tone}`}>{c.label}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{error ?? c.desc}</div>
          {state === "granted" && coords && (
            <div className="text-[11px] text-muted-foreground mt-1 font-mono">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} · ±{Math.round(coords.accuracy)}m
            </div>
          )}
        </div>
      </div>

      {(state === "denied" || state === "error" || state === "unsupported") && (
        <div className="mt-3 text-xs text-muted-foreground space-y-1.5">
          <div className="font-medium text-foreground">How to fix:</div>
          {isIOS ? (
            <ol className="list-decimal list-inside space-y-1">
              <li>iPhone Settings → Privacy & Security → Location Services → On</li>
              <li>Scroll to Safari/Chrome → set to "While Using"</li>
              <li>In the browser, tap the "aA" icon in the address bar → Website Settings → Location → Allow</li>
              <li>Reload this page and tap Try again</li>
            </ol>
          ) : isAndroid ? (
            <ol className="list-decimal list-inside space-y-1">
              <li>Android Settings → Location → turn On (High accuracy)</li>
              <li>In Chrome, tap the lock icon in the address bar → Permissions → Location → Allow</li>
              <li>Reload this page and tap Try again</li>
            </ol>
          ) : (
            <ol className="list-decimal list-inside space-y-1">
              <li>Click the lock / location icon in your browser's address bar</li>
              <li>Set Location to Allow for this site</li>
              <li>Make sure your OS Location Services are turned on</li>
              <li>Reload the page and tap Try again</li>
            </ol>
          )}
        </div>
      )}

      {state !== "unsupported" && (
        <button
          onClick={onRetry}
          disabled={state === "checking"}
          className="mt-4 w-full glass rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-white/10 transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${state === "checking" ? "animate-spin" : ""}`} />
          {state === "granted" ? "Refresh location" : state === "prompt" || state === "unknown" ? "Enable location" : "Try again"}
        </button>
      )}
    </div>
  );
}

function ComingSoonCard({ icon, title, description, accent }: { icon: string; title: string; description: string; accent: string }) {
  return (
    <div className="glass-strong rounded-2xl p-5 relative overflow-hidden">
      <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-2xl`} />
      <div className="flex items-start gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${accent} text-lg shrink-0`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm">{title}</h3>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">Coming Soon</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}


type DeliveryItem = {
  contactId: string;
  name: string;
  relation: string | null;
  phone: string;
  whatsappPhone: string;
  url: string;
  smsUrl: string;
  whatsappUrl: string;
  status: "pending" | "opened" | "blocked" | "confirmed" | "failed";
  error?: string;
  errorCode?: number;
};


function SosModePanel({
  deliveries,
  message,
  onRetry,
  onConfirm,
  onMarkFailed,
  onExit,
}: {
  deliveries: DeliveryItem[];
  message: string;
  onRetry: (d: DeliveryItem) => void;
  onConfirm: (d: DeliveryItem) => void;
  onMarkFailed: (d: DeliveryItem) => void;
  onExit: () => void;
}) {
  const total = deliveries.length;
  const confirmed = deliveries.filter((d) => d.status === "confirmed").length;
  const blocked = deliveries.filter((d) => d.status === "blocked").length;
  const allDone = confirmed === total;

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Message copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const statusBadge = (s: DeliveryItem["status"]) => {
    const map: Record<DeliveryItem["status"], { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
      pending: { label: "Opening…", cls: "bg-blue-500/15 text-blue-300 border-blue-500/30", Icon: Loader2 },
      opened: { label: "Tab opened — tap Send", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30", Icon: Send },
      blocked: { label: "Pop-up blocked", cls: "bg-red-500/15 text-red-300 border-red-500/30", Icon: Ban },
      confirmed: { label: "Delivered", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", Icon: CheckCircle2 },
      failed: { label: "Failed", cls: "bg-red-500/15 text-red-300 border-red-500/30", Icon: AlertTriangle },
    };
    const { label, cls, Icon } = map[s];
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls}`}>
        <Icon className={`h-3 w-3 ${s === "pending" ? "animate-spin" : ""}`} /> {label}
      </span>
    );
  };

  return (
    <div className="glass-strong rounded-2xl p-5 border border-red-500/40">
      <div className="flex items-center gap-2 mb-1">
        <div className="grid h-7 w-7 place-items-center rounded-full bg-red-500/20 text-red-400">
          <Siren className="h-4 w-4 animate-pulse" />
        </div>
        <h3 className="font-semibold">SOS Mode Active</h3>
        <button onClick={onExit} className="ml-auto p-1.5 rounded-lg hover:bg-white/10 transition" aria-label="Exit SOS mode">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        {confirmed}/{total} delivered{blocked > 0 ? ` · ${blocked} blocked` : ""}
      </p>

      <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-red-500 to-pink-500 transition-all"
          style={{ width: `${total ? (confirmed / total) * 100 : 0}%` }}
        />
      </div>

      <div className="space-y-2">
        {deliveries.map((d) => (
          <div key={d.contactId} className="glass rounded-lg px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {d.name} {d.relation && <span className="text-xs text-muted-foreground">· {d.relation}</span>}
                </div>
                <div className="text-[11px] text-muted-foreground font-mono">+{d.whatsappPhone}</div>
              </div>
              {statusBadge(d.status)}
            </div>
            {d.error && (d.status === "failed" || d.status === "blocked") && (
              <div className="mt-1.5 rounded-md bg-red-500/10 border border-red-500/20 px-2 py-1 text-[11px] text-red-300">
                {d.errorCode ? <span className="font-mono mr-1 opacity-70">[{d.errorCode}]</span> : null}
                {d.error}
              </div>
            )}

            <div className="mt-2 flex flex-wrap gap-1.5">
              <a
                href={d.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 px-2.5 py-1 text-[11px] font-medium transition"
                title="Open WhatsApp with the SOS message pre-filled (you must tap Send)"
              >
                <Send className="h-3 w-3" /> WhatsApp
              </a>
              <a
                href={d.smsUrl}
                className="inline-flex items-center gap-1 rounded-md bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 px-2.5 py-1 text-[11px] font-medium transition"
                title="Open phone Messages app (fallback)"
              >
                <Send className="h-3 w-3" /> SMS fallback
              </a>

              {(d.status === "blocked" || d.status === "failed") && (
                <button
                  onClick={() => onRetry(d)}
                  className="inline-flex items-center gap-1 rounded-md bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/25 px-2.5 py-1 text-[11px] font-medium transition"
                >
                  <RefreshCw className="h-3 w-3" /> Retry
                </button>
              )}
              {d.status !== "confirmed" && (
                <button
                  onClick={() => onConfirm(d)}
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 px-2.5 py-1 text-[11px] font-medium transition"
                >
                  <CheckCircle2 className="h-3 w-3" /> Mark delivered
                </button>
              )}
              {d.status !== "failed" && d.status !== "confirmed" && (
                <button
                  onClick={() => onMarkFailed(d)}
                  className="inline-flex items-center gap-1 rounded-md bg-white/5 text-muted-foreground hover:bg-white/10 px-2.5 py-1 text-[11px] font-medium transition"
                >
                  <Ban className="h-3 w-3" /> Failed
                </button>
              )}
            </div>
          </div>
        ))}
      </div>


      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={copyMessage}
          className="glass rounded-lg px-3 py-2 text-xs font-medium hover:bg-white/10 transition flex items-center gap-1.5"
        >
          Copy SOS message
        </button>
        {allDone && (
          <button
            onClick={onExit}
            className="ml-auto rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 px-3 py-2 text-xs font-medium transition flex items-center gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> All delivered — exit
          </button>
        )}
      </div>
    </div>
  );
}


