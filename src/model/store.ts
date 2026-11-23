import type { Song } from './types';

export interface SongStore {
  /** All songs, most recently updated first. */
  list(): Promise<Song[]>;
  get(id: string): Promise<Song | undefined>;
  put(song: Song): Promise<void>;
  delete(id: string): Promise<void>;
}

const byRecent = (a: Song, b: Song) => b.updatedAt - a.updatedAt;

export class MemoryStore implements SongStore {
  private songs = new Map<string, Song>();
  async list() {
    return [...this.songs.values()].sort(byRecent);
  }
  async get(id: string) {
    return this.songs.get(id);
  }
  async put(song: Song) {
    this.songs.set(song.id, structuredClone(song));
  }
  async delete(id: string) {
    this.songs.delete(id);
  }
}

const DB_NAME = 'pao';
const STORE = 'songs';

/** Songs persisted in the browser's IndexedDB: local to the device, works offline. */
export class IndexedDbStore implements SongStore {
  private dbp: Promise<IDBDatabase> | null = null;
  constructor(private name = DB_NAME) {}

  private db(): Promise<IDBDatabase> {
    this.dbp ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(this.name, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.dbp;
  }

  private async run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.db();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async list() {
    const all = await this.run<Song[]>('readonly', (s) => s.getAll());
    return all.sort(byRecent);
  }
  get(id: string) {
    return this.run<Song | undefined>('readonly', (s) => s.get(id));
  }
  async put(song: Song) {
    await this.run('readwrite', (s) => s.put(song));
  }
  async delete(id: string) {
    await this.run('readwrite', (s) => s.delete(id));
  }
}
