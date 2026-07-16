import { useI18n, LANGS, type Lang } from "@/lib/i18n";
import { useState } from "react";
import { Globe } from "lucide-react";

export function LanguageGate() {
  const { lang, setLang } = useI18n();
  const [picked, setPicked] = useState<Lang>("en");

  if (lang) return null;

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-background/90 backdrop-blur p-4">
      <div className="glass-strong rounded-2xl p-6 max-w-sm w-full text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-600">
          <Globe className="h-6 w-6 text-white" />
        </div>
        <h2 className="mt-4 text-lg font-bold">Choose your language</h2>
        <p className="text-xs text-muted-foreground mt-1">தமிழ் · हिन्दी · English</p>

        <div className="mt-5 space-y-2">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setPicked(l.code)}
              className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                picked === l.code
                  ? "border-pink-400 bg-pink-500/10"
                  : "border-white/10 hover:bg-white/5"
              }`}
            >
              <div className="font-semibold">{l.native}</div>
              <div className="text-[11px] text-muted-foreground">{l.label}</div>
            </button>
          ))}
        </div>

        <button
          onClick={() => setLang(picked)}
          className="mt-5 w-full rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="glass-strong rounded-2xl p-6 space-y-3">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4" />
        <h3 className="font-semibold">{t("lang.label")}</h3>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {LANGS.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            className={`rounded-lg border px-3 py-2 text-sm transition ${
              lang === l.code
                ? "border-pink-400 bg-pink-500/10 text-white"
                : "border-white/10 hover:bg-white/5"
            }`}
          >
            <div className="font-medium">{l.native}</div>
            <div className="text-[10px] text-muted-foreground">{l.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
