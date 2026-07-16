# Her Guardian — Android Build Guide

Complete beginner-friendly steps to run **Her Guardian** on a real Android phone and produce a shareable **debug APK**.

> ⚠️ Lovable's cloud sandbox cannot compile an APK (no Android SDK / Java / Gradle). You must run the final build on your own machine with Android Studio installed.

---

## 1. Prerequisites (one-time on your computer)

| Tool | Version | Why |
| ---- | ------- | --- |
| Node.js | ≥ 20 LTS | Runs Vite build |
| npm or bun | any recent | Installs deps |
| Android Studio | Hedgehog+ (2023.1) | Provides SDK, emulator, APK build |
| Java (JDK) | 17 (bundled with Android Studio) | Gradle needs it |
| Android phone | Android 8+ with USB debugging | Real-device testing |

Install Android Studio → open it once → let it install the **Android SDK Platform 34+**, **Platform-Tools**, and **Build-Tools**.

Set these environment variables (macOS/Linux `~/.zshrc`, Windows System Env):
```
ANDROID_HOME=$HOME/Library/Android/sdk        # macOS default
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
```

---

## 2. Get the code

Export the project from Lovable → GitHub, then clone locally:
```bash
git clone <your-repo-url> her-guardian
cd her-guardian
npm install         # or: bun install
```

---

## 3. Build the web app

```bash
npm run build
```
Output goes to `dist/` — this is what Capacitor ships inside the APK.

If `npm run build` fails, fix web errors first before touching Android.

---

## 4. Add the Android platform (one-time)

```bash
npx cap add android
```
This creates the `android/` folder — commit it to your repo after adding.

If `android/` already exists (from a previous run), **skip** this step.

---

## 5. Sync web assets into Android

Run this **every time** you change web code or dependencies:
```bash
npm run build
npx cap sync android
```

---

## 6. Configure permissions

Open `android/app/src/main/AndroidManifest.xml` and confirm these permissions are inside `<manifest>`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```
The Capacitor plugins auto-add most of these on `cap sync`, but double-check.

> SMS permission (`SEND_SMS`) is only needed if you want the native `@byteowls/capacitor-sms` silent-SIM path. Twilio backend SMS does not require it.

---

## 7. Run on a real phone

1. Enable **Developer Options** on the phone (Settings → About phone → tap "Build number" 7 times).
2. Enable **USB debugging** (Settings → Developer options).
3. Plug phone into computer, accept the RSA prompt on the phone.
4. Verify it's connected:
   ```bash
   adb devices
   ```
5. Open the project in Android Studio:
   ```bash
   npx cap open android
   ```
6. Wait for Gradle sync to finish, pick your phone in the device dropdown, press ▶ **Run**.

The app installs and launches. Grant Location + Microphone when prompted.

---

## 8. Build a shareable debug APK

Inside Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**

Or from the terminal:
```bash
cd android
./gradlew assembleDebug          # macOS/Linux
gradlew.bat assembleDebug        # Windows
```

**APK file location:**
```
android/app/build/outputs/apk/debug/app-debug.apk
```
Send this file to any Android phone → tap to install (allow "Install unknown apps" for the file manager).

---

## 9. Rebuild after future Lovable updates

Every time you pull new code from Lovable:
```bash
git pull
npm install
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

---

## 10. Twilio SMS backend

The SMS emergency feature uses Twilio via the Lovable backend gateway. You do **not** ship any Twilio secrets inside the APK — server functions handle it. On the Lovable side:
1. Connectors → Twilio → already connected as "Magesh".
2. `TWILIO_FROM_NUMBER` secret must be set to a SMS-capable Twilio number.
3. If your Twilio account is in trial mode, verify each destination number in Twilio Console → Phone Numbers → Verified Caller IDs.

WhatsApp sharing does **not** require Twilio — it opens the user's own WhatsApp app with the SOS message pre-filled; the user taps Send.

---

## 11. Known limitations (honest)

- **Background safe-word listening**: Web Speech Recognition stops when the app is backgrounded, screen is locked, or Android kills the process. Continuous background listening would need a native Android foreground service with the Android SpeechRecognizer — not implemented. The safe word works reliably while the app is open and the screen is on (a wake-lock is acquired automatically).
- **APK build**: Lovable's cloud sandbox has no Android SDK / Gradle / Java, so `.apk` files must be produced on your own machine.
- **iOS**: not covered by this guide (use `npx cap add ios` on a Mac with Xcode).
- **Native silent SMS**: `@byteowls/capacitor-sms@7` works on Android 8+, requires `SEND_SMS` permission, and is blocked on Android 10+ non-default SMS apps for most sends. Twilio backend is the reliable path.

---

## 12. Troubleshooting

| Problem | Fix |
| ------- | --- |
| `SDK location not found` | Set `ANDROID_HOME` env var, or open Android Studio once so it configures `local.properties`. |
| `Failed to install APK` | Uninstall any old copy of Her Guardian first (app IDs must not clash). |
| Blank white screen after install | Ran `cap sync` before `npm run build`? Re-run in the correct order. |
| Location stuck on "Waiting for GPS" | Enable device location, grant permission, step outside. App falls back to last-known after 10 seconds. |
| WhatsApp button opens browser page instead of app | WhatsApp is not installed on the device, or the number is invalid — check contact validation. |
| Safe word never triggers | Web Speech Recognition needs an internet connection on Android. Test in a quiet room; check mic permission in system settings. |
| Gradle sync fails on first open | Update Android Studio, install SDK 34, then File → Invalidate Caches → Restart. |
