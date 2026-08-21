import type { BioCollectFormField } from "./index";

export type FormStepKind = "fields" | "biometrics";

export type BioCollectFormStep = {
  id: string;
  label: string;
  order: number;
  kind: FormStepKind;
  fieldIds: string[];
};

export function normalizeFormSteps(
  formName: string,
  fields: BioCollectFormField[],
  steps?: BioCollectFormStep[] | null,
): BioCollectFormStep[] {
  if (!steps?.length) {
    return [{ id: "legacy", label: formName, order: 0, kind: "fields", fieldIds: fields.map(field => field.id) }];
  }

  return [...steps]
    .sort((left, right) => left.order - right.order)
    .map((step, index) => ({ ...step, order: index, fieldIds: [...step.fieldIds] }));
}

export function validateFormSteps(fields: BioCollectFormField[], steps: BioCollectFormStep[]): string[] {
  const issues: string[] = [];
  const fieldIds = new Set(fields.map(field => field.id));
  const seenStepIds = new Set<string>();
  const assignedFieldIds = new Set<string>();
  let biometricSteps = 0;

  steps.forEach((step, index) => {
    if (!step.id || seenStepIds.has(step.id)) issues.push("step-id");
    seenStepIds.add(step.id);
    if (!step.label.trim()) issues.push("step-label");
    if (step.order !== index) issues.push("step-order");
    if (step.kind === "biometrics") biometricSteps += 1;
    if (step.kind === "fields" && !step.fieldIds.length) issues.push("step-empty");
    step.fieldIds.forEach(fieldId => {
      if (!fieldIds.has(fieldId) || assignedFieldIds.has(fieldId)) issues.push("field-assignment");
      assignedFieldIds.add(fieldId);
    });
  });

  if (biometricSteps > 1) issues.push("biometrics-duplicate");
  if (assignedFieldIds.size !== fields.length) issues.push("field-unassigned");
  return issues.filter((issue, index) => issues.indexOf(issue) === index);
}

export function fieldsForStep(fields: BioCollectFormField[], step: BioCollectFormStep): BioCollectFormField[] {
  const order = new Map(step.fieldIds.map((fieldId, index) => [fieldId, index]));
  return fields.filter(field => order.has(field.id)).sort((left, right) => order.get(left.id)! - order.get(right.id)!);
}
