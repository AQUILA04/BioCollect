import { describe, expect, it } from "vitest";
import { adjacentStep, canQueueSubmission, isStepValid } from "./step-workflow";

const steps = [
  { id: "demographics", label: "Démographie", order: 0, kind: "fields" as const, fieldIds: ["name"] },
  { id: "socio", label: "Socio-économie", order: 1, kind: "fields" as const, fieldIds: ["income"] },
  { id: "bio", label: "Biométrie", order: 2, kind: "biometrics" as const, fieldIds: [] },
];
const fields = [{ id: "name", label: "Nom", type: "text" as const, required: true }, { id: "income", label: "Revenu", type: "text" as const, required: true }];

describe("workflow de collecte par étapes", () => {
  it("bloque Suivant tant que les informations requises de l’étape active sont absentes", () => {
    expect(isStepValid({ step: steps[0], fields, answers: {}, requiredFingers: ["RIGHT_THUMB"], capturedFingers: new Set() })).toBe(false);
    expect(isStepValid({ step: steps[0], fields, answers: { name: "Awa" }, requiredFingers: ["RIGHT_THUMB"], capturedFingers: new Set() })).toBe(true);
    expect(canQueueSubmission(steps, "demographics", true)).toBe(false);
  });

  it("navigue dans les deux sens et n’autorise la file finale qu’après la dernière étape valide", () => {
    expect(adjacentStep(steps, "demographics", 1)?.id).toBe("socio");
    expect(adjacentStep(steps, "socio", -1)?.id).toBe("demographics");
    expect(isStepValid({ step: steps[2], fields, answers: { name: "Awa", income: "12" }, requiredFingers: ["RIGHT_THUMB"], capturedFingers: new Set() })).toBe(false);
    expect(canQueueSubmission(steps, "bio", false)).toBe(false);
    expect(canQueueSubmission(steps, "bio", true)).toBe(true);
  });
});
