import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, MapPin, ShieldCheck, Info, Clock, Sun, Moon, Globe2 } from "lucide-react";
import { useI18n, type Lang } from "@/lib/i18n";

export const Route = createFileRoute("/safe-route")({
  component: SafeRoutePage,
  head: () => ({
    meta: [
      { title: "Safe Route Map — Her Guardian 2.0" },
      { name: "description", content: "Community-rated safer routes for women across major Tamil Nadu cities including Chennai, Coimbatore and Madurai." },
      { property: "og:title", content: "Safe Route Map — Her Guardian 2.0" },
      { property: "og:description", content: "Community-rated safer routes across major Tamil Nadu cities." },
      { property: "og:url", content: "https://https-her-guardian-app-com.lovable.app/safe-route" },
    ],
    links: [{ rel: "canonical", href: "https://https-her-guardian-app-com.lovable.app/safe-route" }],
  }),
});

type Safety = "safe" | "moderate" | "unsafe";
type TimeBand = "day" | "night" | "any";
type L10n = Record<Lang, string>;
type RouteItem = { from: L10n; to?: L10n; time: TimeBand; safety: Safety; tip: L10n };
type City = { id: string; name: L10n; routes: RouteItem[] };

const CITIES: City[] = [
  {
    id: "chennai",
    name: { en: "Chennai", ta: "சென்னை", hi: "चेन्नई" },
    routes: [
      {
        from: { en: "T. Nagar", ta: "T. நகர்", hi: "टी. नगर" },
        to: { en: "Anna Nagar", ta: "அண்ணா நகர்", hi: "अन्ना नगर" },
        time: "day", safety: "safe",
        tip: { en: "CCTV coverage available, well-lit", ta: "CCTV கவரேஜ் உள்ளது, நல்ல வெளிச்சம்", hi: "CCTV कवरेज है, अच्छी रोशनी" },
      },
      {
        from: { en: "Tambaram", ta: "தாம்பரம்", hi: "ताम्बरम" },
        to: { en: "Chrompet", ta: "க்ரோம்பேட்", hi: "क्रोम्पेट" },
        time: "night", safety: "moderate",
        tip: { en: "Stick to the main road", ta: "முக்கிய சாலையில் பயணிக்கவும்", hi: "मुख्य सड़क पर रहें" },
      },
      {
        from: { en: "Koyambedu", ta: "கோயம்பேடு", hi: "कोयम्बेडु" },
        to: { en: "Vadapalani", ta: "வடபழனி", hi: "वडापलनी" },
        time: "any", safety: "safe",
        tip: { en: "High footfall area", ta: "மக்கள் நடமாட்டம் அதிகம்", hi: "अधिक भीड़भाड़ वाला क्षेत्र" },
      },
      {
        from: { en: "Velachery", ta: "வேளச்சேரி", hi: "वेलाचेरी" },
        to: { en: "OMR", ta: "OMR", hi: "OMR" },
        time: "night", safety: "unsafe",
        tip: { en: "Avoid travelling alone after 10 PM", ta: "இரவு 10 மணிக்கு பின் தனியாக வரவேண்டாம்", hi: "रात 10 बजे के बाद अकेले न जाएँ" },
      },
    ],
  },
  {
    id: "coimbatore",
    name: { en: "Coimbatore", ta: "கோயம்புத்தூர்", hi: "कोयम्बटूर" },
    routes: [
      {
        from: { en: "RS Puram", ta: "RS புரம்", hi: "आरएस पुरम" },
        to: { en: "Gandhipuram", ta: "காந்திபுரம்", hi: "गांधीपुरम" },
        time: "any", safety: "safe",
        tip: { en: "Central area, well monitored", ta: "மத்திய பகுதி, நல்ல கண்காணிப்பு", hi: "केंद्रीय क्षेत्र, अच्छी निगरानी" },
      },
      {
        from: { en: "Singanallur", ta: "சிங்கநல்லூர்", hi: "सिंगनल्लूर" },
        to: { en: "Ukkadam", ta: "உக்கடம்", hi: "उक्कडम" },
        time: "night", safety: "moderate",
        tip: { en: "Stay on main roads", ta: "முக்கிய சாலையில் இருங்கள்", hi: "मुख्य सड़कों पर रहें" },
      },
    ],
  },
  {
    id: "madurai",
    name: { en: "Madurai", ta: "மதுரை", hi: "मदुरै" },
    routes: [
      {
        from: { en: "Meenakshi Temple area", ta: "மீனாட்சி கோயில் பகுதி", hi: "मीनाक्षी मंदिर क्षेत्र" },
        time: "day", safety: "safe",
        tip: { en: "Tourist zone, well monitored", ta: "சுற்றுலா பகுதி, கண்காணிப்பு உள்ளது", hi: "पर्यटन क्षेत्र, अच्छी निगरानी" },
      },
      {
        from: { en: "Railway Station", ta: "ரயில் நிலையம்", hi: "रेलवे स्टेशन" },
        to: { en: "Bus Stand", ta: "பேருந்து நிலையம்", hi: "बस स्टैंड" },
        time: "night", safety: "unsafe",
        tip: { en: "Do not travel alone", ta: "தனியாக பயணிக்க வேண்டாம்", hi: "अकेले यात्रा न करें" },
      },
    ],
  },
  {
    id: "trichy",
    name: { en: "Trichy", ta: "திருச்சி", hi: "तिरुचि" },
    routes: [
      {
        from: { en: "Rockfort", ta: "ராக்ஃபோர்ட்", hi: "रॉकफोर्ट" },
        to: { en: "Srirangam", ta: "ஸ்ரீரங்கம்", hi: "श्रीरंगम" },
        time: "any", safety: "safe",
        tip: { en: "Pilgrim route", ta: "புனித யாத்திரை பாதை", hi: "तीर्थ मार्ग" },
      },
      {
        from: { en: "Chathiram Bus Stand", ta: "சத்திரம் பஸ் ஸ்டாண்ட்", hi: "छत्रम बस स्टैंड" },
        time: "night", safety: "moderate",
        tip: { en: "Crowded but stay alert", ta: "கூட்டமாக இருந்தாலும் கவனமாக இருங்கள்", hi: "भीड़ है फिर भी सतर्क रहें" },
      },
    ],
  },
  {
    id: "salem",
    name: { en: "Salem", ta: "சேலம்", hi: "सेलम" },
    routes: [
      {
        from: { en: "Shevapet", ta: "செவாபேட்", hi: "शेवापेट" },
        to: { en: "New Bus Stand", ta: "புதிய பஸ் ஸ்டாண்ட்", hi: "नया बस स्टैंड" },
        time: "day", safety: "safe",
        tip: { en: "Commercial area", ta: "வணிக பகுதி", hi: "वाणिज्यिक क्षेत्र" },
      },
      {
        from: { en: "New Bus Stand", ta: "புதிய பஸ் ஸ்டாண்ட்", hi: "नया बस स्टैंड" },
        to: { en: "Junction", ta: "ஜங்ஷன்", hi: "जंक्शन" },
        time: "night", safety: "moderate",
        tip: { en: "Low lighting at night", ta: "இரவில் வெளிச்சம் குறைவு", hi: "रात में कम रोशनी" },
      },
    ],
  },
  {
    id: "tirunelveli",
    name: { en: "Tirunelveli", ta: "திருநெல்வேலி", hi: "तिरुनेलवेली" },
    routes: [
      {
        from: { en: "Old Bus Stand", ta: "பழைய பஸ் ஸ்டாண்ட்", hi: "पुराना बस स्टैंड" },
        to: { en: "Junction", ta: "சந்திப்பு", hi: "जंक्शन" },
        time: "day", safety: "safe",
        tip: { en: "Main road, monitored", ta: "பெரும் சாலை, கண்காணிப்பு உண்டு", hi: "मुख्य सड़क, निगरानी में" },
      },
      {
        from: { en: "Court Junction", ta: "கோர்ட் ஜங்ஷன்", hi: "कोर्ट जंक्शन" },
        time: "night", safety: "moderate",
        tip: { en: "Travel in groups", ta: "குழுவாக பயணிக்கவும்", hi: "समूह में यात्रा करें" },
      },
    ],
  },
  {
    id: "vellore",
    name: { en: "Vellore", ta: "வேலூர்", hi: "वेल्लोर" },
    routes: [
      {
        from: { en: "CMC Hospital area", ta: "CMC மருத்துவமனை பகுதி", hi: "सीएमसी अस्पताल क्षेत्र" },
        time: "any", safety: "safe",
        tip: { en: "Medical campus, safe", ta: "மருத்துவ வளாகம், பாதுகாப்பானது", hi: "मेडिकल परिसर, सुरक्षित" },
      },
      {
        from: { en: "Fort area", ta: "கோட்டை பகுதி", hi: "किला क्षेत्र" },
        time: "night", safety: "moderate",
        tip: { en: "Travel in a group at night", ta: "இரவில் குழுவாக பயணிக்கவும்", hi: "रात में समूह में यात्रा करें" },
      },
    ],
  },
];

const safetyBadge = (s: Safety) =>
  s === "safe" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
  : s === "moderate" ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
  : "bg-red-500/20 text-red-300 border-red-500/40";

const timeIcon = (t: TimeBand) =>
  t === "day" ? <Sun className="h-3.5 w-3.5" /> :
  t === "night" ? <Moon className="h-3.5 w-3.5" /> :
  <Globe2 className="h-3.5 w-3.5" />;

function SafeRoutePage() {
  const { t, lang } = useI18n();
  const L: Lang = (lang ?? "en") as Lang;
  const [cityId, setCityId] = useState<string>(CITIES[0].id);
  const [openInfo, setOpenInfo] = useState<number | null>(null);
  const city = useMemo(() => CITIES.find((c) => c.id === cityId)!, [cityId]);

  return (
    <div className="min-h-screen bg-background text-foreground p-4 max-w-3xl mx-auto">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> {t("nav.back")}
      </Link>

      <div className="glass-strong rounded-2xl p-6 mb-5">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-700 shrink-0">
            <MapPin className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t("sr.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("sr.subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="glass-strong rounded-2xl p-5 mb-5">
        <label className="text-xs uppercase tracking-wider text-muted-foreground">{t("sr.cityLabel")}</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {CITIES.map((c) => (
            <button
              key={c.id}
              onClick={() => { setCityId(c.id); setOpenInfo(null); }}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${cityId === c.id ? "bg-violet-500/30 border-violet-400 text-white" : "border-white/10 hover:bg-white/5"}`}
            >{c.name[L]}</button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {city.routes.map((r, i) => (
          <div key={i} className="glass-strong rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="font-semibold text-base">
                  {r.from[L]}{r.to ? <> <span className="text-muted-foreground">→</span> {r.to[L]}</> : null}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                    {timeIcon(r.time)} {t(`sr.time.${r.time}`)}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${safetyBadge(r.safety)}`}>
                    <ShieldCheck className="h-3 w-3" /> {t(`sr.safety.${r.safety}`)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{t("sr.tipLabel")}</span> {r.tip[L]}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={() => setOpenInfo(openInfo === i ? null : i)}
                className="text-[11px] text-violet-300 inline-flex items-center gap-1 hover:underline"
              >
                <Info className="h-3 w-3" /> {t("sr.howRated")}
              </button>
              <button className="text-sm bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium px-4 py-1.5 rounded-lg">
                {t("sr.checkRoute")}
              </button>
            </div>
            {openInfo === i && (
              <div className="mt-3 glass rounded-lg p-3 text-xs space-y-1">
                <div className="font-semibold mb-1">{t("sr.howRatedTitle")}</div>
                <div>• {t("sr.f1")}</div>
                <div>• {t("sr.f2")}</div>
                <div>• {t("sr.f3")}</div>
                <div>• {t("sr.f4")}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-center text-[11px] text-muted-foreground mt-6 flex items-center justify-center gap-1">
        <Clock className="h-3 w-3" /> {t("sr.updated")}
      </p>
    </div>
  );
}
