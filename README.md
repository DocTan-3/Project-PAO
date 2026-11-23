# Songbook (Project PAO)

Chord sheets for guitar, ukulele and piano: write songs with chords above the lyrics, transpose, scroll the page
hands-free while you play, plan service line ups, and read in one of three themes (Light, Dark, or BPCG light
brown). Everything is stored on the device, so it works offline.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests
npm run typecheck
```

## Android app (APK)

The web app is wrapped with [Capacitor](https://capacitorjs.com). App name `Songbook`, package `app.pao.songbook`.

### Get an APK without installing anything

Every push builds an APK on GitHub: open the repository's **Actions** tab, choose the latest **Android APK**
run, and download **Songbook-debug-apk** from the Artifacts section. Unzip it and copy `Songbook-debug.apk`
to the phone, then open it (Android will ask to allow installs from that source).
You can also start a build by hand with **Run workflow**.

### Build it yourself

Needs Node 22, JDK 21 and the Android SDK (Android Studio installs both SDK and JDK).

```bash
npm run android:sync                      # build the web app and copy it into android/
cd android && ./gradlew assembleDebug     # APK: android/app/build/outputs/apk/debug/app-debug.apk
# or: npm run android:open                # opens the project in Android Studio
```

After changing the logo in `assets/`, run `npm run assets` to regenerate the icons and splash screens.

### Notes

- Debug APKs are signed with a debug key: fine for installing on your own devices. A release build for
  the Play Store needs your own signing key.
- The screen stays on while a song is open (switch in the reader and in the menu).
- The Android back button closes an open panel first, then steps back, and only exits from the song list.
