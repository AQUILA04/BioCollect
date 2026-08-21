import type { AgentSession, OfflineState, QueuedSubmission } from "./domain";

export function activateAgent(state: OfflineState, session: AgentSession): OfflineState {
  return { ...state, session };
}

export function enqueueSubmission(
  state: OfflineState,
  input: Omit<QueuedSubmission, "id" | "queuedAt" | "retryCount" | "status" | "tenantId">,
  id: string,
  now: number,
): OfflineState {
  if (!state.session) throw new Error("Session agent requise.");
  return {
    ...state,
    queue: [...state.queue, { ...input, id, tenantId: state.session.tenantId, status: "DRAFT", queuedAt: now, retryCount: 0 }],
  };
}
