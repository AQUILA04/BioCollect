import { describe, expect, it } from "vitest";
import type { KeyValueStore } from "./offline-store";
import { OfflineStore } from "./offline-store";
import { activateAgent, enqueueSubmission } from "./mobile-workflow";
import { SyncService, type SyncTransport } from "./sync-service";
import { emptyOfflineState } from "./domain";

class MemoryStore implements KeyValueStore {
  private readonly values = new Map<string, string>();
  async getItem(key: string) { return this.values.get(key) ?? null; }
  async setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("parcours mobile offline intégré", () => {
  it("active un agent, persiste son état, télécharge le formulaire, met un dossier en file puis le synchronise", async () => {
    const offline = new OfflineStore(new MemoryStore());
    const received: { tenantId?: string; accessToken?: string; submissionIds?: string[] } = {};
    const transport: SyncTransport = {
      pull: async input => {
        received.tenantId = input.tenantId;
        received.accessToken = input.accessToken;
        return { serverTime: 200, projects: [{ projectId: "project-1", projectName: "Collecte pilote", requiredFingers: ["RIGHT_THUMB"], nfiqThreshold: 3, matchingThreshold: 85, downloadedAt: 0, forms: [{ id: "form-1", name: "Enrôlement", fields: [{ id: "name", label: "Nom", type: "text", required: true }] }] }] };
      },
      push: async input => {
        received.submissionIds = input.submissions.map(item => item.id);
        return { acceptedSubmissionIds: input.submissions.map(item => item.id), rejected: [] };
      },
    };
    const service = new SyncService(offline, transport);
    let state = activateAgent(emptyOfflineState(), { agentName: "Agent", tenantId: "tenant-1", accessToken: "token-1" });
    await offline.write(state);
    state = await service.pull(state);
    expect(received).toMatchObject({ tenantId: "tenant-1", accessToken: "token-1" });
    expect(state.projects[0]?.forms[0]?.name).toBe("Enrôlement");

    state = enqueueSubmission(state, { projectId: "project-1", formId: "form-1", data: { name: "Awa" }, attachments: [{ id: "attachment-1", type: "fingerprint", minioPath: "minio://biocollect/tenant-1/project-1/fingerprint_RIGHT_THUMB.bin", capturedAt: 201 }] }, "submission-1", 202);
    await offline.write(state);
    expect((await offline.read()).queue).toHaveLength(1);

    state = await service.push(state);
    expect(received.submissionIds).toEqual(["submission-1"]);
    expect(state.queue).toHaveLength(0);
    expect((await offline.read()).queue).toHaveLength(0);
  });
});
