export type MobileAttachment = {
  fingerType: string;
  minioPath: string;
  nfiqScore: number;
};

export type QueuedEnrollment = {
  id: string;
  projectId: string;
  formSchemaId?: string;
  data: Record<string, unknown>;
  attachments: MobileAttachment[];
};

export interface SyncTransport {
  pull(projectId: string): Promise<unknown>;
  push(entry: Omit<QueuedEnrollment, "id">): Promise<{ id: string; status: string }>;
}

export interface OfflineQueue {
  listPending(): Promise<QueuedEnrollment[]>;
  markSynced(id: string): Promise<void>;
}

/** A framework-agnostic service used by the React Native app and test harness. */
export class MobileSyncService {
  constructor(private readonly transport: SyncTransport, private readonly queue: OfflineQueue) {}

  pull(projectId: string) {
    return this.transport.pull(projectId);
  }

  async pushPending(): Promise<{ syncedIds: string[]; failedIds: string[] }> {
    const pending = await this.queue.listPending();
    const syncedIds: string[] = [];
    const failedIds: string[] = [];

    for (const entry of pending) {
      try {
        if (entry.attachments.some(attachment => !attachment.minioPath.startsWith("minio://"))) {
          throw new Error("Le dossier hors ligne contient un chemin MinIO invalide.");
        }
        await this.transport.push({
          projectId: entry.projectId,
          formSchemaId: entry.formSchemaId,
          data: entry.data,
          attachments: entry.attachments,
        });
        await this.queue.markSynced(entry.id);
        syncedIds.push(entry.id);
      } catch {
        failedIds.push(entry.id);
      }
    }
    return { syncedIds, failedIds };
  }
}
