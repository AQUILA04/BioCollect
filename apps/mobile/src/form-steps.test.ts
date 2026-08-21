import { describe, expect, it } from "vitest";
import { normalizeFormSteps, validateFormSteps } from "@biocollect/form-engine";
import { OfflineStore, type KeyValueStore } from "./offline-store";
import type { OfflineState } from "./domain";

class MemoryStore implements KeyValueStore {
  private value: string | null = null;
  async getItem() { return this.value; }
  async setItem(_key: string, value: string) { this.value = value; }
}

const fields = [
  { id: "name", label: "Nom", type: "text" as const, required: true },
  { id: "income", label: "Revenu", type: "text" as const, required: false },
];

describe("form steps", () => {
  it("normalise les formulaires existants vers une étape unique implicite", () => {
    expect(normalizeFormSteps("Enrôlement", fields)).toEqual([{ id: "legacy", label: "Enrôlement", order: 0, kind: "fields", fieldIds: ["name", "income"] }]);
  });

  it("refuse les champs non affectés, doublons et étapes de biométrie multiples", () => {
    const issues = validateFormSteps(fields, [
      { id: "demographics", label: "Démographie", order: 0, kind: "fields", fieldIds: ["name", "name"] },
      { id: "bio-a", label: "Biométrie", order: 1, kind: "biometrics", fieldIds: [] },
      { id: "bio-b", label: "Biométrie bis", order: 2, kind: "biometrics", fieldIds: [] },
    ]);
    expect(issues).toEqual(expect.arrayContaining(["field-assignment", "field-unassigned", "biometrics-duplicate"]));
  });

  it("restaure les brouillons sans affecter la file finale de synchronisation", async () => {
    const store = new OfflineStore(new MemoryStore());
    const state: OfflineState = {
      session: { tenantId: "tenant-1", accessToken: "token", agentName: "Awa" }, projects: [], queue: [],
      drafts: [{ id: "draft-1", tenantId: "tenant-1", projectId: "project-1", formId: "form-1", currentStepId: "socio", data: { name: "Awa" }, attachments: [], updatedAt: 10 }],
    };
    await store.write(state);
    await expect(store.read()).resolves.toEqual(state);
  });
});
