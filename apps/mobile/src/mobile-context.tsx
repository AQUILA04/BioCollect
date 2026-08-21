import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import type { AgentSession, BiometricAttachment, OfflineState, QueuedSubmission } from "./domain";
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
  createSimulatedAttachment(projectId: string, type: BiometricAttachment["type"], reference?: string): BiometricAttachment;
};

const MobileContext = createContext<MobileContextValue | null>(null);
const store = new OfflineStore(AsyncStorage);
const apiBaseUrl = (Constants.expoConfig?.extra?.biocollectApiUrl as string | undefined) ?? "";

function makeId(prefix: string) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

export function MobileProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [state, setState] = useState<OfflineState>(emptyOfflineState());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void store.read().then(value => { setState(value); setReady(true); }); }, []);

  async function persist(next: OfflineState) { setState(next); await store.write(next); }
  async function activate(session: AgentSession) { setError(null); await persist(activateAgent(state, session)); }
  async function signOut() { setError(null); await persist({ ...state, session: null }); }
  function service() {
    if (!apiBaseUrl) throw new Error(t("mobile.apiUrlRequired"));
    return new SyncService(store, createHttpSyncTransport(apiBaseUrl));
  }
  async function pull() { try { setError(null); const next = await service().pull(state); setState(next); } catch (cause) { setError(cause instanceof Error ? cause.message : t("mobile.downloadFailed")); } }
  async function push() { try { setError(null); const next = await service().push(state); setState(next); } catch (cause) { setError(cause instanceof Error ? cause.message : t("mobile.synchronizationFailed")); } }
  async function queueSubmission(input: Omit<QueuedSubmission, "id" | "queuedAt" | "retryCount" | "status" | "tenantId">) {
    const next = enqueueSubmission(state, input, makeId("submission"), Date.now());
    await persist(next);
  }
  function createSimulatedAttachment(projectId: string, type: BiometricAttachment["type"], reference?: string): BiometricAttachment {
    const id = makeId(type);
    const objectName = reference ? `${type}_${reference}_${id}.bin` : `${id}.bin`;
    return { id, type, minioPath: `minio://biocollect/${state.session?.tenantId ?? "unassigned"}/${projectId}/${objectName}`, capturedAt: Date.now(), ...(type === "fingerprint" ? { fingerType: reference, nfiqScore: 1 } : {}) };
  }

  const value = useMemo(() => ({ ready, state, error, activate, signOut, pull, push, queueSubmission, createSimulatedAttachment }), [ready, state, error]);
  return <MobileContext.Provider value={value}>{children}</MobileContext.Provider>;
}

export function useMobile() {
  const context = useContext(MobileContext);
  if (!context) throw new Error("useMobile doit être utilisé sous MobileProvider.");
  return context;
}
