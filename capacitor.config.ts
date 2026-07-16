import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor configuration for the Her Guardian Android app.
//
// Offline / production APK (recommended for real device deploy):
//   Leave the `server` block commented — the app runs the bundled `dist/`.
//
// Live-reload during development (optional):
//   Uncomment the `server` block and point `url` at your Lovable preview URL,
//   then run `npx cap sync android` and open Android Studio.
const config: CapacitorConfig = {
  appId: 'com.magesh.herguardian',
  appName: 'Her Guardian',
  webDir: 'dist',
  // server: {
  //   url: 'https://id-preview--a25f89ef-e7b1-43a9-b7b3-9831174d1463.lovable.app',
  //   cleartext: true,
  // },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#ec4899',
    },
    Geolocation: {
      // Android runtime permission strings are declared in AndroidManifest.xml
      // after `npx cap add android`. See ANDROID_SETUP.md.
    },
  },
};

export default config;
