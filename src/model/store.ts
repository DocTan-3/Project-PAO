import { type Lineup, normalizeLineup } from './lineup';
import type { Song } from './types';

export interface SongStore {
  /** All songs, most recently updated first. */
  list(): Promise<Song[]>;
  get(id: string): Promise<Song | undefined>;
  put(song: Song): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface LineupStore {
  listLineups(): Promise<Lineup[]>;
  getLineup(id: string): Promise<Lineup | undefined>;
  putLineup(lineup: Lineup): Promise<void>;
  deleteLineup(id: string): Promise<void>;
}

export type Store = SongStore & LineupStore;

const byRecent = (a: Song, b: Song) => b.updatedAt - a.updatedAt;
const byDateDesc = (a: Lineup, b: Lineup) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt);

export class MemoryStore implements Store {
  private songs = new Map<string, Song>();
  private lineups = new Map<string, Lineup>();
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
  async listLineups() {
    return [...this.lineups.values()].map(normalizeLineup).sort(byDateDesc);
  }
  async getLineup(id: string) {
    const l = this.lineups.get(id);
    return l && normalizeLineup(l);
  }
  async putLineup(l: Lineup) {
    this.lineups.set(l.id, structuredClone(l));
  }
  async deleteLineup(id: string) {
    this.lineups.delete(id);
  }
}

const DB_NAME = 'pao';
const DB_VERSION = 2; // 1: songs. 2: adds line ups (existing songs are kept)
const SONGS = 'songs';
const LINEUPS = 'lineups';

/** Songs and line ups persisted in the browser's IndexedDB: local to the device, works offline. */
export class IndexedDbStore implements Store {
  private dbp: Promise<IDBDatabase> | null = null;
  constructor(private name = DB_NAME) {}

  private db(): Promise<IDBDatabase> {
    this.dbp ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(this.name, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        // create only what is missing, so an upgrade never touches existing songs
        if (!db.objectStoreNames.contains(SONGS)) db.createObjectStore(SONGS, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(LINEUPS)) db.createObjectStore(LINEUPS, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.dbp;
  }

  private async run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.db();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const req = fn(tx.objectStore(store));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async list() {
    const all = await this.run<Song[]>(SONGS, 'readonly', (s) => s.getAll());
    return all.sort(byRecent);
  }
  get(id: string) {
    return this.run<Song | undefined>(SONGS, 'readonly', (s) => s.get(id));
  }
  async put(song: Song) {
    await this.run(SONGS, 'readwrite', (s) => s.put(song));
  }
  async delete(id: string) {
    await this.run(SONGS, 'readwrite', (s) => s.delete(id));
  }
  async listLineups() {
    const all = await this.run<Lineup[]>(LINEUPS, 'readonly', (s) => s.getAll());
    return all.map(normalizeLineup).sort(byDateDesc);
  }
  async getLineup(id: string) {
    const l = await this.run<Lineup | undefined>(LINEUPS, 'readonly', (s) => s.get(id));
    return l && normalizeLineup(l);
  }
  async putLineup(l: Lineup) {
    await this.run(LINEUPS, 'readwrite', (s) => s.put(l));
  }
  async deleteLineup(id: string) {
    await this.run(LINEUPS, 'readwrite', (s) => s.delete(id));
  }
}
