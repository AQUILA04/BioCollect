import type { OfflineState } from "./domain";
import { emptyOfflineState } from "./domain";

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

const OFFLINE_STATE_KEY = "biocollect/mobile/offline-state/v1";

export class OfflineStore {
  constructor(private readonly storage: KeyValueStore) {}

  async read(): Promise<OfflineState> {
    const raw = await this.storage.getItem(OFFLINE_STATE_KEY);
    if (!raw) return emptyOfflineState();
    try {
      const parsed = JSON.parse(raw) as Partial<OfflineState>;
      return {
        session: parsed.session ?? null,
        projects: parsed.projects ?? [],
        queue: parsed.queue ?? [],
      };
    } catch {
      return emptyOfflineState();
    }
  }

  async write(next: OfflineState): Promise<void> {
    await this.storage.setItem(OFFLINE_STATE_KEY, JSON.stringify(next));
  }
}
