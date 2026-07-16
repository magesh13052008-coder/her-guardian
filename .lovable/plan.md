
# Her Guardian — Production Hardening Plan

Your request spans ~15 areas. Doing all of it in one shot risks breaking working features (SMS queue, safeword listener, live tracking). I'll deliver it in **4 sequential phases**, each independently buildable and testable. You approve, I execute phase 1; we verify; then phase 2; etc.

Before starting: **I cannot compile an Android APK inside Lovable** (no Android SDK/Java/Gradle in this sandbox). I can produce a fully working web + Capacitor-ready codebase and complete APK build docs — the actual `./gradlew assembleDebug` must run on your machine or Android Studio.

---

## Phase 1 — Audit & Error Repair (foundation)

- Full TS typecheck + lint pass; fix real errors (no `--force`).
- Reconcile Capacitor versions. Current mismatch: `@capacitor/geolocation@8` and `@capacitor/local-notifications@8` but no `@capacitor/core`/`cli`/`android` installed. Add matching `@capacitor/core@^8`, `@capacitor/cli@^8`, `@capacitor/android@^8`, `@capacitor/app@^8`, `@capacitor/haptics@^8`. Keep `@byteowls/capacitor-sms@^7` (v8 not published) — document the peer warning; if it breaks build, replace with `send-intent` pattern.
- Add top-level React `ErrorBoundary`.
- Confirm `npm run build` green.

## Phase 2 — Unified SOS Core + WhatsApp + GPS repair

- New `src/lib/sos-service.ts`: single `triggerSOS({source, method})` used by main button, safe-word, journey. Cooldown lock (30s), status callbacks, no duplicate fires.
- New `src/lib/location-service.ts`: state machine (`idle|requesting|live|cached|denied|disabled|timeout`), 10s high-accuracy timeout → fallback to `watchPosition` low-accuracy → last-known from localStorage w/ timestamp. Native path via `@capacitor/geolocation` when `Capacitor.isNativePlatform()`.
- WhatsApp sharing: `sendViaWhatsApp(contact?)` builds `https://wa.me/<E164 no +>?text=<encoded>` with real map link, opens via `window.open` (web) or `App.openUrl` (native). Never claims "sent". Shows accurate states listed in your spec.
- Add "SMS" / "WhatsApp" action buttons per contact in the SOS UI without removing existing SMS queue.

## Phase 3 — Safe-word, Contacts, Mic state machine

- Rework `use-safe-word-listener` to a proper state machine: `idle|requesting|listening|detected|denied|unavailable|error|cooldown`. Whole-phrase word-boundary match (not `includes`). 30s cooldown post-trigger. Auto-restart on `no-speech`/`aborted` only, surface `network`/`service-not-allowed`. "Test Safe Word" button that runs a dry SOS (no SMS/WhatsApp fired).
- Contact validation: name required, E.164 normalization helper (`normalizePhone`), Indian 10-digit → `91XXXXXXXXXX`, reject obvious invalids with clear errors. Route SMS queue and WhatsApp through the normalizer.
- Honest "listening" pill driven by the state machine; manual Start/Stop/Retry.
- Document Android background-listening limitation in UI and README (no fake claims).

## Phase 4 — Capacitor packaging + Docs

- `capacitor.config.ts`: comment `server.url` by default (offline-first APK); keep instructions to re-enable for live reload. Confirm `webDir: 'dist'`.
- Add `capacitor.config.ts` plugin config for Geolocation permissions text.
- Rewrite `ANDROID_SETUP.md` end-to-end: prereqs, `npm install`, `npm run build`, `npx cap add android` (one-time), `npx cap sync`, Studio run, `./gradlew assembleDebug`, APK path `android/app/build/outputs/apk/debug/app-debug.apk`, permissions, Twilio env, troubleshooting.
- Final report in chat: files changed, packages added/removed, env vars, known limitations (background mic, real APK build off-sandbox), test matrix results (build + smoke).

---

## Technical notes

- SMS backend already wired via Twilio connector (`src/lib/sms.functions.ts`, `sms-queue.ts`) — kept as-is; only adds normalization.
- No fake success: SMS status comes from `sendEmergencySms` return; WhatsApp UI states cap at "Opened WhatsApp".
- No secrets in client. No changes to auto-generated Supabase files.
- Cannot verify actual Android runtime from sandbox; verification limited to `npm run build`, TS, and preview browser smoke tests.

---

## What I need from you

1. **Approve the phased plan** (or tell me which phases to skip/reorder).
2. Confirm Capacitor major: **v8** across the board (matches your installed geolocation/local-notifications). OK to bump?
3. Confirm the App ID: your prompt says `com.magesh.herguardian`, current config has `com.herguardian.app`. **Change to `com.magesh.herguardian`?**

Reply "go" (with answers to 2 & 3) and I'll execute Phase 1 immediately.
