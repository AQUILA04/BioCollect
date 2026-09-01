import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/contexts/I18nContext";
import { trpc } from "@/lib/trpc";
import { RefreshCcw } from "lucide-react";
import { SyncHistoryTable } from "./SyncHistoryTable";

type SyncHistoryPanelProps = {
  tenantId: string;
  projectId: string;
  projectName: string;
  onClose: () => void;
};

export function SyncHistoryPanel({ tenantId, projectId, projectName, onClose }: SyncHistoryPanelProps) {
  const { t } = useI18n();
  const sessions = trpc.biocollect.syncSessions.list.useQuery({ tenantId, projectId }, { enabled: Boolean(tenantId && projectId) });

  return (
    <Card className="bio-panel mb-6">
      <CardContent className="p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="bio-kicker flex items-center gap-2">
              <span className="bio-eyebrow-dot" aria-hidden />
              {t("projects.syncHistoryEyebrow")}
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">{projectName}</h2>
            <p className="mt-1 text-sm text-slate-500">{t("projects.syncHistoryDescription")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => void sessions.refetch()}>
              <RefreshCcw className="h-4 w-4" />
              <span className="sr-only">{t("projects.refreshSyncHistory")}</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>{t("projects.close")}</Button>
          </div>
        </div>
        <SyncHistoryTable sessions={sessions.data} isLoading={sessions.isLoading} />
      </CardContent>
    </Card>
  );
}
