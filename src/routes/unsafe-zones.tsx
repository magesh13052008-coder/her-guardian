import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, AlertTriangle, MapPin, ThumbsUp, CheckCircle2, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/unsafe-zones")({
  component: UnsafeZonesPage,
  head: () => ({
    meta: [
      { title: "Dangerous Location Alerts — Her Guardian 2.0" },
      { name: "description", content: "Community-reported unsafe zones and real-time safety alerts for women across Indian cities." },
      { property: "og:title", content: "Dangerous Location Alerts — Her Guardian 2.0" },
      { property: "og:description", content: "Community-reported unsafe zones across Indian cities." },
      { property: "og:url", content: "https://https-her-guardian-app-com.lovable.app/unsafe-zones" },
    ],
    links: [{ rel: "canonical", href: "https://https-her-guardian-app-com.lovable.app/unsafe-zones" }],
  }),
});

type Risk = "HIGH" | "MEDIUM" | "RESOLVED";
type AlertType =
  | "harassment" | "lighting" | "suspicious" | "stalking" | "unsafeRoad" | "theft" | "resolved";
type AlertItem = {
  id: string; location: string; type: AlertType; minsAgo: number; risk: Risk; confirms: number;
};

const TYPE_KEYS: AlertType[] = ["harassment", "lighting", "suspicious", "stalking", "unsafeRoad", "theft"];

// Seeded sample data. Location strings shown verbatim (place names).
const SEED: AlertItem[] = [
  { id: "a1", location: "Koyambedu Bus Stand, Chennai (near Platform 7)", type: "harassment", minsAgo: 14, risk: "HIGH", confirms: 12 },
  { id: "a2", location: "Anna Nagar West, Chennai", type: "lighting", minsAgo: 32, risk: "MEDIUM", confirms: 8 },
  { id: "a3", location: "Madurai Central Railway Station, Madurai", type: "suspicious", minsAgo: 60, risk: "HIGH", confirms: 19 },
  { id: "a4", location: "Gandhipuram, Coimbatore", type: "resolved", minsAgo: 120, risk: "RESOLVED", confirms: 5 },
  { id: "a5", location: "Thiruvanmiyur Beach Road, Chennai", type: "stalking", minsAgo: 45, risk: "HIGH", confirms: 7 },
];

const riskBadge = (r: Risk) =>
  r === "HIGH" ? "bg-red-500/20 text-red-300 border-red-500/40"
  : r === "MEDIUM" ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
  : "bg-teal-500/20 text-teal-300 border-teal-500/40";

function UnsafeZonesPage() {
  const { t } = useI18n();
  const [alerts, setAlerts] = useState<AlertItem[]>(SEED);
  const [filter, setFilter] = useState<"all" | Risk>("all");
  const [upvoted, setUpvoted] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<{ type: AlertType; location: string; description: string }>({
    type: "harassment", location: "", description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(
    () => filter === "all" ? alerts : alerts.filter((a) => a.risk === filter),
    [alerts, filter],
  );

  const riskLabel = (r: Risk) =>
    r === "HIGH" ? t("uz.risk.high") : r === "MEDIUM" ? t("uz.risk.medium") : t("uz.risk.resolved");

  const fmtTime = (mins: number) =>
    mins < 60 ? `${mins} ${t("uz.minsAgo")}` : `${Math.round(mins / 60)} ${t("uz.hrsAgo")}`;

  const toggleConfirm = (id: string) => {
    const newSet = new Set(upvoted);
    if (newSet.has(id)) {
      newSet.delete(id);
      setAlerts((xs) => xs.map((a) => a.id === id ? { ...a, confirms: a.confirms - 1 } : a));
    } else {
      newSet.add(id);
      setAlerts((xs) => xs.map((a) => a.id === id ? { ...a, confirms: a.confirms + 1 } : a));
    }
    setUpvoted(newSet);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.location.trim() || !form.description.trim()) {
      toast.error(t("uz.fillAll"));
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));
    const newAlert: AlertItem = {
      id: `u${Date.now()}`, location: form.location, type: form.type,
      minsAgo: 0, risk: "HIGH", confirms: 1,
    };
    setAlerts((xs) => [newAlert, ...xs]);
    setForm({ type: "harassment", location: "", description: "" });
    setSubmitting(false);
    toast.success(t("uz.thanks"));
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 max-w-3xl mx-auto">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> {t("nav.back")}
      </Link>

      <div className="glass-strong rounded-2xl p-6 mb-5">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-pink-600 shrink-0">
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t("uz.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("uz.subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="glass-strong rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-red-300">{alerts.filter((a) => a.risk !== "RESOLVED").length}</div>
          <div className="text-[10px] text-muted-foreground mt-1">{t("uz.statActive")}</div>
        </div>
        <div className="glass-strong rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-violet-300">12,847</div>
          <div className="text-[10px] text-muted-foreground mt-1">{t("uz.statUsers")}</div>
        </div>
        <div className="glass-strong rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-emerald-300">{alerts.reduce((s, a) => s + a.confirms, 0)}</div>
          <div className="text-[10px] text-muted-foreground mt-1">{t("uz.statVerified")}</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-3">
        {([
          ["all", t("uz.filter.all")],
          ["HIGH", t("uz.risk.high")],
          ["MEDIUM", t("uz.risk.medium")],
          ["RESOLVED", t("uz.risk.resolved")],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k as "all" | Risk)}
            className={`text-xs px-3 py-1 rounded-full border transition ${filter === k ? "bg-violet-500/30 border-violet-400" : "border-white/10 hover:bg-white/5"}`}
          >{label}</button>
        ))}
      </div>

      <h2 className="text-sm font-semibold mb-2">{t("uz.live")}</h2>
      <div className="space-y-3">
        {filtered.map((a) => (
          <div key={a.id} className="glass-strong rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <MapPin className="h-3.5 w-3.5" /> {a.location}
                </div>
                <div className="font-medium text-sm">{t(`uz.type.${a.type}`)}</div>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${riskBadge(a.risk)}`}>
                    {a.risk === "RESOLVED" ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                    {riskLabel(a.risk)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{fmtTime(a.minsAgo)}</span>
                </div>
              </div>
              <button
                onClick={() => toggleConfirm(a.id)}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg border text-xs transition ${upvoted.has(a.id) ? "bg-violet-500/30 border-violet-400 text-white" : "border-white/10 hover:bg-white/5"}`}
              >
                <ThumbsUp className="h-4 w-4" />
                <span className="text-[10px]">{a.confirms}</span>
                <span className="text-[9px]">{t("uz.confirm")}</span>
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-10 glass rounded-lg">{t("uz.none")}</div>
        )}
      </div>

      <form onSubmit={submit} className="glass-strong rounded-2xl p-5 mt-6 space-y-3">
        <h3 className="font-semibold">{t("uz.reportTitle")}</h3>

        <div>
          <label className="text-xs text-muted-foreground">{t("uz.typeLabel")}</label>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AlertType }))}
            className="mt-1 w-full bg-background rounded border border-white/10 px-3 py-2 text-sm outline-none focus:border-violet-400"
          >
            {TYPE_KEYS.map((k) => <option key={k} value={k}>{t(`uz.type.${k}`)}</option>)}
          </select>
        </div>

        <input
          value={form.location}
          onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
          placeholder={t("uz.locPlaceholder")}
          maxLength={200}
          className="w-full bg-transparent rounded border border-white/10 px-3 py-2 text-sm outline-none focus:border-violet-400"
        />

        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder={t("uz.descPlaceholder")}
          rows={3}
          maxLength={500}
          className="w-full bg-transparent rounded border border-white/10 px-3 py-2 text-sm outline-none focus:border-violet-400 resize-none"
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Send className="h-4 w-4" /> {t("uz.submit")}
        </button>
      </form>

      <p className="text-center text-[11px] text-muted-foreground mt-6">{t("uz.disclaimer")}</p>
    </div>
  );
}
