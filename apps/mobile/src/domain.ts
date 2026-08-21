import type { BioCollectFormStep, BioCollectSelectionOption } from "@biocollect/form-engine";

export type BiometricStatus = "DRAFT" | "SYNCED" | "PROCESSING" | "VALIDATED" | "SUSPECTED_DUPLICATE" | "REJECTED";
export type FieldType = "text" | "date" | "multiple choice" | "photo";

export type FormField = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: Array<string | BioCollectSelectionOption>;
  referenceDataSetId?: string;
};

export type FormDefinition = {
  id: string;
  name: string;
  fields: FormField[];
  steps?: BioCollectFormStep[];
};

export type ProjectSnapshot = {
  projectId: string;
  projectName: string;
  requiredFingers: string[];
  nfiqThreshold: number;
  matchingThreshold: number;
  forms: FormDefinition[];
  downloadedAt: number;
};

export type BiometricAttachment = {
  id: string;
  type: "fingerprint" | "photo";
  minioPath: string;
  capturedAt: number;
  fingerType?: string;
  nfiqScore?: number;
};

export type QueuedSubmission = {
  id: string;
  tenantId: string;
  projectId: string;
  formId: string;
  data: Record<string, string>;
  attachments: BiometricAttachment[];
  status: BiometricStatus;
  queuedAt: number;
  retryCount: number;
};

export type FormDraft = {
  id: string;
  tenantId: string;
  projectId: string;
  formId: string;
  currentStepId: string;
  data: Record<string, string>;
  attachments: BiometricAttachment[];
  updatedAt: number;
};

export type AgentSession = {
  accessToken: string;
  tenantId: string;
  agentName: string;
};

export type OfflineState = {
  session: AgentSession | null;
  projects: ProjectSnapshot[];
  queue: QueuedSubmission[];
  drafts: FormDraft[];
};

export const emptyOfflineState = (): OfflineState => ({ session: null, projects: [], queue: [], drafts: [] });
