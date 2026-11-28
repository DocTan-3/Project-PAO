/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** the admin password (optional: the app has one built in) */
  readonly VITE_ADMIN_PASSWORD?: string;
  /** a GitHub token that can only edit Gists (set as a build secret, never committed) */
  readonly VITE_ADMIN_TOKEN?: string;
  /** set to "off" to build without team updates or admin features */
  readonly VITE_TEAM?: string;
  /** the id of the Gist that holds the team's songs */
  readonly VITE_GIST_ID?: string;
}
