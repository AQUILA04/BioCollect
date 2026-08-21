import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTenant } from "@/contexts/TenantContext";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { Building2, ChevronLeft, CirclePlus, Crown, Loader2, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

type SpaceEntry = { tenant: { id: string; name: string; slug: string; isActive: boolean }; membership: { role: string } | null };

function SpaceCard({ entry, selected, onSelect }: { entry: SpaceEntry; selected: boolean; onSelect: () => void }) {
  return <button onClick={onSelect} className={`rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${selected ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`}><div className="flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-blue-700"><Building2 className="h-5 w-5" /></span>{entry.membership?.role ? <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{entry.membership.role}</span> : <Crown className="h-4 w-4 text-amber-500" />}</div><p className="mt-5 font-semibold">{entry.tenant.name}</p><p className="mt-1 text-sm text-slate-500">/{entry.tenant.slug}</p></button>;
}

export default function Spaces() {
  const { user, loading, isAuthenticated } = useAuth();
  const { t } = useI18n();
  const { tenantId, tenants, loading: tenantsLoading, setTenantId, refresh } = useTenant();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminName, setAdminName] = useState("");
  const isSuperadmin = user?.role === "Superadmin";
  const allTenants = trpc.biocollect.tenants.all.useQuery(undefined, { enabled: isSuperadmin });
  const entries: SpaceEntry[] = isSuperadmin ? (allTenants.data ?? []).map(tenant => ({ tenant, membership: null })) : tenants;
  const active = useMemo(() => entries.find(entry => entry.tenant.id === tenantId)?.tenant ?? null, [entries, tenantId]);
  useEffect(() => { setAdminName(active?.name ?? ""); }, [active?.id, active?.name]);
  const create = trpc.biocollect.tenants.create.useMutation({ onSuccess: async tenant => { await refresh(); setTenantId(tenant.id); setLocation("/app"); toast.success(t("spaces.ready")); }, onError: error => toast.error(error.message) });
  const createBySuperadmin = trpc.biocollect.tenants.createBySuperadmin.useMutation({ onSuccess: async () => { await utils.biocollect.tenants.all.invalidate(); await refresh(); setName(""); setSlug(""); toast.success(t("spaces.created")); }, onError: error => toast.error(error.message) });
  const selectTenant = trpc.biocollect.tenants.select.useMutation({ onSuccess: tenant => { if (tenant) { setTenantId(tenant.id); setLocation("/app"); } }, onError: error => toast.error(error.message) });
  const updateTenant = trpc.biocollect.tenants.updateBySuperadmin.useMutation({ onSuccess: async () => { await utils.biocollect.tenants.all.invalidate(); toast.success(t("spaces.updated")); }, onError: error => toast.error(error.message) });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (isSuperadmin) createBySuperadmin.mutate({ name, slug: slug || undefined }); else create.mutate({ name, slug: slug || undefined }); }
  function selectSpace(id: string) { selectTenant.mutate({ tenantId: id }); }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300"><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t("spaces.preparingAccess")}</div>;
  if (!isAuthenticated) return <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6"><Card className="w-full max-w-md"><CardContent className="p-8 text-center"><Building2 className="mx-auto h-9 w-9 text-blue-700" /><h1 className="mt-5 text-2xl font-semibold">{t("spaces.accessTitle")}</h1><p className="mt-3 text-sm leading-6 text-slate-600">{t("spaces.accessDescription")}</p><Button className="mt-7 w-full" onClick={startLogin}>{t("auth.signIn")}</Button><Link href="/" className="mt-5 inline-flex text-sm text-blue-700">{t("spaces.backToLanding")}</Link></CardContent></Card></div>;

  return <div className="min-h-screen bg-slate-50 text-slate-950"><header className="border-b bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5"><Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-500"><ChevronLeft className="h-4 w-4" />BioCollect</Link><span className="inline-flex items-center gap-2 text-sm font-medium"><ShieldCheck className="h-4 w-4 text-emerald-600" />{isSuperadmin ? "Superadmin" : t("spaces.personalSpace")}</span></div></header><main className="mx-auto max-w-6xl px-6 py-12"><p className="text-xs font-semibold uppercase tracking-[.16em] text-blue-700">{t("spaces.eyebrow")}</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">{isSuperadmin ? t("spaces.adminTitle") : t("spaces.chooseTitle")}</h1><p className="mt-3 max-w-2xl leading-7 text-slate-600">{t("spaces.description")}</p><div className="mt-10 grid gap-8 lg:grid-cols-[1.35fr_.65fr]"><section><h2 className="text-sm font-semibold">{isSuperadmin ? t("spaces.allSpaces") : t("spaces.yourSpaces")}</h2>{tenantsLoading ? <div className="mt-4 flex h-36 items-center text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("spaces.loading")}</div> : <div className="mt-4 grid gap-3 sm:grid-cols-2">{entries.map(entry => <SpaceCard key={entry.tenant.id} entry={entry} selected={tenantId === entry.tenant.id} onSelect={() => selectSpace(entry.tenant.id)} />)}{!isSuperadmin && entries.length === 0 ? <Card className="border-dashed sm:col-span-2"><CardContent className="p-8 text-center text-sm text-slate-500">{t("spaces.noSpaces")}</CardContent></Card> : null}</div>}</section><aside><Card className="border-blue-100"><CardContent className="p-6"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><CirclePlus className="h-5 w-5" /></span><h2 className="mt-5 font-semibold">{isSuperadmin ? t("spaces.createTenant") : t("spaces.createSpace")}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{isSuperadmin ? t("spaces.createTenantDescription") : t("spaces.createSpaceDescription")}</p><form className="mt-5 grid gap-4" onSubmit={submit}><div className="grid gap-2"><Label htmlFor="tenant-name">{t("spaces.entityName")}</Label><Input id="tenant-name" value={name} onChange={event => setName(event.target.value)} minLength={3} required /></div><div className="grid gap-2"><Label htmlFor="tenant-slug">{t("spaces.identifier")} <span className="font-normal text-slate-400">({t("spaces.optional")})</span></Label><Input id="tenant-slug" value={slug} onChange={event => setSlug(event.target.value)} /></div><Button type="submit" disabled={create.isPending || createBySuperadmin.isPending}>{create.isPending || createBySuperadmin.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{t("spaces.create")}</Button></form></CardContent></Card>{isSuperadmin && active ? <Card className="mt-4"><CardContent className="p-5"><p className="text-sm font-semibold">{t("spaces.activeAdministration")}</p><div className="mt-4 grid gap-2"><Label htmlFor="admin-tenant-name">{t("spaces.name")}</Label><Input id="admin-tenant-name" value={adminName} onChange={event => setAdminName(event.target.value)} /></div><div className="mt-4 grid gap-2"><Button disabled={updateTenant.isPending || adminName.trim().length < 3} onClick={() => updateTenant.mutate({ tenantId: active.id, name: adminName.trim(), isActive: active.isActive })}>{t("spaces.saveName")}</Button><Button variant="outline" disabled={updateTenant.isPending} onClick={() => updateTenant.mutate({ tenantId: active.id, name: active.name, isActive: !active.isActive })}>{active.isActive ? t("spaces.deactivate") : t("spaces.activate")}</Button></div></CardContent></Card> : null}</aside></div></main></div>;
}
