import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export type ShareOutcome = 'shared' | 'saved' | 'cancelled';

/**
 * Hand a text file to the phone's own share screen (Quick Share, Bluetooth, WhatsApp...).
 * In a browser that cannot share files it is saved to the Downloads folder instead.
 */
export async function shareTextFile(filename: string, text: string, title: string): Promise<ShareOutcome> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Filesystem.writeFile({ path: filename, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
      const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
      await Share.share({ title, dialogTitle: title, files: [uri] });
      return 'shared';
    } catch (e) {
      // closing the share screen without choosing anything is not an error
      if (/cancel/i.test(String((e as { message?: string })?.message ?? e))) return 'cancelled';
      throw e;
    }
  }
  const file = new File([text], filename, { type: 'application/json' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return 'shared';
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'saved';
}
