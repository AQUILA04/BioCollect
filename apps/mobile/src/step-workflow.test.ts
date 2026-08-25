import { describe, expect, it } from "vitest";
import { adjacentStep, canQueueSubmission, isStepValid } from "./step-workflow";

const steps = [
  { id: "demographics", label: "Démographie", order: 0, kind: "fields" as const, fieldIds: ["name"] },
  { id: "socio", label: "Socio-économie", order: 1, kind: "fields" as const, fieldIds: ["income"] },
  { id: "bio", label: "Biométrie", order: 2, kind: "biometrics" as const, fieldIds: [] },
];
const fields = [{ id: "name", label: "Nom", type: "text" as const, required: true }, { id: "income", label: "Revenu", type: "text" as const, required: true }];

const validationStep = { id: "validation", label: "Contrôles", order: 0, kind: "fields" as const, fieldIds: ["email", "phone", "identifier"] };
const validationFields = [
  { id: "email", label: "Email", type: "email" as const, required: true },
  { id: "phone", label: "Téléphone", type: "phone" as const, required: true, validation: { minLength: 8, maxLength: 10, allowedPrefixes: ["228"] } },
  { id: "identifier", label: "Identifiant", type: "text" as const, required: false, validation: { textFormat: "alphanumeric" as const, minLength: 4, maxLength: 8 } },
];
const sexStep = { id: "sex", label: "Sexe", order: 0, kind: "fields" as const, fieldIds: ["sex"] };
const sexFields = [{ id: "sex", label: "Sexe", type: "sex" as const, required: true, sexUseOther: false }];

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

  it("refuse OTHER lorsqu’un champ Sexe est configuré pour ne gérer que deux valeurs", () => {
    const base = { step: sexStep, fields: sexFields, requiredFingers: [], capturedFingers: new Set<string>() };
    expect(isStepValid({ ...base, answers: { sex: "OTHER" } })).toBe(false);
    expect(isStepValid({ ...base, answers: { sex: "MALE" } })).toBe(true);
    expect(isStepValid({ ...base, answers: { sex: "FEMALE" } })).toBe(true);
  });

  it("applique les formats Email, Téléphone et Texte avant le passage à l’étape suivante", () => {
    const base = { step: validationStep, fields: validationFields, requiredFingers: [], capturedFingers: new Set<string>() };
    expect(isStepValid({ ...base, answers: { email: "invalide", phone: "228123456", identifier: "AB12" } })).toBe(false);
    expect(isStepValid({ ...base, answers: { email: "awa@example.org", phone: "229123456", identifier: "AB12" } })).toBe(false);
    expect(isStepValid({ ...base, answers: { email: "awa@example.org", phone: "228123456", identifier: "A-12" } })).toBe(false);
    expect(isStepValid({ ...base, answers: { email: "awa@example.org", phone: "228123456", identifier: "AB12" } })).toBe(true);
  });
});
