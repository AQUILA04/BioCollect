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

export const CAMPAIGN_STATUSES = ["PLANNED", "ACTIVE", "COMPLETED"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const TEAM_MEMBER_ROLES = ["OPERATOR", "SUPPORT"] as const;
export type TeamMemberRole = (typeof TEAM_MEMBER_ROLES)[number];

export const SYNC_SESSION_STATUSES = ["IN_PROGRESS", "COMPLETED", "FAILED"] as const;
export type SyncSessionStatus = (typeof SYNC_SESSION_STATUSES)[number];

export const FORM_FIELD_TYPES = ["text", "email", "phone", "date", "multiple choice", "sex", "gps", "hierarchical selection", "photo"] as const;
export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

export const TEXT_VALIDATION_FORMATS = ["none", "alphabetic", "numeric", "alphanumeric", "regex"] as const;
export type TextValidationFormat = (typeof TEXT_VALIDATION_FORMATS)[number];

/**
 * Validation carried in the published JSON schema and enforced on the mobile client.
 * `maxLength` and date bounds are intentionally optional: an omitted maximum means unlimited.
 */
export type FieldValidation = {
  minLength?: number;
  maxLength?: number;
  textFormat?: TextValidationFormat;
  regex?: string;
  allowedPrefixes?: string[];
  minDate?: string;
  maxDate?: string;
};

/** Defaults scoped to an entity and copied into each newly created Phone field. */
export type PhoneValidationDefaults = {
  minLength?: number;
  maxLength?: number;
  allowedPrefixes?: string[];
};

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
  currentVersion?: number;
  sourceFileName?: string | null;
  sourceFileKey?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};
export type ReferenceDataSetVersion = { id: string; referenceDataSetId: string; tenantId: string; version: number; type: string; name: string; options: SelectionOption[]; sourceFileName?: string | null; sourceRowCount: number; createdBy: number; createdAt?: Date };

export type SelectionTypeLevel = { id: string; label: string; order: number };
export type SelectionTypeNode = { id: string; levelId: string; value: string; label: string; parentNodeId?: string | null };
export type HierarchicalSelectionDefinition = { selectionTypeId: string; key: string; name: string; levels: SelectionTypeLevel[]; nodes: SelectionTypeNode[] };
export type HierarchicalSelectionAnswer = { selectionTypeId: string; selections: Record<string, string>; leafNodeId: string };
export type SelectionType = { id: string; tenantId: string; key: string; name: string; levels: SelectionTypeLevel[]; nodes?: SelectionTypeNode[]; createdAt?: Date; updatedAt?: Date };

export type FormField = {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  validation?: FieldValidation;
  /** Special Sex fields always use the canonical values MALE/FEMALE and optionally OTHER. */
  sexUseOther?: boolean;
  /** Legacy string arrays remain valid and are normalized at persistence or display time. */
  options?: LegacyOrSelectionOption[];
  referenceDataSetId?: string;
  referenceDataSetVersion?: number;
  selectionTypeId?: string;
  hierarchicalDefinition?: HierarchicalSelectionDefinition;
  condition?: {
    fieldId: string;
    operator: "equals" | "notEquals" | "isFilled";
    value?: string;
  };
};

export type FormBuilderDraft = {
  id: string;
  projectId: string;
  name: string;
  fields: FormField[];
  steps?: FormStep[] | null;
  createdBy: number;
  updatedBy: number;
  createdAt?: Date;
  updatedAt?: Date;
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
