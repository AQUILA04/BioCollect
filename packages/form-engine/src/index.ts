export type FieldCondition = {
  fieldId: string;
  operator: "equals" | "notEquals" | "isFilled";
  value?: string;
};

export type BioCollectSelectionOption = {
  value: string;
  label: string;
};

export type BioCollectSelectionTypeLevel = { id: string; label: string; order: number };
export type BioCollectSelectionTypeNode = { id: string; levelId: string; value: string; label: string; parentNodeId?: string | null };
export type BioCollectHierarchicalSelectionDefinition = { selectionTypeId: string; key: string; name: string; levels: BioCollectSelectionTypeLevel[]; nodes: BioCollectSelectionTypeNode[] };

export type BioCollectFormField = {
  id: string;
  label: string;
  type: "text" | "date" | "multiple choice" | "hierarchical selection" | "photo";
  required: boolean;
  options?: Array<string | BioCollectSelectionOption>;
  referenceDataSetId?: string;
  selectionTypeId?: string;
  hierarchicalDefinition?: BioCollectHierarchicalSelectionDefinition;
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
