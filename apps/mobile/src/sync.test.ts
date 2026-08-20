import { describe, expect, it } from "vitest";
import { MobileSyncService, type OfflineQueue, type SyncTransport } from "./sync";

describe("MobileSyncService", () => {
  it("synchronise les dossiers valides et conserve les dossiers invalides dans la file", async () => {
    const markedSynced: string[] = [];
    const queue: OfflineQueue = {
      listPending: async () => [
        { id: "valid", projectId: "p1", data: { nom: "Ada" }, attachments: [{ fingerType: "RIGHT_THUMB", minioPath: "minio://biocollect/a.wsq", nfiqScore: 2 }] },
        { id: "invalid", projectId: "p1", data: { nom: "Grace" }, attachments: [{ fingerType: "RIGHT_THUMB", minioPath: "https://invalid/a.wsq", nfiqScore: 2 }] },
      ],
      markSynced: async id => { markedSynced.push(id); },
    };
    const transport: SyncTransport = {
      pull: async () => ({ project: "p1" }),
      push: async () => ({ id: "submission-1", status: "VALIDATED" }),
    };

    const service = new MobileSyncService(transport, queue);
    await expect(service.pull("p1")).resolves.toEqual({ project: "p1" });
    await expect(service.pushPending()).resolves.toEqual({ syncedIds: ["valid"], failedIds: ["invalid"] });
    expect(markedSynced).toEqual(["valid"]);
  });
});
