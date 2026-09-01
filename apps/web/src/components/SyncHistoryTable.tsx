import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/contexts/I18nContext";
import { formatDate } from "@/lib/biocollect-ui";
import { Loader2 } from "lucide-react";

type SyncSessionRow = {
  id: string;
  receivedCount: number;
  selectedForSync: number;
  totalOffline: number;
  failedCount: number;
  deduplicationSuccessCount: number;
  startedAt: Date | string | number;
  projectName: string;
  campaign: { id: string; name: string; projectId: string };
  team: { name: string };
  operator: { id: number; name: string | null; email: string | null };
};

type SyncHistoryTableProps = {
  sessions: SyncSessionRow[] | undefined;
  isLoading: boolean;
  showProject?: boolean;
};

export function SyncHistoryTable({ sessions, isLoading, showProject = false }: SyncHistoryTableProps) {
  const { t } = useI18n();
  const columnCount = showProject ? 6 : 5;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {showProject ? <th className="px-4 py-3 font-medium">{t("syncHistory.project")}</th> : null}
            <th className="px-4 py-3 font-medium">{t("projects.syncHistoryCampaign")}</th>
            <th className="px-4 py-3 font-medium">{t("projects.syncHistoryOperator")}</th>
            <th className="px-4 py-3 font-medium">{t("projects.syncHistoryVolumes")}</th>
            <th className="px-4 py-3 font-medium">{t("projects.syncHistoryResult")}</th>
            <th className="px-4 py-3 font-medium">{t("projects.syncHistoryDate")}</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columnCount} className="px-4 py-10 text-center text-slate-500">
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                {t("projects.loadingSyncHistory")}
              </td>
            </tr>
          ) : null}
          {!isLoading && !sessions?.length ? (
            <tr>
              <td colSpan={columnCount} className="px-4 py-10 text-center text-slate-500">{t("projects.noSyncHistory")}</td>
            </tr>
          ) : null}
          {sessions?.map(session => (
            <tr key={session.id} className="border-b border-slate-100 last:border-0">
              {showProject ? (
                <td className="px-4 py-4 font-medium text-slate-800">{session.projectName}</td>
              ) : null}
              <td className="px-4 py-4">
                <p className="font-medium text-slate-800">{session.campaign.name}</p>
                <p className="mt-1 text-xs text-slate-500">{session.team.name}</p>
              </td>
              <td className="px-4 py-4 text-slate-700">
                {session.operator.name || session.operator.email || `#${session.operator.id}`}
              </td>
              <td className="px-4 py-4 text-slate-600">
                {session.receivedCount}/{session.selectedForSync} {t("projects.syncHistoryReceived")}
                <br />
                <span className="text-xs">{session.totalOffline} {t("projects.syncHistoryOffline")}</span>
              </td>
              <td className="px-4 py-4">
                <Badge
                  variant="outline"
                  className={session.failedCount ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}
                >
                  {session.failedCount ? t("projects.syncHistoryFailures", { count: session.failedCount }) : t("projects.syncHistoryNoFailures")}
                </Badge>
                <p className="mt-1 text-xs text-slate-500">
                  {t("projects.syncHistoryDedup", { count: session.deduplicationSuccessCount })}
                </p>
              </td>
              <td className="px-4 py-4 text-xs text-slate-500">{formatDate(session.startedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
