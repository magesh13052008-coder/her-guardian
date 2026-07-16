// One-time native initialization: notification channels + runtime permission prompts.
// Safe to call multiple times; guards against duplicate setup.

import { isNative } from "./native-bridge";
import { debugLog } from "./debug-log";

let initialized = false;

export const initNative = async () => {
  if (initialized) return;
  initialized = true;

  if (!isNative()) {
    debugLog("info", "Running in web browser — skipping native init");
    return;
  }

  debugLog("info", "Native shell detected — initializing");

  // 1. Notification channels (Android 8+). High importance → heads-up popup + sound.
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");

    await LocalNotifications.createChannel({
      id: "sos_critical",
      name: "SOS Alerts",
      description: "Critical safety alerts triggered by Safe Word or SOS button",
      importance: 5, // IMPORTANCE_HIGH → heads-up
      visibility: 1, // PUBLIC on lock screen
      sound: "default",
      vibration: true,
      lights: true,
      lightColor: "#ec4899",
    });
    await LocalNotifications.createChannel({
      id: "realtime_alerts",
      name: "Real-time Alerts",
      description: "Threat detection, journey deviation, and live tracking updates",
      importance: 4, // IMPORTANCE_DEFAULT-HIGH
      visibility: 1,
      sound: "default",
      vibration: true,
    });
    await LocalNotifications.createChannel({
      id: "background_status",
      name: "Background Status",
      description: "Persistent notification while Safe Word listener is armed",
      importance: 2, // LOW — silent
      visibility: 1,
    });
    debugLog("info", "Notification channels created");

    const perm = await LocalNotifications.requestPermissions();
    debugLog("permission", `Notifications: ${perm.display}`);
  } catch (e) {
    debugLog("error", "Notification channel setup failed", { error: String(e) });
  }

  // 2. Geolocation runtime permission
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const perm = await Geolocation.requestPermissions({ permissions: ["location"] });
    debugLog("permission", `Location: ${perm.location}`);
  } catch (e) {
    debugLog("error", "Geolocation permission request failed", { error: String(e) });
  }

  // 3. SMS permission (Android SEND_SMS). The byteowls plugin exposes requestPermissions.
  try {
    const mod: any = await import("@byteowls/capacitor-sms");
    const SmsManager = mod.SmsManager ?? mod.default?.SmsManager ?? mod.default;
    if (SmsManager?.requestPermissions) {
      const perm = await SmsManager.requestPermissions();
      debugLog("permission", `SMS: ${JSON.stringify(perm)}`);
    } else {
      debugLog("info", "SMS plugin has no requestPermissions; first send() will trigger native prompt");
    }
  } catch (e) {
    debugLog("error", "SMS permission request failed", { error: String(e) });
  }
};

// Fire a high-priority local notification (uses sos_critical channel)
export const notifySOS = async (title: string, body: string) => {
  if (!isNative()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.schedule({
      notifications: [{
        id: Math.floor(Math.random() * 1_000_000),
        title,
        body,
        channelId: "sos_critical",
        smallIcon: "ic_stat_icon",
        ongoing: false,
        autoCancel: true,
      }],
    });
  } catch (e) {
    debugLog("error", "notifySOS failed", { error: String(e) });
  }
};
