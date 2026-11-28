import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.pao.songbook',
  appName: 'BPCG - PAW',
  webDir: 'dist',
  plugins: {
    // 'native' lets the phone's window handle the bars (the page is never padded twice). The colour behind the bars
    // is set by the app's own BarColor plugin (android/app/src/main/java/app/pao/songbook/BarColorPlugin.java).
    SystemBars: {
      insetsHandling: 'native',
      initialViewportFitValueHint: 'cover',
    },
  },
};

export default config;
