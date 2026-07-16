import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, ArrowLeft, Loader2, Phone, Mail, MessageCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { SafeWordCard } from "@/components/safety/SafeWordCard";
import { SafeZonesCard } from "@/components/safety/SafeZonesCard";
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_WHATSAPP, type Contact, type Profile } from "@/lib/safety-core";
import { LanguageSwitcher } from "@/components/LanguageGate";
import { TwilioSettingsCard } from "@/components/safety/TwilioSettingsCard";

export const Route = createFileRoute("/settings")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Settings — Her Guardian 2.0" },
      { name: "description", content: "Manage your profile, language, notifications, and emergency preferences." },
      { property: "og:title", content: "Settings — Her Guardian 2.0" },
      { property: "og:description", content: "Profile, language, notifications and emergency preferences." },
      { property: "og:url", content: "https://https-her-guardian-app-com.lovable.app/settings" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://https-her-guardian-app-com.lovable.app/settings" }],
  }),
});

function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [prefs, setPrefs] = useState({ threat_enabled: true, journey_enabled: true, arrival_enabled: true, checkin_enabled: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/login" }); }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: c }, { data: np }] = await Promise.all([
        supabase.from("profiles").select("display_name,avatar_url,phone,bio").eq("id", user.id).maybeSingle(),
        supabase.from("emergency_contacts").select("*").eq("user_id", user.id),
        supabase.from("notification_prefs").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      setProfile(p ?? null);
      setContacts((c as Contact[]) ?? []);
      if (np) setPrefs({ threat_enabled: np.threat_enabled, journey_enabled: np.journey_enabled, arrival_enabled: np.arrival_enabled, checkin_enabled: np.checkin_enabled });
      setLoading(false);
    })();
  }, [user]);

  const updatePref = async (key: keyof typeof prefs, val: boolean) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    await supabase.from("notification_prefs").upsert({ user_id: user!.id, ...next, updated_at: new Date().toISOString() });
  };

  if (authLoading || !user || loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-pink-400" /></div>;

  return (
    <div className="min-h-screen px-4 py-6">
      <header className="mx-auto max-w-4xl glass-strong rounded-2xl px-5 py-3 flex items-center justify-between mb-6">
        <Link to="/dashboard" className="flex items-center gap-2 text-sm hover:text-pink-400 transition"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 glow-pink"><Shield className="h-5 w-5 text-white" /></div>
          <span className="font-bold">Settings</span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-6">
        <LanguageSwitcher />

        <Link to="/pricing" className="glass-strong rounded-2xl p-6 flex items-center gap-4 hover:bg-white/5 transition group">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500"><Sparkles className="h-6 w-6 text-black" /></div>
          <div className="flex-1">
            <h3 className="font-semibold">Upgrade your protection</h3>
            <p className="text-xs text-muted-foreground">Unlock live tracking, AI threat detection and voice SOS</p>
          </div>
          <span className="text-sm text-pink-400 group-hover:translate-x-1 transition">→</span>
        </Link>

        <SafeWordCard user={user} profile={profile} contacts={contacts} />

        <TwilioSettingsCard />

        <SafeZonesCard userId={user.id} />

        <div className="glass-strong rounded-2xl p-6 space-y-3">
          <h3 className="font-semibold">Notification preferences</h3>
          <p className="text-xs text-muted-foreground">SOS alerts always on. Toggle others below.</p>
          {([
            ["threat_enabled", "Threat detection alerts"],
            ["journey_enabled", "Journey deviation alerts"],
            ["arrival_enabled", "Safe arrival notifications"],
            ["checkin_enabled", "Daily check-in reminders"],
          ] as const).map(([k, label]) => (
            <div key={k} className="glass rounded-lg px-4 py-3 flex items-center justify-between">
              <span className="text-sm">{label}</span>
              <button onClick={() => updatePref(k, !prefs[k])}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${prefs[k] ? "bg-emerald-500" : "bg-white/20"}`}>
                <span className={`inline-block h-4 w-4 rounded-full bg-white transition ${prefs[k] ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          ))}
        </div>

        <div className="glass-strong rounded-2xl p-6 space-y-3">
          <h3 className="font-semibold">Support</h3>
          <div className="flex flex-wrap gap-2 text-sm">
            <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`} className="glass rounded-lg px-3 py-2 flex items-center gap-2 hover:bg-white/10"><Phone className="h-4 w-4" /> {SUPPORT_PHONE}</a>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="glass rounded-lg px-3 py-2 flex items-center gap-2 hover:bg-white/10"><Mail className="h-4 w-4" /> {SUPPORT_EMAIL}</a>
            <a href={SUPPORT_WHATSAPP} target="_blank" rel="noopener noreferrer" className="glass rounded-lg px-3 py-2 flex items-center gap-2 hover:bg-white/10"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
          </div>
        </div>
      </div>
    </div>
  );
}
