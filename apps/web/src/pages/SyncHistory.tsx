import { PageHeader } from "@/components/PageHeader";
import { SyncHistoryTable } from "@/components/SyncHistoryTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { useI18n } from "@/contexts/I18nContext";
import { useTenant } from "@/contexts/TenantContext";
import { trpc } from "@/lib/trpc";
import { RefreshCcw, UsersRound, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";

type SyncScope = "mine" | "team";

function SyncHistoryContent() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { tenantId, tenants } = useTenant();
  const membership = tenants.find(entry => entry.tenant.id === tenantId)?.membership;
  const isInvestigator = membership?.role === "Enquêteur" && user?.role !== "Superadmin";
  const [scope, setScope] = useState<SyncScope>("team");
  const sessions = trpc.biocollect.syncSessions.list.useQuery(
    { tenantId: tenantId ?? "", ...(isInvestigator ? { scope } : {}) },
    { enabled: Boolean(tenantId) },
  );
  const summary = useMemo(() => (sessions.data ?? []).reduce((acc, session) => ({
    selected: acc.selected + session.selectedForSync,
    received: acc.received + session.receivedCount,
    failed: acc.failed + session.failedCount,
  }), { selected: 0, received: 0, failed: 0 }), [sessions.data]);

  return <>
    <PageHeader
      eyebrow={t("syncHistory.eyebrow")}
      title={t("syncHistory.title")}
      description={t("syncHistory.description")}
      action={
        <Button variant="outline" onClick={() => void sessions.refetch()}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          {t("projects.refreshSyncHistory")}
        </Button>
      }
    />
    {!tenantId ? (
      <Card className="bio-panel">
        <CardContent className="py-12 text-center text-sm text-slate-500">{t("syncHistory.selectWorkspace")}</CardContent>
      </Card>
    ) : null}
    {tenantId && isInvestigator ? (
      <div className="mb-6 flex flex-wrap gap-2">
        <Button variant={scope === "mine" ? "default" : "outline"} onClick={() => setScope("mine")}>
          <UserRound className="mr-2 h-4 w-4" />
          {t("syncHistory.scopeMine")}
        </Button>
        <Button variant={scope === "team" ? "default" : "outline"} onClick={() => setScope("team")}>
          <UsersRound className="mr-2 h-4 w-4" />
          {t("syncHistory.scopeTeam")}
        </Button>
      </div>
    ) : null}
    {tenantId ? (
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="bio-panel"><CardContent className="p-4"><p className="text-xs font-medium text-slate-500">{t("syncHistory.summarySelected")}</p><p className="mt-1 text-2xl font-semibold">{summary.selected}</p></CardContent></Card>
        <Card className="bio-panel"><CardContent className="p-4"><p className="text-xs font-medium text-slate-500">{t("syncHistory.summaryReceived")}</p><p className="mt-1 text-2xl font-semibold text-blue-700">{summary.received}</p></CardContent></Card>
        <Card className="bio-panel"><CardContent className="p-4"><p className="text-xs font-medium text-slate-500">{t("syncHistory.summaryFailed")}</p><p className="mt-1 text-2xl font-semibold text-rose-700">{summary.failed}</p></CardContent></Card>
      </div>
    ) : null}
    {tenantId ? (
      <Card className="bio-panel">
        <CardContent className="p-6">
          <p className="mb-4 text-sm leading-6 text-slate-500">{isInvestigator ? t("syncHistory.reconcileHelp") : t("projects.syncHistoryDescription")}</p>
          <SyncHistoryTable sessions={sessions.data} isLoading={sessions.isLoading} showProject />
        </CardContent>
      </Card>
    ) : null}
  </>;
}

export default function SyncHistory() {
  return <DashboardLayout><SyncHistoryContent /></DashboardLayout>;
}
