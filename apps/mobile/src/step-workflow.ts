import type { BioCollectFormStep } from "@biocollect/form-engine";
import type { FormField } from "./domain";

export function isStepValid(input: { step: BioCollectFormStep; fields: FormField[]; answers: Record<string, string>; requiredFingers: string[]; capturedFingers: Set<string> }) {
  if (input.step.kind === "biometrics") return input.requiredFingers.every(finger => input.capturedFingers.has(finger));
  const byId = new Map(input.fields.map(field => [field.id, field]));
  return input.step.fieldIds.every(fieldId => { const field = byId.get(fieldId); return !field?.required || Boolean(input.answers[fieldId]); });
}

export function adjacentStep(steps: BioCollectFormStep[], currentStepId: string, direction: -1 | 1) {
  const ordered = [...steps].sort((left, right) => left.order - right.order);
  const target = ordered.findIndex(step => step.id === currentStepId) + direction;
  return target >= 0 && target < ordered.length ? ordered[target] : null;
}

export function canQueueSubmission(steps: BioCollectFormStep[], currentStepId: string, currentStepIsValid: boolean) {
  const ordered = [...steps].sort((left, right) => left.order - right.order);
  return currentStepIsValid && ordered.at(-1)?.id === currentStepId;
}
