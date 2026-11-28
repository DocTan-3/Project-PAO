import { ADMIN_TOKEN, GIST_FILE, GIST_ID } from './config';

export type PackErrorKind = 'offline' | 'missing' | 'busy' | 'auth' | 'other';

export class PackError extends Error {
  constructor(public kind: PackErrorKind) {
    super(kind);
  }
}

/** The message to show a person, in plain words. */
export function packErrorText(e: unknown): string {
  const kind = e instanceof PackError ? e.kind : 'other';
  switch (kind) {
    case 'offline':
      return 'No internet. Please connect to Wi-Fi or mobile data and try again.';
    case 'missing':
      return 'The team songs could not be found. Ask the admin to publish them.';
    case 'busy':
      return 'The song service is busy. Please try again in a few minutes.';
    case 'auth':
      return 'This phone is not allowed to publish. Ask for a new app version.';
    default:
      return 'Sorry, that did not work. Please try again.';
  }
}

const url = () => `https://api.github.com/gists/${GIST_ID}`;
/** GitHub may hand out a copy that is up to a minute old; a different address each time always gets the current one. */
const fresh = () => `${url()}?t=${Date.now()}`;

async function request(init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(init?.method === 'PATCH' ? url() : fresh(), { cache: 'no-store', ...init });
  } catch {
    throw new PackError('offline');
  }
  if (res.status === 404) throw new PackError('missing');
  if (res.status === 401) throw new PackError('auth');
  if (res.status === 403 || res.status === 429) {
    // 403 is both "rate limited" and "not allowed"; a token that was sent and refused is the second
    throw new PackError(init?.headers && 'Authorization' in (init.headers as Record<string, string>) ? 'auth' : 'busy');
  }
  if (!res.ok) throw new PackError('other');
  return res;
}

/** The text of the published songs file. Anyone can read it; no sign-in is needed. */
export async function fetchPackText(): Promise<string> {
  const res = await request({ headers: { Accept: 'application/vnd.github+json' } });
  const json = (await res.json()) as { files?: Record<string, { content?: string; truncated?: boolean; raw_url?: string }> };
  const file = json.files?.[GIST_FILE];
  if (!file) throw new PackError('missing');
  if (file.truncated && file.raw_url) {
    try {
      return await (await fetch(`${file.raw_url}${file.raw_url.includes('?') ? '&' : '?'}t=${Date.now()}`, { cache: 'no-store' })).text();
    } catch {
      throw new PackError('offline');
    }
  }
  return file.content ?? '';
}

/** Replace the published songs file. Only a phone built with the admin token can do this. */
export async function writePackText(text: string): Promise<void> {
  await request({
    method: 'PATCH',
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${ADMIN_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: { [GIST_FILE]: { content: text } } }),
  });
}
