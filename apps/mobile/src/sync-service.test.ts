import { describe, expect, it } from "vitest";
import type { OfflineState, ProjectSnapshot, QueuedSubmission } from "./domain";
import { OfflineStore, type KeyValueStore } from "./offline-store";
import { SyncService, type SyncTransport } from "./sync-service";

class MemoryStore implements KeyValueStore {
  private readonly values = new Map<string, string>();
  async getItem(key: string) { return this.values.get(key) ?? null; }
  async setItem(key: string, value: string) { this.values.set(key, value); }
}

const project: ProjectSnapshot = { projectId: "project-1", projectName: "Collecte pilote", requiredFingers: ["RIGHT_THUMB"], nfiqThreshold: 3, matchingThreshold: 85, forms: [], downloadedAt: 0 };
const submission = (id: string): QueuedSubmission => ({ id, tenantId: "tenant-1", projectId: "project-1", formId: "form-1", data: { name: "Awa" }, attachments: [], status: "DRAFT", queuedAt: 1, retryCount: 0 });
const state = (queue: QueuedSubmission[] = []): OfflineState => ({ session: { tenantId: "tenant-1", accessToken: "token", agentName: "Agent" }, projects: [], queue });

describe("SyncService mobile", () => {
  it("télécharge et persiste les formulaires associés au tenant actif", async () => {
    const storage = new OfflineStore(new MemoryStore());
    const transport: SyncTransport = { pull: async () => ({ projects: [project], serverTime: 123 }), push: async () => ({ acceptedSubmissionIds: [], rejected: [] }) };
    const next = await new SyncService(storage, transport).pull(state());
    expect(next.projects).toEqual([{ ...project, downloadedAt: 123 }]);
    expect((await storage.read()).projects[0]?.downloadedAt).toBe(123);
  });

  it("retire uniquement les dossiers confirmés et conserve les rejets pour reprise", async () => {
    const storage = new OfflineStore(new MemoryStore());
    const transport: SyncTransport = { pull: async () => ({ projects: [], serverTime: 0 }), push: async () => ({ acceptedSubmissionIds: ["accepted"], rejected: [{ id: "retry", reason: "network" }] }) };
    const next = await new SyncService(storage, transport).push(state([submission("accepted"), submission("retry")]));
    expect(next.queue).toHaveLength(1);
    expect(next.queue[0]).toMatchObject({ id: "retry", retryCount: 1 });
  });

  it("refuse une synchronisation si la session agent est absente", async () => {
    const storage = new OfflineStore(new MemoryStore());
    const transport: SyncTransport = { pull: async () => ({ projects: [], serverTime: 0 }), push: async () => ({ acceptedSubmissionIds: [], rejected: [] }) };
    await expect(new SyncService(storage, transport).pull({ session: null, projects: [], queue: [] })).rejects.toThrow("Session agent requise");
  });
});
