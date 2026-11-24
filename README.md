# Songbook (Project PAO)

Chord sheets for guitar, ukulele and piano: write songs with chords above the lyrics, transpose, scroll the page
hands-free while you play, plan service line ups, and pick a colour palette (each has a Day and a Night look) and a font in Settings. Everything is stored on the device, so it works offline.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests
npm run typecheck
```

## Android app (APK)

The web app is wrapped with [Capacitor](https://capacitorjs.com). App name `Songbook`, package `app.pao.songbook`.

### Install it on a phone

Open the repository's **Releases** page, download **Songbook.apk** from the latest release, and open it on the
phone (Android will ask to allow installs from that source). Every release is signed with the same key, so a new
version installs over the old one and keeps the songs and line ups stored in the app.

### Make a release

Either push a version tag, or open the **Actions** tab, choose **Android APK**, press **Run workflow**, pick the
branch and type a version such as `0.1.0`. The workflow builds the app and attaches `Songbook.apk` to a new release
(creating the tag for you).

```bash
git tag v0.1.0 && git push origin v0.1.0
```

Every push (without a tag) also builds an APK: open the **Actions** tab, choose the run, and download
**Songbook-apk** from its Artifacts. You can start a build by hand with **Run workflow**.

### Build it yourself

Needs Node 22, JDK 21 and the Android SDK (Android Studio installs both SDK and JDK).

```bash
npm run android:sync                      # build the web app and copy it into android/
cd android && ./gradlew assembleDebug     # APK: android/app/build/outputs/apk/debug/app-debug.apk
# or: npm run android:open                # opens the project in Android Studio
```

After changing the logo in `assets/`, run `npm run assets` to regenerate the icons and splash screens.

### Notes

- The APK is signed with a shared debug key kept in the repo (`android/app/debug.keystore`). That is fine for
  installing on your own devices and gives every build the same signature, so updates work. A Play Store release
  needs your own private key instead.
- Each build gets a higher version number (the workflow run number), and a tagged release is named after its tag.
- The screen stays on while a song is open (switch in the reader and in the menu).
- The Android back button closes an open panel first, then steps back, and only exits from the song list.
