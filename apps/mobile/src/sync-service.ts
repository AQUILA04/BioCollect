import type { OfflineState, ProjectSnapshot, QueuedSubmission } from "./domain";
import { OfflineStore } from "./offline-store";

export type PullResult = { projects: ProjectSnapshot[]; serverTime: number };
export type PushResult = { syncSessionId?: string | null; acceptedSubmissionIds: string[]; rejected: Array<{ id: string; reason: string }> };

export interface SyncTransport {
  pull(input: { tenantId: string; accessToken: string }): Promise<PullResult>;
  push(input: { tenantId: string; accessToken: string; campaignId?: string; totalOffline: number; selectedForSync: number; submissions: QueuedSubmission[] }): Promise<PushResult>;
}

export class SyncService {
  constructor(private readonly store: OfflineStore, private readonly transport: SyncTransport) {}

  async pull(state: OfflineState): Promise<OfflineState> {
    if (!state.session) throw new Error("Session agent requise pour télécharger les formulaires.");
    const result = await this.transport.pull({ tenantId: state.session.tenantId, accessToken: state.session.accessToken });
    const next = { ...state, projects: result.projects.map(project => ({ ...project, downloadedAt: result.serverTime })) };
    await this.store.write(next);
    return next;
  }

  async push(state: OfflineState): Promise<OfflineState> {
    if (!state.session) throw new Error("Session agent requise pour synchroniser les dossiers.");
    if (!state.queue.length) return state;
    const groups = new Map<string, QueuedSubmission[]>();
    state.queue.forEach(submission => {
      const key = submission.campaignId ?? "__legacy__";
      groups.set(key, [...(groups.get(key) ?? []), submission]);
    });
    const results = await Promise.all([...groups.entries()].map(([campaignId, submissions]) => this.transport.push({
      tenantId: state.session!.tenantId,
      accessToken: state.session!.accessToken,
      campaignId: campaignId === "__legacy__" ? undefined : campaignId,
      totalOffline: state.queue.length,
      selectedForSync: submissions.length,
      submissions,
    })));
    const accepted = new Set(results.flatMap(result => result.acceptedSubmissionIds));
    const rejected = new Set(results.flatMap(result => result.rejected.map(item => item.id)));
    const next = {
      ...state,
      queue: state.queue
        .filter(item => !accepted.has(item.id))
        .map(item => rejected.has(item.id) ? { ...item, retryCount: item.retryCount + 1 } : item),
    };
    await this.store.write(next);
    return next;
  }
}

export function createHttpSyncTransport(baseUrl: string): SyncTransport {
  async function request<T>(path: string, accessToken: string, body?: unknown): Promise<T> {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new Error(`Synchronisation indisponible (${response.status}).`);
    return response.json() as Promise<T>;
  }
  return {
    pull: ({ tenantId, accessToken }) => request<PullResult>(`/api/mobile/sync/pull?tenantId=${encodeURIComponent(tenantId)}`, accessToken),
    push: ({ tenantId, accessToken, campaignId, totalOffline, selectedForSync, submissions }) => request<PushResult>("/api/mobile/sync/push", accessToken, { tenantId, campaignId, totalOffline, selectedForSync, submissions }),
  };
}
