import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import React, { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import type { AgentSession, BiometricAttachment, FormDraft, OfflineState, QueuedSubmission } from "./domain";
import { emptyOfflineState } from "./domain";
import { activateAgent, enqueueSubmission } from "./mobile-workflow";
import { OfflineStore } from "./offline-store";
import { createHttpSyncTransport, SyncService } from "./sync-service";
import { useI18n } from "./i18n-context";

type MobileContextValue = {
  ready: boolean;
  state: OfflineState;
  error: string | null;
  activate(session: AgentSession): Promise<void>;
  signOut(): Promise<void>;
  pull(): Promise<void>;
  push(): Promise<void>;
  queueSubmission(input: Omit<QueuedSubmission, "id" | "queuedAt" | "retryCount" | "status" | "tenantId">): Promise<void>;
  finalizeSubmission(input: Omit<QueuedSubmission, "id" | "queuedAt" | "retryCount" | "status" | "tenantId">): Promise<void>;
  saveDraft(input: Omit<FormDraft, "id" | "tenantId" | "updatedAt">): Promise<void>;
  removeDraft(projectId: string, formId: string): Promise<void>;
  createSimulatedAttachment(projectId: string, type: BiometricAttachment["type"], reference?: string): BiometricAttachment;
};

const MobileContext = createContext<MobileContextValue | null>(null);
const defaultStore = new OfflineStore(AsyncStorage);
const apiBaseUrl = (Constants.expoConfig?.extra?.biocollectApiUrl as string | undefined) ?? "";

function makeId(prefix: string) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

export function MobileProvider({ children, offlineStore = defaultStore }: { children: ReactNode; offlineStore?: OfflineStore }) {
  const { t } = useI18n();
  const [state, setState] = useState<OfflineState>(emptyOfflineState());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void offlineStore.read().then(value => { setState(value); setReady(true); }); }, [offlineStore]);

  async function persist(next: OfflineState) { setState(next); await offlineStore.write(next); }
  async function activate(session: AgentSession) { setError(null); await persist(activateAgent(state, session)); }
  async function signOut() { setError(null); await persist({ ...state, session: null }); }
  function service() {
    if (!apiBaseUrl) throw new Error(t("mobile.apiUrlRequired"));
    return new SyncService(offlineStore, createHttpSyncTransport(apiBaseUrl));
  }
  async function pull() { try { setError(null); const next = await service().pull(state); setState(next); } catch (cause) { setError(cause instanceof Error ? cause.message : t("mobile.downloadFailed")); } }
  async function push() { try { setError(null); const next = await service().push(state); setState(next); } catch (cause) { setError(cause instanceof Error ? cause.message : t("mobile.synchronizationFailed")); } }
  async function queueSubmission(input: Omit<QueuedSubmission, "id" | "queuedAt" | "retryCount" | "status" | "tenantId">) {
    const next = enqueueSubmission(state, input, makeId("submission"), Date.now());
    await persist(next);
  }
  async function finalizeSubmission(input: Omit<QueuedSubmission, "id" | "queuedAt" | "retryCount" | "status" | "tenantId">) {
    const queued = enqueueSubmission(state, input, makeId("submission"), Date.now());
    const tenantId = state.session?.tenantId;
    await persist({ ...queued, drafts: queued.drafts.filter(draft => !(draft.tenantId === tenantId && draft.projectId === input.projectId && draft.formId === input.formId)) });
  }
  async function saveDraft(input: Omit<FormDraft, "id" | "tenantId" | "updatedAt">) {
    const tenantId = state.session?.tenantId;
    if (!tenantId) return;
    const existing = state.drafts.find(draft => draft.tenantId === tenantId && draft.projectId === input.projectId && draft.formId === input.formId);
    const draft: FormDraft = { ...input, id: existing?.id ?? makeId("draft"), tenantId, updatedAt: Date.now() };
    await persist({ ...state, drafts: [...state.drafts.filter(item => item.id !== draft.id), draft] });
  }
  async function removeDraft(projectId: string, formId: string) {
    const tenantId = state.session?.tenantId;
    await persist({ ...state, drafts: state.drafts.filter(draft => !(draft.tenantId === tenantId && draft.projectId === projectId && draft.formId === formId)) });
  }
  function createSimulatedAttachment(projectId: string, type: BiometricAttachment["type"], reference?: string): BiometricAttachment {
    const id = makeId(type);
    const objectName = reference ? `${type}_${reference}_${id}.bin` : `${id}.bin`;
    return { id, type, minioPath: `minio://biocollect/${state.session?.tenantId ?? "unassigned"}/${projectId}/${objectName}`, capturedAt: Date.now(), ...(type === "fingerprint" ? { fingerType: reference, nfiqScore: 1 } : {}) };
  }

  const value = useMemo(() => ({ ready, state, error, activate, signOut, pull, push, queueSubmission, finalizeSubmission, saveDraft, removeDraft, createSimulatedAttachment }), [ready, state, error]);
  return <MobileContext.Provider value={value}>{children}</MobileContext.Provider>;
}

export function useMobile() {
  const context = useContext(MobileContext);
  if (!context) throw new Error("useMobile doit être utilisé sous MobileProvider.");
  return context;
}
