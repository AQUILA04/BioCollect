import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const canCreate = user?.role === "Administrateur";
  const utils = trpc.useUtils();
  const projects = trpc.biocollect.projects.list.useQuery();
  const createProject = trpc.biocollect.projects.create.useMutation({
    onSuccess: () => {
      void utils.biocollect.projects.list.invalidate();
      setShowCreate(false);
      setName("");
      setDescription("");
      toast.success("Projet créé et configuration biométrique enregistrée.");
    },
    onError: error => toast.error(error.message),
  });
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [requiredFingers, setRequiredFingers] = useState<string[]>(["RIGHT_THUMB", "LEFT_THUMB"]);
  const [nfiqThreshold, setNfiqThreshold] = useState(3);
  const [matchingThreshold, setMatchingThreshold] = useState(85);
  const [configurationProjectId, setConfigurationProjectId] = useState<string | null>(null);
  const configuration = trpc.biocollect.projects.configuration.useQuery({ projectId: configurationProjectId ?? "" }, { enabled: Boolean(configurationProjectId) });
  const updateConfiguration = trpc.biocollect.projects.updateConfiguration.useMutation({
    onSuccess: () => { void utils.biocollect.projects.configuration.invalidate(); toast.success("Configuration biométrique mise à jour."); },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (configuration.data?.config) {
      setRequiredFingers(configuration.data.config.requiredFingers as string[]);
      setNfiqThreshold(configuration.data.config.nfiqThreshold);
      setMatchingThreshold(configuration.data.config.matchingThreshold);
    }
  }, [configuration.data]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createProject.mutate({ name, description: description || undefined, requiredFingers, nfiqThreshold, matchingThreshold });
  }

  function toggleFinger(finger: string) {
    setRequiredFingers(current => current.includes(finger) ? current.filter(item => item !== finger) : [...current, finger]);
  }

  return (
    <>
      <PageHeader
        eyebrow="Configuration terrain"
        title="Projets biométriques"
        description="Créez les campagnes de collecte et définissez leurs contraintes biométriques avant toute synchronisation terrain."
        action={canCreate ? <Button onClick={() => setShowCreate(true)}><FolderPlus className="mr-2 h-4 w-4" />Nouveau projet</Button> : undefined}
      />
      {showCreate ? (
        <Card className="mb-6 border-blue-200 shadow-sm">
          <CardContent className="pt-6">
            <form onSubmit={submit} className="grid gap-5">
              <div className="grid gap-2"><Label htmlFor="project-name">Nom du projet</Label><Input id="project-name" value={name} onChange={event => setName(event.target.value)} placeholder="Recensement communautaire 2026" minLength={3} required /></div>
              <div className="grid gap-2"><Label htmlFor="project-description">Description</Label><Textarea id="project-description" value={description} onChange={event => setDescription(event.target.value)} placeholder="Objectif et périmètre de la campagne" /></div>
              <fieldset className="grid gap-3"><legend className="text-sm font-medium">Doigts obligatoires</legend><div className="flex flex-wrap gap-2">{FINGERS.map(finger => <Button key={finger} type="button" variant={requiredFingers.includes(finger) ? "default" : "outline"} size="sm" onClick={() => toggleFinger(finger)}>{finger}</Button>)}</div></fieldset>
              <div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="nfiq">Seuil NFIQ</Label><Input id="nfiq" type="number" min="1" max="5" value={nfiqThreshold} onChange={event => setNfiqThreshold(Number(event.target.value))} required /></div><div className="grid gap-2"><Label htmlFor="matching">Seuil de matching</Label><Input id="matching" type="number" min="1" max="100" value={matchingThreshold} onChange={event => setMatchingThreshold(Number(event.target.value))} required /></div></div>
              <div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button><Button type="submit" disabled={createProject.isPending || requiredFingers.length === 0}>{createProject.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Créer le projet</Button></div>
            </form>
          </CardContent>
        </Card>
      ) : null}
      {configurationProjectId ? (
        <Card className="mb-6 border-slate-300 shadow-sm"><CardContent className="pt-6">
          <div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Paramètres biométriques</p><h2 className="mt-1 text-lg font-semibold text-slate-950">{configuration.data?.project.name ?? "Chargement du projet…"}</h2></div><Button variant="ghost" size="sm" onClick={() => setConfigurationProjectId(null)}>Fermer</Button></div>
          {configuration.isLoading ? <div className="flex min-h-28 items-center text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Chargement de la configuration…</div> : null}
          {configuration.isError ? <p className="text-sm text-rose-700">{configuration.error.message}</p> : null}
          {configuration.data?.config ? <div className="grid gap-5"><fieldset className="grid gap-3"><legend className="text-sm font-medium">Doigts obligatoires</legend><div className="flex flex-wrap gap-2">{FINGERS.map(finger => <Button key={finger} type="button" variant={requiredFingers.includes(finger) ? "default" : "outline"} size="sm" disabled={!canCreate} onClick={() => toggleFinger(finger)}>{finger}</Button>)}</div></fieldset><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="edit-nfiq">Seuil NFIQ</Label><Input id="edit-nfiq" type="number" min="1" max="5" disabled={!canCreate} value={nfiqThreshold} onChange={event => setNfiqThreshold(Number(event.target.value))} /></div><div className="grid gap-2"><Label htmlFor="edit-matching">Seuil de matching</Label><Input id="edit-matching" type="number" min="1" max="100" disabled={!canCreate} value={matchingThreshold} onChange={event => setMatchingThreshold(Number(event.target.value))} /></div></div>{canCreate ? <div className="flex justify-end"><Button disabled={updateConfiguration.isPending || requiredFingers.length === 0} onClick={() => updateConfiguration.mutate({ projectId: configurationProjectId, requiredFingers, nfiqThreshold, matchingThreshold })}>{updateConfiguration.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Enregistrer les paramètres</Button></div> : <p className="text-sm text-slate-500">Seul le rôle Administrateur peut modifier ces paramètres.</p>}</div> : null}
        </CardContent></Card>
      ) : null}
      {projects.isLoading ? <div className="flex h-48 items-center justify-center text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Chargement des projets…</div> : null}
      {projects.isError ? <Card><CardContent className="py-10 text-center text-sm text-rose-700">{projects.error.message}</CardContent></Card> : null}
      {projects.data?.length === 0 ? <Card className="border-dashed"><CardContent className="flex min-h-56 flex-col items-center justify-center text-center"><Settings2 className="mb-4 h-8 w-8 text-blue-600" /><h2 className="font-semibold">Aucun projet actif</h2><p className="mt-2 max-w-sm text-sm text-slate-500">Un Administrateur peut créer le premier projet et configurer ses empreintes obligatoires.</p></CardContent></Card> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{projects.data?.map(project => <Card key={project.id} className="transition-shadow hover:shadow-md"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-950">{project.name}</h2><p className="mt-2 min-h-10 text-sm leading-5 text-slate-500">{project.description || "Sans description"}</p></div><Badge variant="outline" className={project.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}>{project.isActive ? "Actif" : "Inactif"}</Badge></div><div className="mt-5 flex items-center justify-between gap-3 border-t pt-4"><span className="text-xs text-slate-500">Créé le {formatDate(project.createdAt)}</span><Button size="sm" variant="ghost" onClick={() => setConfigurationProjectId(project.id)}>Configuration</Button></div></CardContent></Card>)}</div>
    </>
  );
}

export default function Projects() { return <DashboardLayout><ProjectsContent /></DashboardLayout>; }
