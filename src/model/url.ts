/** A web address a person pasted for a reference video. Only http and https links are accepted. */
export function webUrl(text: string | undefined | null): string | null {
  const t = (text ?? '').trim();
  if (!t) return null;
  // people often paste "youtube.com/..." without the https://
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (!u.hostname.includes('.')) return null;
    return u.href;
  } catch {
    return null;
  }
}

/** "youtube.com" for display. */
export function webHost(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return href;
  }
}
