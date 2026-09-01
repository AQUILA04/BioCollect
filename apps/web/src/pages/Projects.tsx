import { PageHeader } from "@/components/PageHeader";
import { FingerPicker } from "@/components/FingerPicker";
import { SyncHistoryPanel } from "@/components/SyncHistoryPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTenant } from "@/contexts/TenantContext";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { FolderPlus, History, Loader2, Settings2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";
import { formatDate } from "../lib/biocollect-ui";

function ProjectsContent() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { tenantId, tenants } = useTenant();
  const activeMembership = tenants.find(entry => entry.tenant.id === tenantId)?.membership;
  const canManage = user?.role === "Superadmin" || user?.role === "Administrateur" || activeMembership?.role === "Administrateur";
  const canViewSyncHistory = canManage || user?.role === "Superviseur" || activeMembership?.role === "Superviseur";
  const utils = trpc.useUtils();
  const projects = trpc.biocollect.projects.list.useQuery({ tenantId: tenantId ?? "" }, { enabled: Boolean(tenantId) });
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [requiredFingers, setRequiredFingers] = useState<string[]>(["RIGHT_THUMB", "LEFT_THUMB"]);
  const [nfiqThreshold, setNfiqThreshold] = useState(3);
  const [matchingThreshold, setMatchingThreshold] = useState(85);
  const [configurationProjectId, setConfigurationProjectId] = useState<string | null>(null);
  const [syncHistoryProjectId, setSyncHistoryProjectId] = useState<string | null>(null);
  const configuration = trpc.biocollect.projects.configuration.useQuery({ tenantId: tenantId ?? "", projectId: configurationProjectId ?? "" }, { enabled: Boolean(tenantId && configurationProjectId) });
  const createProject = trpc.biocollect.projects.create.useMutation({
    onSuccess: () => { void utils.biocollect.projects.list.invalidate(); setShowCreate(false); setName(""); setDescription(""); toast.success(t("projects.projectCreated")); },
    onError: error => toast.error(error.message),
  });
  const updateConfiguration = trpc.biocollect.projects.updateConfiguration.useMutation({
    onSuccess: () => { void utils.biocollect.projects.configuration.invalidate(); toast.success(t("projects.configurationUpdated")); },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (configuration.data?.config) {
      setRequiredFingers(configuration.data.config.requiredFingers as string[]);
      setNfiqThreshold(configuration.data.config.nfiqThreshold);
      setMatchingThreshold(configuration.data.config.matchingThreshold);
    }
  }, [configuration.data]);

  function openConfiguration(projectId: string) {
    setSyncHistoryProjectId(null);
    setConfigurationProjectId(projectId);
  }

  function openSyncHistory(projectId: string) {
    setConfigurationProjectId(null);
    setSyncHistoryProjectId(projectId);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenantId) return toast.error(t("projects.selectTenant"));
    createProject.mutate({ tenantId, name, description: description || undefined, requiredFingers, nfiqThreshold, matchingThreshold });
  }

  const syncHistoryProject = projects.data?.find(project => project.id === syncHistoryProjectId);

  return <>
    <PageHeader
      eyebrow={t("projects.eyebrow")}
      title={t("projects.title")}
      description={t("projects.description")}
      action={canManage ? <Button onClick={() => setShowCreate(true)}><FolderPlus className="mr-2 h-4 w-4" />{t("projects.newProject")}</Button> : undefined}
    />
    {!tenantId ? <Card className="bio-panel"><CardContent className="py-12 text-center text-sm text-slate-500">{t("projects.selectWorkspace")}</CardContent></Card> : null}
    {showCreate ? (
      <Card className="bio-panel mb-6">
        <CardContent className="p-6">
          <form onSubmit={submit} className="grid gap-5">
            <div>
              <p className="bio-kicker flex items-center gap-2"><span className="bio-eyebrow-dot" aria-hidden />{t("projects.initialization")}</p>
              <h2 className="mt-2 text-xl font-bold text-slate-950">{t("projects.newProject")}</h2>
            </div>
            <div className="grid gap-2"><Label htmlFor="project-name">{t("projects.projectName")}</Label><Input id="project-name" value={name} onChange={event => setName(event.target.value)} minLength={3} required /></div>
            <div className="grid gap-2"><Label htmlFor="project-description">{t("projects.projectDescription")}</Label><Textarea id="project-description" value={description} onChange={event => setDescription(event.target.value)} /></div>
            <FingerPicker value={requiredFingers} onChange={setRequiredFingers} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2"><Label htmlFor="nfiq">{t("projects.nfiqThreshold")}</Label><Input id="nfiq" type="number" min="1" max="5" value={nfiqThreshold} onChange={event => setNfiqThreshold(Number(event.target.value))} /></div>
              <div className="grid gap-2"><Label htmlFor="matching">{t("projects.matchingThreshold")}</Label><Input id="matching" type="number" min="1" max="100" value={matchingThreshold} onChange={event => setMatchingThreshold(Number(event.target.value))} /></div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>{t("common.cancel")}</Button>
              <Button type="submit" disabled={createProject.isPending || !requiredFingers.length}>{createProject.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{t("projects.createProject")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    ) : null}
    {configurationProjectId ? (
      <Card className="bio-panel mb-6">
        <CardContent className="p-6">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <p className="bio-kicker flex items-center gap-2"><span className="bio-eyebrow-dot" aria-hidden />{t("projects.biometricConfiguration")}</p>
              <h2 className="mt-2 text-xl font-bold">{configuration.data?.project.name ?? t("projects.loading")}</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setConfigurationProjectId(null)}>{t("projects.close")}</Button>
          </div>
          {configuration.isLoading ? <div className="text-sm text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />{t("projects.loading")}</div> : null}
          {configuration.data?.config ? (
            <div className="grid gap-5">
              <FingerPicker value={requiredFingers} onChange={setRequiredFingers} disabled={!canManage} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2"><Label htmlFor="edit-nfiq">{t("projects.nfiqThreshold")}</Label><Input id="edit-nfiq" type="number" min="1" max="5" value={nfiqThreshold} disabled={!canManage} onChange={event => setNfiqThreshold(Number(event.target.value))} /></div>
                <div className="grid gap-2"><Label htmlFor="edit-matching">{t("projects.matchingThreshold")}</Label><Input id="edit-matching" type="number" min="1" max="100" value={matchingThreshold} disabled={!canManage} onChange={event => setMatchingThreshold(Number(event.target.value))} /></div>
              </div>
              {canManage && tenantId ? (
                <div className="flex justify-end">
                  <Button onClick={() => updateConfiguration.mutate({ tenantId, projectId: configurationProjectId, requiredFingers, nfiqThreshold, matchingThreshold })} disabled={updateConfiguration.isPending}>{t("projects.save")}</Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    ) : null}
    {syncHistoryProjectId && tenantId && syncHistoryProject ? (
      <SyncHistoryPanel tenantId={tenantId} projectId={syncHistoryProjectId} projectName={syncHistoryProject.name} onClose={() => setSyncHistoryProjectId(null)} />
    ) : null}
    {projects.isLoading && tenantId ? <div className="flex h-48 items-center justify-center text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t("projects.loadingProjects")}</div> : null}
    {projects.isError ? <Card className="bio-panel"><CardContent className="py-10 text-center text-sm text-rose-700">{projects.error.message}</CardContent></Card> : null}
    {projects.data?.length === 0 ? (
      <Card className="bio-panel border-dashed">
        <CardContent className="flex min-h-56 flex-col items-center justify-center text-center">
          <Settings2 className="mb-4 h-8 w-8 text-blue-600" />
          <h2 className="font-semibold">{t("projects.noProjects")}</h2>
          <p className="mt-2 max-w-sm text-sm text-slate-500">{t("projects.noProjectsDescription")}</p>
        </CardContent>
      </Card>
    ) : null}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.data?.map(project => (
        <Card key={project.id} className="bio-panel bio-interactive">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="bio-kicker">{t("projects.collectionProject")}</p>
                <h2 className="mt-2 font-bold text-slate-950">{project.name}</h2>
                <p className="mt-2 min-h-10 text-sm text-slate-500">{project.description || t("projects.noDescription")}</p>
              </div>
              <Badge variant="outline" className={project.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : ""}>{project.isActive ? t("projects.active") : t("projects.inactive")}</Badge>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-xs text-slate-500">{formatDate(project.createdAt)}</span>
              <div className="flex gap-1">
                {canViewSyncHistory ? (
                  <Button size="sm" variant="ghost" className="text-sky-700" onClick={() => openSyncHistory(project.id)}>
                    <History className="mr-1.5 h-4 w-4" />{t("projects.syncHistory")}
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" className="text-blue-700" onClick={() => openConfiguration(project.id)}>{t("projects.configuration")}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </>;
}

export default function Projects() { return <DashboardLayout><ProjectsContent /></DashboardLayout>; }
