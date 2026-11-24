import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.pao.songbook',
  appName: 'BPCG - PAW',
  webDir: 'dist',
  plugins: {
    // Android 15+ draws apps edge to edge. The page already pads itself with env(safe-area-inset-*),
    // so let Capacitor report the real insets (and pad the webview itself on older Android).
    SystemBars: {
      insetsHandling: 'native',
      initialViewportFitValueHint: 'cover',
    },
  },
};

export default config;
