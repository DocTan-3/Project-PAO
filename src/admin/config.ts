/**
 * Where the team's songs live and how a phone becomes the admin (see README, "Team updates").
 * Without a Gist id the app has no Update button; without the token it has no Admin section.
 * Note: anything inside an app can be found by someone determined, so the password is a gentle lock, not real security.
 */
/** The admin password, typed in Settings. */
export const ADMIN_PASSWORD: string = import.meta.env.VITE_ADMIN_PASSWORD || 'BPCG-PAW_2018';
/** A GitHub token that can only edit Gists. It is a build secret and is never committed. */
export const ADMIN_TOKEN: string = import.meta.env.VITE_ADMIN_TOKEN ?? '';
/** The id of the Gist that holds the team's songs (not secret). Paste it here, or set VITE_GIST_ID when building. */
const GIST_ID_IN_CODE = '2af8613f377bf2efb93a31cbcd87ced5';
export const GIST_ID: string = import.meta.env.VITE_GIST_ID || GIST_ID_IN_CODE;
export const GIST_FILE = 'songs.json';

/** Phones can tap "Update songs". */
export const updatesAvailable = GIST_ID !== '';
/** A phone can become the admin with the password. */
export const adminAvailable = ADMIN_PASSWORD !== '' && ADMIN_TOKEN !== '' && GIST_ID !== '';
