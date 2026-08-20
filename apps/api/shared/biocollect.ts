export const USER_ROLES = ["Administrateur", "Superviseur", "Enquêteur"] as const;
export type UserRole = (typeof USER_ROLES)[number];

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

export type FormField = {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
  condition?: {
    fieldId: string;
    operator: "equals" | "notEquals" | "isFilled";
    value?: string;
  };
};

export type BiometricAttachmentInput = {
  fingerType: string;
  minioPath: string;
  nfiqScore: number;
};
