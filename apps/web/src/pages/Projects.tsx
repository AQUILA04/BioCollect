import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { FolderPlus, Loader2, Settings2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";
import { formatDate } from "../lib/biocollect-ui";

const FINGERS = ["RIGHT_THUMB", "LEFT_THUMB", "RIGHT_INDEX", "LEFT_INDEX"];

function ProjectsContent() {
  const { user } = useAuth();
  const { tenantId, tenants } = useTenant();
  const activeMembership = tenants.find(entry => entry.tenant.id === tenantId)?.membership;
  const canManage = user?.role === "Superadmin" || user?.role === "Administrateur" || activeMembership?.role === "Administrateur";
  const utils = trpc.useUtils();
  const projects = trpc.biocollect.projects.list.useQuery({ tenantId: tenantId ?? "" }, { enabled: Boolean(tenantId) });
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [requiredFingers, setRequiredFingers] = useState<string[]>(["RIGHT_THUMB", "LEFT_THUMB"]);
  const [nfiqThreshold, setNfiqThreshold] = useState(3);
  const [matchingThreshold, setMatchingThreshold] = useState(85);
  const [configurationProjectId, setConfigurationProjectId] = useState<string | null>(null);
  const configuration = trpc.biocollect.projects.configuration.useQuery({ tenantId: tenantId ?? "", projectId: configurationProjectId ?? "" }, { enabled: Boolean(tenantId && configurationProjectId) });
  const createProject = trpc.biocollect.projects.create.useMutation({
    onSuccess: () => { void utils.biocollect.projects.list.invalidate(); setShowCreate(false); setName(""); setDescription(""); toast.success("Projet créé dans l’espace actif."); },
    onError: error => toast.error(error.message),
  });
  const updateConfiguration = trpc.biocollect.projects.updateConfiguration.useMutation({
    onSuccess: () => { void utils.biocollect.projects.configuration.invalidate(); toast.success("Configuration biométrique mise à jour."); },
    onError: error => toast.error(error.message),
  });

  useEffect(() => { if (configuration.data?.config) { setRequiredFingers(configuration.data.config.requiredFingers as string[]); setNfiqThreshold(configuration.data.config.nfiqThreshold); setMatchingThreshold(configuration.data.config.matchingThreshold); } }, [configuration.data]);
  function toggleFinger(finger: string) { setRequiredFingers(current => current.includes(finger) ? current.filter(item => item !== finger) : [...current, finger]); }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!tenantId) return toast.error("Sélectionnez un espace d’entité."); createProject.mutate({ tenantId, name, description: description || undefined, requiredFingers, nfiqThreshold, matchingThreshold }); }

  return <>
    <PageHeader eyebrow="Espace d’entité" title="Projets biométriques" description="Les projets, formulaires et dossiers visibles ici restent isolés dans l’espace actif." action={canManage ? <Button onClick={() => setShowCreate(true)}><FolderPlus className="mr-2 h-4 w-4" />Nouveau projet</Button> : undefined} />
    {!tenantId ? <Card><CardContent className="py-12 text-center text-sm text-slate-500">Sélectionnez ou créez un espace pour gérer ses projets.</CardContent></Card> : null}
    {showCreate ? <Card className="mb-6 border-blue-200"><CardContent className="pt-6"><form onSubmit={submit} className="grid gap-5"><div className="grid gap-2"><Label htmlFor="project-name">Nom du projet</Label><Input id="project-name" value={name} onChange={event => setName(event.target.value)} minLength={3} required /></div><div className="grid gap-2"><Label htmlFor="project-description">Description</Label><Textarea id="project-description" value={description} onChange={event => setDescription(event.target.value)} /></div><fieldset className="grid gap-3"><legend className="text-sm font-medium">Doigts obligatoires</legend><div className="flex flex-wrap gap-2">{FINGERS.map(finger => <Button key={finger} type="button" variant={requiredFingers.includes(finger) ? "default" : "outline"} size="sm" onClick={() => toggleFinger(finger)}>{finger}</Button>)}</div></fieldset><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="nfiq">Seuil NFIQ</Label><Input id="nfiq" type="number" min="1" max="5" value={nfiqThreshold} onChange={event => setNfiqThreshold(Number(event.target.value))} /></div><div className="grid gap-2"><Label htmlFor="matching">Seuil de matching</Label><Input id="matching" type="number" min="1" max="100" value={matchingThreshold} onChange={event => setMatchingThreshold(Number(event.target.value))} /></div></div><div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button><Button type="submit" disabled={createProject.isPending || !requiredFingers.length}>{createProject.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Créer le projet</Button></div></form></CardContent></Card> : null}
    {configurationProjectId ? <Card className="mb-6"><CardContent className="pt-6"><div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Configuration biométrique</p><h2 className="mt-1 text-lg font-semibold">{configuration.data?.project.name ?? "Chargement…"}</h2></div><Button variant="ghost" size="sm" onClick={() => setConfigurationProjectId(null)}>Fermer</Button></div>{configuration.isLoading ? <div className="text-sm text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Chargement…</div> : null}{configuration.data?.config ? <div className="grid gap-5"><div className="flex flex-wrap gap-2">{FINGERS.map(finger => <Button key={finger} type="button" variant={requiredFingers.includes(finger) ? "default" : "outline"} size="sm" disabled={!canManage} onClick={() => toggleFinger(finger)}>{finger}</Button>)}</div><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="edit-nfiq">Seuil NFIQ</Label><Input id="edit-nfiq" type="number" min="1" max="5" value={nfiqThreshold} disabled={!canManage} onChange={event => setNfiqThreshold(Number(event.target.value))} /></div><div className="grid gap-2"><Label htmlFor="edit-matching">Seuil de matching</Label><Input id="edit-matching" type="number" min="1" max="100" value={matchingThreshold} disabled={!canManage} onChange={event => setMatchingThreshold(Number(event.target.value))} /></div></div>{canManage && tenantId ? <div className="flex justify-end"><Button onClick={() => updateConfiguration.mutate({ tenantId, projectId: configurationProjectId, requiredFingers, nfiqThreshold, matchingThreshold })} disabled={updateConfiguration.isPending}>Enregistrer</Button></div> : null}</div> : null}</CardContent></Card> : null}
    {projects.isLoading && tenantId ? <div className="flex h-48 items-center justify-center text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Chargement des projets…</div> : null}
    {projects.isError ? <Card><CardContent className="py-10 text-center text-sm text-rose-700">{projects.error.message}</CardContent></Card> : null}
    {projects.data?.length === 0 ? <Card className="border-dashed"><CardContent className="flex min-h-56 flex-col items-center justify-center text-center"><Settings2 className="mb-4 h-8 w-8 text-blue-600" /><h2 className="font-semibold">Aucun projet dans cet espace</h2><p className="mt-2 max-w-sm text-sm text-slate-500">Un Administrateur d’espace peut créer le premier projet.</p></CardContent></Card> : null}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{projects.data?.map(project => <Card key={project.id}><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-950">{project.name}</h2><p className="mt-2 min-h-10 text-sm text-slate-500">{project.description || "Sans description"}</p></div><Badge variant="outline" className={project.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : ""}>{project.isActive ? "Actif" : "Inactif"}</Badge></div><div className="mt-5 flex items-center justify-between border-t pt-4"><span className="text-xs text-slate-500">{formatDate(project.createdAt)}</span><Button size="sm" variant="ghost" onClick={() => setConfigurationProjectId(project.id)}>Configuration</Button></div></CardContent></Card>)}</div>
  </>;
}

export default function Projects() { return <DashboardLayout><ProjectsContent /></DashboardLayout>; }
