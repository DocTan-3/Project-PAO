import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.pao.songbook',
  appName: 'BPCG - PAW',
  webDir: 'dist',
  plugins: {
    // The app draws behind the status and navigation bars, so its own background colour shows there (not the phone's
    // light or dark setting) and the bar icons can always be chosen to contrast with it. The page pads itself with the
    // --safe-area-inset-* values that Capacitor injects.
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
    },
  },
};

export default config;
