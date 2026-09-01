import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTenant } from "@/contexts/TenantContext";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/biocollect-ui";
import { Activity, CalendarPlus, CircleCheck, Loader2, PlayCircle, RefreshCcw, UserRoundCog, UsersRound } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";

const CAMPAIGN_STATUS: Record<string, { label: string; className: string }> = {
  PLANNED: { label: "Prévue", className: "border-slate-200 bg-slate-50 text-slate-700" },
  ACTIVE: { label: "Active", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  COMPLETED: { label: "Terminée", className: "border-blue-200 bg-blue-50 text-blue-700" },
};

function dateInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function FieldOperationsContent() {
  const { tenantId } = useTenant();
  const utils = trpc.useUtils();
  const projects = trpc.biocollect.projects.list.useQuery({ tenantId: tenantId ?? "" }, { enabled: Boolean(tenantId) });
  const campaigns = trpc.biocollect.campaigns.list.useQuery({ tenantId: tenantId ?? "" }, { enabled: Boolean(tenantId) });
  const staff = trpc.biocollect.campaigns.staff.useQuery({ tenantId: tenantId ?? "" }, { enabled: Boolean(tenantId) });
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const teams = trpc.biocollect.teams.list.useQuery({ tenantId: tenantId ?? "", campaignId: selectedCampaignId }, { enabled: Boolean(tenantId && selectedCampaignId) });
  const sessions = trpc.biocollect.syncSessions.list.useQuery({ tenantId: tenantId ?? "", campaignId: selectedCampaignId || undefined }, { enabled: Boolean(tenantId) });
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [startDate, setStartDate] = useState(dateInputValue());
  const [endDate, setEndDate] = useState("");
  const [teamName, setTeamName] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [supportOneId, setSupportOneId] = useState("");
  const [supportTwoId, setSupportTwoId] = useState("");

  const selectedCampaign = campaigns.data?.find(campaign => campaign.id === selectedCampaignId);
  const currentSessions = sessions.data ?? [];
  const syncSummary = useMemo(() => currentSessions.reduce((summary, session) => ({
    selected: summary.selected + session.selectedForSync,
    received: summary.received + session.receivedCount,
    failed: summary.failed + session.failedCount,
    deduped: summary.deduped + session.deduplicationSuccessCount,
  }), { selected: 0, received: 0, failed: 0, deduped: 0 }), [currentSessions]);

  const invalidateOperations = async () => {
    await Promise.all([
      utils.biocollect.campaigns.list.invalidate(),
      utils.biocollect.teams.list.invalidate(),
      utils.biocollect.syncSessions.list.invalidate(),
    ]);
  };
  const createCampaign = trpc.biocollect.campaigns.create.useMutation({
    onSuccess: async campaign => { await invalidateOperations(); setShowCampaignForm(false); setCampaignName(""); setCampaignDescription(""); setEndDate(""); setSelectedCampaignId(campaign.campaign.id); toast.success("Campagne créée."); },
    onError: error => toast.error(error.message),
  });
  const updateCampaignStatus = trpc.biocollect.campaigns.updateStatus.useMutation({
    onSuccess: async () => { await invalidateOperations(); toast.success("Statut de campagne mis à jour."); },
    onError: error => toast.error(error.message),
  });
  const createTeam = trpc.biocollect.teams.create.useMutation({
    onSuccess: async () => { await invalidateOperations(); setShowTeamForm(false); setTeamName(""); setOperatorId(""); setSupportOneId(""); setSupportTwoId(""); toast.success("Équipe terrain constituée."); },
    onError: error => toast.error(error.message),
  });

  function submitCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenantId || !projectId) return toast.error("Sélectionnez le projet concerné.");
    createCampaign.mutate({ tenantId, projectId, name: campaignName, description: campaignDescription || undefined, startDate, endDate: endDate || undefined, status: "PLANNED" });
  }
  function submitTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenantId || !selectedCampaignId) return toast.error("Sélectionnez d’abord une campagne.");
    const members = [
      operatorId ? { userId: Number(operatorId), role: "OPERATOR" as const } : null,
      supportOneId ? { userId: Number(supportOneId), role: "SUPPORT" as const } : null,
      supportTwoId ? { userId: Number(supportTwoId), role: "SUPPORT" as const } : null,
    ].filter((member): member is { userId: number; role: "OPERATOR" | "SUPPORT" } => Boolean(member));
    if (members.length < 2 || new Set(members.map(member => member.userId)).size !== members.length) return toast.error("Choisissez un opérateur et au moins un appui distinct.");
    createTeam.mutate({ tenantId, campaignId: selectedCampaignId, name: teamName, members });
  }

  return <>
    <PageHeader eyebrow="Opérations terrain" title="Campagnes et équipes" description="Préparez les sessions terrain, affectez les opérateurs et pilotez les remontées de données." action={<Button onClick={() => setShowCampaignForm(true)}><CalendarPlus className="mr-2 h-4 w-4" />Nouvelle campagne</Button>} />
    {!tenantId ? <Card className="bio-panel"><CardContent className="py-12 text-center text-sm text-slate-500">Sélectionnez un espace d’entité afin de piloter les opérations terrain.</CardContent></Card> : null}
    {showCampaignForm ? <Card className="bio-panel mb-6 border-blue-200"><CardContent className="pt-6"><form onSubmit={submitCampaign} className="grid gap-5"><div className="grid gap-2"><Label htmlFor="campaign-project">Projet</Label><select id="campaign-project" value={projectId} onChange={event => setProjectId(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm" required><option value="">Sélectionner un projet</option>{projects.data?.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div><div className="grid gap-2"><Label htmlFor="campaign-name">Nom de la campagne</Label><Input id="campaign-name" value={campaignName} onChange={event => setCampaignName(event.target.value)} minLength={3} maxLength={160} required /></div><div className="grid gap-2"><Label htmlFor="campaign-description">Objectif ou périmètre</Label><Textarea id="campaign-description" value={campaignDescription} onChange={event => setCampaignDescription(event.target.value)} maxLength={2000} /></div><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="campaign-start">Date de début</Label><Input id="campaign-start" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} required /></div><div className="grid gap-2"><Label htmlFor="campaign-end">Date de fin prévisionnelle</Label><Input id="campaign-end" type="date" value={endDate} onChange={event => setEndDate(event.target.value)} /></div></div><div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setShowCampaignForm(false)}>Annuler</Button><Button type="submit" disabled={createCampaign.isPending}>{createCampaign.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Créer la campagne</Button></div></form></CardContent></Card> : null}

    <section className="mb-8"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Campagnes du projet</h2><p className="text-sm text-slate-500">Chaque campagne peut organiser plusieurs équipes et sessions dans le temps.</p></div><Button variant="outline" size="sm" onClick={() => void campaigns.refetch()}><RefreshCcw className="mr-2 h-4 w-4" />Actualiser</Button></div>{campaigns.isLoading ? <div className="flex h-28 items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Chargement des campagnes…</div> : null}{campaigns.data?.length === 0 ? <Card className="bio-panel border-dashed"><CardContent className="py-10 text-center text-sm text-slate-500">Aucune campagne n’est encore créée. Publiez un formulaire puis créez votre première session terrain.</CardContent></Card> : null}<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{campaigns.data?.map(campaign => { const status = CAMPAIGN_STATUS[campaign.status]; return <Card key={campaign.id} className={`bio-panel bio-interactive ${selectedCampaignId === campaign.id ? "border-blue-400 ring-1 ring-blue-100" : ""}`}><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{campaign.projectName}</p><h3 className="mt-1 font-semibold text-slate-950">{campaign.name}</h3></div><Badge variant="outline" className={status.className}>{status.label}</Badge></div><p className="mt-3 min-h-10 text-sm text-slate-500">{campaign.description || "Aucun objectif renseigné."}</p><div className="mt-4 grid grid-cols-2 gap-3 border-y py-3 text-xs text-slate-600"><span><UsersRound className="mr-1 inline h-3.5 w-3.5" />{campaign.teamCount} équipe(s)</span><span><Activity className="mr-1 inline h-3.5 w-3.5" />{campaign.syncSessionCount} synchronisation(s)</span><span className="col-span-2">Début : {formatDate(campaign.startDate)}</span></div><div className="mt-4 flex flex-wrap justify-between gap-2"><Button size="sm" variant="ghost" onClick={() => setSelectedCampaignId(campaign.id)}>Piloter</Button>{campaign.status === "PLANNED" ? <Button size="sm" onClick={() => tenantId && updateCampaignStatus.mutate({ tenantId, campaignId: campaign.id, status: "ACTIVE" })}><PlayCircle className="mr-1.5 h-4 w-4" />Démarrer</Button> : null}{campaign.status === "ACTIVE" ? <Button size="sm" variant="outline" onClick={() => tenantId && updateCampaignStatus.mutate({ tenantId, campaignId: campaign.id, status: "COMPLETED", endDate: new Date().toISOString().slice(0, 10) })}><CircleCheck className="mr-1.5 h-4 w-4" />Clôturer</Button> : null}</div></CardContent></Card>; })}</div></section>

    {selectedCampaignId ? <section className="space-y-6"><div className="bio-panel rounded-lg border border-blue-100 bg-blue-50/60 p-4"><p className="bio-kicker">Pilotage actif</p><h2 className="mt-1 text-xl font-semibold">{selectedCampaign?.name ?? "Campagne"}</h2><p className="mt-1 text-sm text-slate-600">{selectedCampaign?.projectName} · {CAMPAIGN_STATUS[selectedCampaign?.status ?? "PLANNED"].label}</p></div><div className="grid gap-4 md:grid-cols-4"><Card className="bio-panel"><CardContent className="p-4"><p className="text-xs font-medium text-slate-500">Sélectionnés</p><p className="mt-1 text-2xl font-semibold">{syncSummary.selected}</p></CardContent></Card><Card className="bio-panel"><CardContent className="p-4"><p className="text-xs font-medium text-slate-500">Réceptionnés</p><p className="mt-1 text-2xl font-semibold text-blue-700">{syncSummary.received}</p></CardContent></Card><Card className="bio-panel"><CardContent className="p-4"><p className="text-xs font-medium text-slate-500">En échec</p><p className="mt-1 text-2xl font-semibold text-rose-700">{syncSummary.failed}</p></CardContent></Card><Card className="bio-panel"><CardContent className="p-4"><p className="text-xs font-medium text-slate-500">Déduplications réussies</p><p className="mt-1 text-2xl font-semibold text-emerald-700">{syncSummary.deduped}</p></CardContent></Card></div>
      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]"><Card className="bio-panel"><CardContent className="p-5"><div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold">Équipes terrain</h3><p className="mt-1 text-sm text-slate-500">Un opérateur de saisie et un à deux membres d’appui.</p></div><Button size="sm" onClick={() => setShowTeamForm(true)}><UserRoundCog className="mr-2 h-4 w-4" />Constituer</Button></div>{showTeamForm ? <form onSubmit={submitTeam} className="mt-5 grid gap-4 rounded-lg border bg-slate-50 p-4"><div className="grid gap-2"><Label htmlFor="team-name">Nom de l’équipe</Label><Input id="team-name" value={teamName} onChange={event => setTeamName(event.target.value)} minLength={2} required /></div><div className="grid gap-2"><Label htmlFor="team-operator">Opérateur de saisie</Label><select id="team-operator" value={operatorId} onChange={event => setOperatorId(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm" required><option value="">Sélectionner l’opérateur</option>{staff.data?.map(member => <option key={member.id} value={member.id}>{member.name || member.email || `Enquêteur ${member.id}`}</option>)}</select></div><div className="grid gap-2"><Label htmlFor="team-support-one">Membre d’appui 1</Label><select id="team-support-one" value={supportOneId} onChange={event => setSupportOneId(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm" required><option value="">Sélectionner un membre</option>{staff.data?.map(member => <option key={member.id} value={member.id}>{member.name || member.email || `Enquêteur ${member.id}`}</option>)}</select></div><div className="grid gap-2"><Label htmlFor="team-support-two">Membre d’appui 2 (facultatif)</Label><select id="team-support-two" value={supportTwoId} onChange={event => setSupportTwoId(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">Aucun</option>{staff.data?.map(member => <option key={member.id} value={member.id}>{member.name || member.email || `Enquêteur ${member.id}`}</option>)}</select></div><div className="flex justify-end gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => setShowTeamForm(false)}>Annuler</Button><Button type="submit" size="sm" disabled={createTeam.isPending}>{createTeam.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Créer l’équipe</Button></div></form> : null}<div className="mt-5 space-y-3">{teams.isLoading ? <p className="text-sm text-slate-500">Chargement des équipes…</p> : null}{teams.data?.length === 0 ? <p className="rounded-md border border-dashed p-4 text-sm text-slate-500">Aucune équipe n’est affectée à cette campagne.</p> : null}{teams.data?.map(team => <div key={team.id} className="rounded-lg border p-4"><div className="flex items-center justify-between"><h4 className="font-medium">{team.name}</h4><Badge variant="secondary">{team.members.length} membres</Badge></div><div className="mt-3 space-y-2">{team.members.map(member => <div key={member.id} className="flex items-center justify-between text-sm"><span className="text-slate-700">{member.name || member.email || `Enquêteur ${member.userId}`}</span><span className={member.role === "OPERATOR" ? "font-medium text-blue-700" : "text-slate-500"}>{member.role === "OPERATOR" ? "Opérateur" : "Appui"}</span></div>)}</div></div>)}</div></CardContent></Card>
      <Card className="bio-panel"><CardContent className="p-5"><div className="flex items-start justify-between"><div><h3 className="font-semibold">Sessions de synchronisation</h3><p className="mt-1 text-sm text-slate-500">Traçabilité des remontées par opérateur et équipe.</p></div><Button variant="ghost" size="sm" onClick={() => void sessions.refetch()}><RefreshCcw className="h-4 w-4" /><span className="sr-only">Actualiser</span></Button></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="border-b text-xs uppercase tracking-wide text-slate-500"><tr><th className="pb-3 font-medium">Opérateur / équipe</th><th className="pb-3 font-medium">Volumes</th><th className="pb-3 font-medium">Résultat</th><th className="pb-3 font-medium">Date</th></tr></thead><tbody>{sessions.isLoading ? <tr><td colSpan={4} className="py-8 text-center text-slate-500">Chargement des synchronisations…</td></tr> : null}{currentSessions.length === 0 && !sessions.isLoading ? <tr><td colSpan={4} className="py-8 text-center text-slate-500">Aucune synchronisation enregistrée pour cette campagne.</td></tr> : null}{currentSessions.map(session => <tr key={session.id} className="border-b last:border-0"><td className="py-4"><p className="font-medium text-slate-800">{session.operator.name || session.operator.email || `Opérateur ${session.operator.id}`}</p><p className="mt-1 text-xs text-slate-500">{session.team.name} · {session.team.members.filter(member => member.role === "SUPPORT").map(member => member.name || member.email || `#${member.userId}`).join(", ") || "sans appui renseigné"}</p></td><td className="py-4 text-slate-600">{session.receivedCount}/{session.selectedForSync} reçus<br /><span className="text-xs">{session.totalOffline} en file locale</span></td><td className="py-4"><Badge variant="outline" className={session.failedCount ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>{session.failedCount ? `${session.failedCount} échec(s)` : "Sans échec"}</Badge><p className="mt-1 text-xs text-slate-500">{session.deduplicationSuccessCount} déduplication(s)</p></td><td className="py-4 text-xs text-slate-500">{formatDate(session.startedAt)}</td></tr>)}</tbody></table></div></CardContent></Card></div></section> : null}
  </>;
}

export default function FieldOperations() { return <DashboardLayout><FieldOperationsContent /></DashboardLayout>; }
