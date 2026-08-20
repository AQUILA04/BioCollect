import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/contexts/TenantContext";
import type { ConflictAction } from "../../../api/shared/biocollect";
import { AlertTriangle, CheckCircle2, GitMerge, Loader2, ShieldAlert, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";
import { asRecord, formatDate, STATUS_CLASS } from "../lib/biocollect-ui";

function DetailList({ value }: { value: unknown }) { const entries = Object.entries(asRecord(value)); return <dl className="grid gap-3">{entries.length ? entries.map(([key, item]) => <div key={key} className="border-b border-slate-100 pb-3"><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{key}</dt><dd className="mt-1 break-words text-sm text-slate-800">{String(item)}</dd></div>) : <p className="text-sm text-slate-500">Aucune donnée démographique.</p>}</dl>; }

function ConflictsContent() {
  const { tenantId } = useTenant();
  const utils = trpc.useUtils();
  const conflicts = trpc.biocollect.conflicts.list.useQuery({ tenantId: tenantId ?? "" }, { enabled: Boolean(tenantId) });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const resolve = trpc.biocollect.conflicts.resolve.useMutation({ onSuccess: () => { void utils.biocollect.conflicts.list.invalidate(); void utils.biocollect.dashboard.invalidate(); setReason(""); toast.success("Décision de conflit enregistrée dans la piste d’audit."); }, onError: error => toast.error(error.message) });
  useEffect(() => { if (!selectedId && conflicts.data?.[0]?.source?.id) setSelectedId(conflicts.data[0].source.id); }, [conflicts.data, selectedId]);
  const selected = useMemo(() => conflicts.data?.find(item => item.source?.id === selectedId) ?? null, [conflicts.data, selectedId]);
  const takeAction = (action: ConflictAction) => { if (!tenantId || !selected?.source || !selected.target) return; resolve.mutate({ tenantId, suspectedSubmissionId: selected.source.id, targetSubmissionId: selected.target.id, action, reason: reason || undefined }); };
  const source = selected?.source;
  const target = selected?.target;
  return <>
    <PageHeader eyebrow="Supervision biométrique" title="Résolution des conflits" description="Comparez le nouveau dossier à l’identité existante, puis validez une décision traçable. Les trois actions proposées déclenchent les transitions de statut réglementaires." />
    <div className="mb-5 flex flex-wrap gap-2">{conflicts.data?.map(item => item.source ? <Button key={item.source.id} size="sm" variant={item.source.id === selectedId ? "default" : "outline"} onClick={() => setSelectedId(item.source!.id)}>Dossier {item.source.id.slice(-6).toUpperCase()}</Button> : null)}</div>
    {conflicts.isLoading ? <div className="flex h-64 items-center justify-center text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Recherche des conflits…</div> : null}
    {conflicts.isError ? <Card className="border-rose-200"><CardContent className="py-10 text-center text-sm text-rose-700">Impossible de charger les conflits : {conflicts.error.message}</CardContent></Card> : null}
    <Card className="overflow-hidden border-slate-300"><CardContent className="p-0"><div className="grid min-h-[480px] divide-y divide-slate-200 lg:grid-cols-[1fr_0.7fr_1fr] lg:divide-x lg:divide-y-0"><section className="p-6"><p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Nouveau dossier</p><h2 className="mt-2 text-lg font-semibold text-slate-950">Sonde</h2>{source ? <><div className="mt-3 flex flex-wrap gap-2"><Badge className={STATUS_CLASS[source.status]}>{source.status}</Badge><span className="text-xs text-slate-500">{formatDate(source.createdAt)}</span></div><div className="mt-6"><DetailList value={source.data} /></div></> : <p className="mt-6 text-sm text-slate-500">Aucun nouveau dossier à examiner.</p>}</section><section className="flex flex-col items-center justify-center bg-slate-50 p-6 text-center"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100"><AlertTriangle className="h-7 w-7 text-rose-700" /></div><p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-500">Similarité biométrique</p><p className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">{selected?.similarityScore ? `${selected.similarityScore}%` : "—"}</p><p className="mt-3 max-w-xs text-sm leading-6 text-slate-500">Le mock biométrique a détecté une correspondance. Vérifiez les données démographiques avant de décider.</p></section><section className="p-6"><p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Dossier existant</p><h2 className="mt-2 text-lg font-semibold text-slate-950">Cible</h2>{target ? <><div className="mt-3 flex flex-wrap gap-2"><Badge className={STATUS_CLASS[target.status]}>{target.status}</Badge><span className="text-xs text-slate-500">{formatDate(target.createdAt)}</span></div><div className="mt-6"><DetailList value={target.data} /></div></> : <p className="mt-6 text-sm text-slate-500">Aucun dossier existant sélectionné.</p>}</section></div><div className="sticky bottom-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div className="grid w-full gap-2 lg:max-w-xl"><Label htmlFor="decision-reason">Motif de décision</Label><Textarea id="decision-reason" value={reason} onChange={event => setReason(event.target.value)} placeholder="Ajoutez un motif pour la piste d’audit" rows={2} /></div><div className="flex flex-wrap gap-2"><Button variant="outline" className="border-rose-300 text-rose-700 hover:bg-rose-50" disabled={!selected || resolve.isPending} onClick={() => takeAction("Rejeter")}><XCircle className="mr-2 h-4 w-4" />Rejeter</Button><Button variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50" disabled={!selected || resolve.isPending} onClick={() => takeAction("Fusionner")}><GitMerge className="mr-2 h-4 w-4" />Fusionner</Button><Button className="bg-emerald-600 hover:bg-emerald-700" disabled={!selected || resolve.isPending} onClick={() => takeAction("Forcer Faux Positif")}>{resolve.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}Forcer Faux Positif</Button></div></div></div></CardContent></Card>
    {!conflicts.isLoading && !conflicts.data?.length ? <div className="mt-5 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><ShieldAlert className="h-5 w-5 shrink-0" />Aucun conflit SUSPECTED_DUPLICATE en attente de résolution.</div> : null}
  </>;
}

export default function Conflicts() { return <DashboardLayout><ConflictsContent /></DashboardLayout>; }
