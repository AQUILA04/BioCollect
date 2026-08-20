import { describe, expect, it } from "vitest";
import { assertTransition, canTransition, statusForConflictAction } from "./workflow";

describe("workflow des dossiers BioCollect", () => {
  it("autorise le pipeline DRAFT → SYNCED → PROCESSING → VALIDATED", () => {
    expect(canTransition("DRAFT", "SYNCED")).toBe(true);
    expect(canTransition("SYNCED", "PROCESSING")).toBe(true);
    expect(canTransition("PROCESSING", "VALIDATED")).toBe(true);
    expect(() => assertTransition("PROCESSING", "VALIDATED")).not.toThrow();
  });

  it("interdit les transitions qui contournent le pipeline", () => {
    expect(canTransition("DRAFT", "VALIDATED")).toBe(false);
    expect(() => assertTransition("DRAFT", "VALIDATED")).toThrow("Transition de statut interdite");
    expect(() => assertTransition("VALIDATED", "REJECTED")).toThrow("Transition de statut interdite");
  });

  it("associe exactement les actions de résolution aux statuts attendus", () => {
    expect(statusForConflictAction("Rejeter")).toBe("REJECTED");
    expect(statusForConflictAction("Fusionner")).toBe("REJECTED");
    expect(statusForConflictAction("Forcer Faux Positif")).toBe("VALIDATED");
  });
});
