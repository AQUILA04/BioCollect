export const USER_ROLES = ["Superadmin", "Administrateur", "Superviseur", "Enquêteur"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const TENANT_ROLES = ["Administrateur", "Superviseur", "Enquêteur"] as const;
export type TenantRole = (typeof TENANT_ROLES)[number];

export const SUBMISSION_STATUSES = [
  "DRAFT",
  "SYNCED",
  "PROCESSING",
  "VALIDATED",
  "SUSPECTED_DUPLICATE",
  "REJECTED",
] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export const CONFLICT_ACTIONS = ["Rejeter", "Fusionner", "Forcer Faux Positif"] as const;
export type ConflictAction = (typeof CONFLICT_ACTIONS)[number];

export const FORM_FIELD_TYPES = ["text", "date", "multiple choice", "photo"] as const;
export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

export type SelectionOption = {
  value: string;
  label: string;
};

export type LegacyOrSelectionOption = string | SelectionOption;

export type ReferenceDataSet = {
  id: string;
  tenantId: string;
  type: string;
  name: string;
  options: SelectionOption[];
  sourceFileName?: string | null;
  sourceFileKey?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type FormField = {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  /** Legacy string arrays remain valid and are normalized at persistence or display time. */
  options?: LegacyOrSelectionOption[];
  referenceDataSetId?: string;
  condition?: {
    fieldId: string;
    operator: "equals" | "notEquals" | "isFilled";
    value?: string;
  };
};

export const FORM_STEP_KINDS = ["fields", "biometrics"] as const;
export type FormStepKind = (typeof FORM_STEP_KINDS)[number];
export type FormStep = {
  id: string;
  label: string;
  order: number;
  kind: FormStepKind;
  fieldIds: string[];
};

export type BiometricAttachmentInput = {
  fingerType: string;
  minioPath: string;
  nfiqScore: number;
};
