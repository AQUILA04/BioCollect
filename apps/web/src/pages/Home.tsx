import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { trpc } from "@/lib/trpc";
import { Activity, AlertTriangle, ArrowRight, CloudCog, FolderKanban, Loader2, ShieldCheck, UsersRound } from "lucide-react";
import { Link } from "wouter";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import DashboardLayout from "../components/DashboardLayout";

function StatCard({ label, value, description, icon: Icon, tone }: { label: string; value: number | undefined; description: string; icon: typeof Activity; tone: "blue" | "amber" | "emerald" }) {
  const tones = { blue: "bg-blue-50 text-blue-700", amber: "bg-amber-50 text-amber-700", emerald: "bg-emerald-50 text-emerald-700" };
  return <Card className="border-slate-200 shadow-sm"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value ?? "—"}</p></div><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></div></div><p className="mt-4 text-xs leading-5 text-slate-500">{description}</p></CardContent></Card>;
}

function FieldAgentPanel() {
  return <>
    <PageHeader eyebrow="Espace Enquêteur" title="Synchronisation mobile" description="La collecte hors ligne, la capture des empreintes et la file de synchronisation sont opérées depuis l’application mobile BioCollect. Ce back-office ne donne pas accès aux données de supervision." />
    <Card className="max-w-2xl"><CardContent className="p-7"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><CloudCog className="h-6 w-6" /></div><h2 className="mt-5 text-lg font-semibold text-slate-950">Pipeline mobile prêt à être connecté</h2><p className="mt-2 text-sm leading-6 text-slate-500">Les opérations Pull et Push sont protégées côté serveur pour le rôle Enquêteur. Chaque soumission impose des chemins MinIO, des empreintes obligatoires et le seuil NFIQ configuré par le projet.</p><Badge className="mt-5 bg-blue-50 text-blue-700 hover:bg-blue-50">Enquêteur</Badge></CardContent></Card>
  </>;
}

function DashboardContent() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const dashboard = trpc.biocollect.dashboard.useQuery({ tenantId: tenantId ?? "" }, { enabled: Boolean(tenantId) && user?.role !== "Enquêteur" });
  if (user?.role === "Enquêteur") return <FieldAgentPanel />;
  if (!tenantId) return <FieldAgentPanel />;
  return <>
    <PageHeader eyebrow="Centre de supervision" title="Vue d’ensemble" description="Suivez la collecte, les synchronisations et les dossiers nécessitant une décision biométrique." action={<Link href="/projects"><Button><FolderKanban className="mr-2 h-4 w-4" />Gérer les projets</Button></Link>} />
    {dashboard.isLoading ? <div className="flex h-72 items-center justify-center text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Chargement des indicateurs…</div> : null}
    {dashboard.isError ? <Card><CardContent className="py-12 text-center text-sm text-rose-700">{dashboard.error.message}</CardContent></Card> : null}
    {dashboard.data ? <div className="grid gap-5"><div className="grid gap-4 md:grid-cols-3"><StatCard label="Total enrolled" value={dashboard.data.summary.totalEnrolled} description="Dossiers passés au statut VALIDATED." icon={UsersRound} tone="emerald" /><StatCard label="Pending duplicates" value={dashboard.data.summary.pendingDuplicates} description="Dossiers au statut SUSPECTED_DUPLICATE." icon={AlertTriangle} tone="amber" /><StatCard label="Today’s synchronizations" value={dashboard.data.summary.todaySynchronizations} description="Dossiers synchronisés depuis minuit." icon={Activity} tone="blue" /></div><div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]"><Card><CardContent className="p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-slate-950">Évolution des synchronisations</p><p className="mt-1 text-sm text-slate-500">Sept derniers jours</p></div><Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">SYNCED</Badge></div><div className="mt-6 h-[250px]" aria-label="Graphique des synchronisations"><ResponsiveContainer width="100%" height="100%"><AreaChart data={dashboard.data.evolution} margin={{ top: 10, right: 6, left: -18, bottom: 0 }}><defs><linearGradient id="syncGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.22} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} /><Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 6px 24px rgba(15, 23, 42, 0.08)" }} /><Area type="monotone" dataKey="submissions" stroke="#2563eb" strokeWidth={2.5} fill="url(#syncGradient)" /></AreaChart></ResponsiveContainer></div></CardContent></Card><Card className="bg-slate-950 text-white"><CardContent className="flex h-full flex-col p-6"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><ShieldCheck className="h-5 w-5 text-emerald-300" /></div><p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Contrôle biométrique</p><h2 className="mt-2 text-xl font-semibold">Répondez aux conflits critiques</h2><p className="mt-3 text-sm leading-6 text-slate-300">La résolution compare strictement le nouveau dossier, le score de similarité et l’identité existante.</p><Link href="/conflicts" className="mt-auto pt-6"><Button className="w-full bg-white text-slate-950 hover:bg-slate-100">Ouvrir les conflits <ArrowRight className="ml-2 h-4 w-4" /></Button></Link></CardContent></Card></div></div> : null}
  </>;
}

export default function Home() { return <DashboardLayout><DashboardContent /></DashboardLayout>; }
