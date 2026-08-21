export type FieldCondition = {
  fieldId: string;
  operator: "equals" | "notEquals" | "isFilled";
  value?: string;
};

export type BioCollectFormField = {
  id: string;
  label: string;
  type: "text" | "date" | "multiple choice" | "photo";
  required: boolean;
  options?: string[];
  condition?: FieldCondition;
};

export { fieldsForStep, normalizeFormSteps, validateFormSteps, type BioCollectFormStep, type FormStepKind } from "./steps";

export function isFieldVisible(field: BioCollectFormField, values: Record<string, unknown>): boolean {
  if (!field.condition) return true;
  const value = values[field.condition.fieldId];
  if (field.condition.operator === "isFilled") return value !== undefined && value !== null && value !== "";
  if (field.condition.operator === "equals") return value === field.condition.value;
  return value !== field.condition.value;
}
