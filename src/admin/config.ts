/**
 * Where the team's songs live and how a phone becomes the admin. All three values are supplied when the app
 * is built (see README, "Team updates"); without them the app simply has no update or admin buttons.
 * Note: anything inside an app can be found by someone determined, so the PIN is a gentle lock, not real security.
 */
export const ADMIN_PIN: string = import.meta.env.VITE_ADMIN_PIN ?? '';
export const ADMIN_TOKEN: string = import.meta.env.VITE_ADMIN_TOKEN ?? '';
export const GIST_ID: string = import.meta.env.VITE_GIST_ID ?? '';
export const GIST_FILE = 'songs.json';

/** Phones can tap "Update songs". */
export const updatesAvailable = GIST_ID !== '';
/** A phone can become the admin with the PIN. */
export const adminAvailable = ADMIN_PIN !== '' && ADMIN_TOKEN !== '' && GIST_ID !== '';
