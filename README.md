# BPCG - PAW (Project PAO)

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

The web app is wrapped with [Capacitor](https://capacitorjs.com). App name `BPCG - PAW`, package `app.pao.songbook`.

### Install it on a phone

Open the repository's **Releases** page, download **PAW.apk** from the latest release, and open it on the
phone (Android will ask to allow installs from that source). Every release is signed with the same key, so a new
version installs over the old one and keeps the songs and line ups stored in the app.

### Make a release

Either push a version tag, or open the **Actions** tab, choose **Android APK**, press **Run workflow**, pick the
branch and type a version such as `0.1.0`. The workflow builds the app and attaches `PAW.apk` to a new release
(creating the tag for you).

```bash
git tag v0.1.0 && git push origin v0.1.0
```

Every push (without a tag) also builds an APK: open the **Actions** tab, choose the run, and download
**PAW-apk** from its Artifacts. You can start a build by hand with **Run workflow**.

## Team updates (admin phone and Update button)

One phone is the **admin**. When it taps **Update** on the Songs screen, everyone else gets those songs by tapping
**Update** on the same screen. Songs a person made or edited on their own phone are never replaced or removed.
There is no server of your own: the songs live in a GitHub **Gist** (one file hosted by GitHub).

**Set it up once**

1. Go to <https://gist.github.com>. Name the file `songs.json`, type `{}` as its content, and choose **Create secret gist**.
   Copy the long id at the end of the page's address and paste it into `GIST_ID_IN_CODE` in `src/admin/config.ts`
   (or set it as an Actions variable called `GIST_ID`).
2. Go to <https://github.com/settings/tokens> and choose **Generate new token (classic)**. Tick only **gist**. Copy the token.
3. In this repository open **Settings, Secrets and variables, Actions**, and on **Secrets** add `ADMIN_TOKEN` (the token).
4. Build a new release (Actions, **Android APK**, Run workflow, type a version). Install it on every phone.

The admin password is built into the app (`ADMIN_PASSWORD` in `src/admin/config.ts`).

**Using it**

- On the admin phone: Settings, scroll to **Admin**, enter the admin password. The Songs and Line up screens then show **Update** (under the tabs) to send them to everyone, a sparkle-outlined ADMIN badge next to the title, and the Line up screen has a round **+** button at the bottom right to create a line up. Songs and line ups are published (and updated) separately; they are two files in the Gist.
- Only one phone is the admin: the phone that enters the password last. An older admin phone switches itself off the next time it opens the Songs screen or Settings.
- On any other phone: **Update** on the Songs screen, and **Update** on the Line up screen. Line ups are view-only there: only the admin phone creates or changes them, and Update makes a phone's line ups the same as the admin's.
- When the admin has published something new, a notice ("The admin has added N songs to the app" or "…N line ups…") appears on the matching screen when the app is opened.
- A song the admin deletes disappears from other phones on their next update, unless that person has edited it. Sample songs and a person's own songs stay.
- Songs can have an optional reference video link (shown between Notes and Chords only when there is one).

The password and token are inside the app file, and the password is also in this repository's code, so treat the password as a gentle lock and not as strong security. The token can only change that one Gist,
and GitHub keeps the Gist's history, so an older version can always be restored.

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
