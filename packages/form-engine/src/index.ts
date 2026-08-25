export type FieldCondition = {
  fieldId: string;
  operator: "equals" | "notEquals" | "isFilled";
  value?: string;
};

export type TextValidationFormat = "none" | "alphabetic" | "numeric" | "alphanumeric" | "regex";

export type BioCollectGpsValue = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  capturedAt: string;
  mapsUrl: string;
};

export type BioCollectFieldValidation = {
  minLength?: number;
  maxLength?: number;
  textFormat?: TextValidationFormat;
  regex?: string;
  allowedPrefixes?: string[];
  minDate?: string;
  maxDate?: string;
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
  type: "text" | "email" | "phone" | "date" | "multiple choice" | "sex" | "gps" | "hierarchical selection" | "photo";
  required: boolean;
  validation?: BioCollectFieldValidation;
  sexUseOther?: boolean;
  options?: Array<string | BioCollectSelectionOption>;
  referenceDataSetId?: string;
  selectionTypeId?: string;
  hierarchicalDefinition?: BioCollectHierarchicalSelectionDefinition;
  condition?: FieldCondition;
};

export type FieldValidationIssue =
  | "required"
  | "minLength"
  | "maxLength"
  | "textFormat"
  | "regex"
  | "email"
  | "phone"
  | "prefix"
  | "date"
  | "minDate"
  | "maxDate"
  | "choice"
  | "gps";

export type FieldValidationResult = { valid: true } | { valid: false; issue: FieldValidationIssue };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseGpsValue(value: unknown): BioCollectGpsValue | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value) as Partial<BioCollectGpsValue>;
    if (typeof parsed.latitude !== "number" || !Number.isFinite(parsed.latitude) || parsed.latitude < -90 || parsed.latitude > 90) return null;
    if (typeof parsed.longitude !== "number" || !Number.isFinite(parsed.longitude) || parsed.longitude < -180 || parsed.longitude > 180) return null;
    if (typeof parsed.capturedAt !== "string" || typeof parsed.mapsUrl !== "string") return null;
    return { latitude: parsed.latitude, longitude: parsed.longitude, accuracy: typeof parsed.accuracy === "number" && Number.isFinite(parsed.accuracy) ? parsed.accuracy : undefined, capturedAt: parsed.capturedAt, mapsUrl: parsed.mapsUrl };
  } catch {
    return null;
  }
}

export function serializeGpsValue(value: Omit<BioCollectGpsValue, "mapsUrl"> & { mapsUrl?: string }) {
  const mapsUrl = value.mapsUrl ?? `https://www.google.com/maps?q=${value.latitude},${value.longitude}`;
  return JSON.stringify({ ...value, mapsUrl });
}

function isEmpty(value: unknown) {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

function normalizedOptions(options: BioCollectFormField["options"]) {
  return (options ?? []).map(option => typeof option === "string" ? option : option.value);
}

function isIsoDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Validates a user-defined regex without running it against input. */
export function isValidRegex(regex: string | undefined) {
  if (!regex) return false;
  try { new RegExp(regex); return true; } catch { return false; }
}

/**
 * Validates one serializable field definition. Empty optional values are valid by design;
 * requiredness is applied by the caller so conditional fields can be skipped safely.
 */
export function validateFieldValue(field: BioCollectFormField, value: unknown, options: { required?: boolean } = {}): FieldValidationResult {
  const required = options.required ?? field.required;
  if (isEmpty(value)) return required ? { valid: false, issue: "required" } : { valid: true };
  const text = String(value);
  const validation = field.validation;

  if (field.type === "multiple choice" && !normalizedOptions(field.options).includes(text)) return { valid: false, issue: "choice" };
  if (field.type === "sex" && !["MALE", "FEMALE", ...(field.sexUseOther === false ? [] : ["OTHER"])].includes(text)) return { valid: false, issue: "choice" };
  if (field.type === "gps") return parseGpsValue(text) ? { valid: true } : { valid: false, issue: "gps" };
  if (field.type === "date") {
    if (!validation?.minDate && !validation?.maxDate) return { valid: true };
    if (!isIsoDate(text)) return { valid: false, issue: "date" };
    if (validation.minDate && text < validation.minDate) return { valid: false, issue: "minDate" };
    if (validation.maxDate && text > validation.maxDate) return { valid: false, issue: "maxDate" };
    return { valid: true };
  }
  if (field.type === "photo" || field.type === "hierarchical selection") return { valid: true };

  if (validation?.minLength !== undefined && text.length < validation.minLength) return { valid: false, issue: "minLength" };
  if (validation?.maxLength !== undefined && text.length > validation.maxLength) return { valid: false, issue: "maxLength" };

  if (field.type === "email" && !EMAIL_PATTERN.test(text)) return { valid: false, issue: "email" };
  if (field.type === "phone") {
    if (!/^\d+$/.test(text)) return { valid: false, issue: "phone" };
    const prefixes = validation?.allowedPrefixes?.filter(Boolean) ?? [];
    if (prefixes.length && !prefixes.some(prefix => text.startsWith(prefix))) return { valid: false, issue: "prefix" };
    return { valid: true };
  }

  const format = validation?.textFormat ?? "none";
  if (format === "alphabetic" && !/^[A-Za-zÀ-ÖØ-öø-ÿ]+$/.test(text)) return { valid: false, issue: "textFormat" };
  if (format === "numeric" && !/^\d+$/.test(text)) return { valid: false, issue: "textFormat" };
  if (format === "alphanumeric" && !/^[A-Za-zÀ-ÖØ-öø-ÿ0-9]+$/.test(text)) return { valid: false, issue: "textFormat" };
  if (format === "regex") {
    if (!isValidRegex(validation?.regex)) return { valid: false, issue: "regex" };
    if (!new RegExp(validation!.regex!, "u").test(text)) return { valid: false, issue: "regex" };
  }
  return { valid: true };
}

export function isFieldValueValid(field: BioCollectFormField, value: unknown, options?: { required?: boolean }) {
  return validateFieldValue(field, value, options).valid;
}

export { fieldsForStep, normalizeFormSteps, validateFormSteps, type BioCollectFormStep, type FormStepKind } from "./steps";

export function isFieldVisible(field: BioCollectFormField, values: Record<string, unknown>): boolean {
  if (!field.condition) return true;
  const value = values[field.condition.fieldId];
  if (field.condition.operator === "isFilled") return value !== undefined && value !== null && value !== "";
  if (field.condition.operator === "equals") return value === field.condition.value;
  return value !== field.condition.value;
}
