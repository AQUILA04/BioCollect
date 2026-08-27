import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/contexts/I18nContext";
import { useTenant } from "@/contexts/TenantContext";
import { trpc } from "@/lib/trpc";
import { Loader2, Mail, Trash2, UserPlus, Users } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

const TENANT_ROLES = ["Administrateur", "Superviseur", "Enquêteur"] as const;
type TenantRole = (typeof TENANT_ROLES)[number];

function MembersContent() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { tenantId, tenants } = useTenant();
  const utils = trpc.useUtils();
  const membership = tenants.find(entry => entry.tenant.id === tenantId)?.membership;
  const canManage =
    user?.role === "Superadmin" ||
    user?.role === "Administrateur" ||
    membership?.role === "Administrateur";

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<TenantRole>("Enquêteur");

  const members = trpc.biocollect.members.list.useQuery(
    { tenantId: tenantId ?? "" },
    { enabled: Boolean(tenantId) }
  );

  const invalidate = () =>
    utils.biocollect.members.list.invalidate({ tenantId: tenantId ?? "" });

  const invite = trpc.biocollect.members.invite.useMutation({
    onSuccess: result => {
      void invalidate();
      setEmail("");
      setName("");
      setRole("Enquêteur");
      toast.success(
        result.emailSent ? t("members.inviteSent") : t("members.inviteAdded")
      );
    },
    onError: error => toast.error(error.message),
  });

  const updateRole = trpc.biocollect.members.updateRole.useMutation({
    onSuccess: () => {
      void invalidate();
      toast.success(t("members.roleUpdated"));
    },
    onError: error => toast.error(error.message),
  });

  const remove = trpc.biocollect.members.remove.useMutation({
    onSuccess: () => {
      void invalidate();
      toast.success(t("members.removed"));
    },
    onError: error => toast.error(error.message),
  });

  const resend = trpc.biocollect.members.resendInvite.useMutation({
    onSuccess: () => toast.success(t("members.resendSent")),
    onError: error => toast.error(error.message),
  });

  function onInvite(event: FormEvent) {
    event.preventDefault();
    if (!tenantId) return toast.error(t("members.selectTenant"));
    if (!email.trim()) return toast.error(t("members.emailRequired"));
    invite.mutate({
      tenantId,
      email: email.trim(),
      role,
      name: name.trim() || undefined,
    });
  }

  function roleLabel(value: string) {
    if (value === "Administrateur") return t("members.roleAdmin");
    if (value === "Superviseur") return t("members.roleSupervisor");
    return t("members.roleInvestigator");
  }

  return (
    <>
      <PageHeader
        eyebrow={t("members.eyebrow")}
        title={t("members.title")}
        description={t("members.description")}
      />

      {!tenantId ? (
        <Card className="bio-panel">
          <CardContent className="py-12 text-center text-sm text-slate-500">
            {t("members.selectTenant")}
          </CardContent>
        </Card>
      ) : null}

      {canManage && tenantId ? (
        <Card className="bio-panel mb-6">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-sky-700" />
              <h2 className="text-sm font-semibold text-slate-950">{t("members.inviteTitle")}</h2>
            </div>
            <form className="grid gap-4 md:grid-cols-[1.2fr_1fr_0.9fr_auto]" onSubmit={onInvite}>
              <div className="grid gap-2">
                <Label htmlFor="member-email">{t("members.email")}</Label>
                <Input
                  id="member-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder={t("members.emailPlaceholder")}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="member-name">{t("members.name")}</Label>
                <Input
                  id="member-name"
                  value={name}
                  onChange={event => setName(event.target.value)}
                  placeholder={t("members.namePlaceholder")}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t("members.role")}</Label>
                <Select value={role} onValueChange={value => setRole(value as TenantRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TENANT_ROLES.map(option => (
                      <SelectItem key={option} value={option}>
                        {roleLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={invite.isPending} className="w-full md:w-auto">
                  {invite.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                  {t("members.sendInvite")}
                </Button>
              </div>
            </form>
            <p className="mt-3 text-xs leading-5 text-slate-500">{t("members.inviteHelp")}</p>
          </CardContent>
        </Card>
      ) : null}

      {members.isLoading && tenantId ? (
        <div className="flex h-48 items-center justify-center text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {t("common.loading")}
        </div>
      ) : null}

      {members.isError ? (
        <Card className="border-rose-200">
          <CardContent className="py-10 text-center text-sm text-rose-700">
            {t("members.loadFailed")}: {members.error.message}
          </CardContent>
        </Card>
      ) : null}

      {!members.isLoading && members.data?.length === 0 && tenantId ? (
        <Card className="bio-panel border-dashed">
          <CardContent className="flex min-h-56 flex-col items-center justify-center text-center">
            <Users className="mb-4 h-8 w-8 text-sky-700" />
            <h2 className="font-bold">{t("members.empty")}</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{t("members.emptyDescription")}</p>
          </CardContent>
        </Card>
      ) : null}

      {members.data && members.data.length > 0 ? (
        <Card className="bio-panel overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t("members.colMember")}</th>
                    <th className="px-4 py-3 font-medium">{t("members.role")}</th>
                    <th className="px-4 py-3 font-medium text-right">{t("members.colActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.data.map(member => (
                    <tr key={member.membershipId} className="align-middle">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-950">{member.name || t("members.unnamed")}</p>
                        <p className="text-xs text-slate-500">{member.email || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        {canManage ? (
                          <Select
                            value={member.role}
                            onValueChange={value => {
                              if (!tenantId || value === member.role) return;
                              updateRole.mutate({
                                tenantId,
                                userId: member.userId,
                                role: value as TenantRole,
                              });
                            }}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TENANT_ROLES.map(option => (
                                <SelectItem key={option} value={option}>
                                  {roleLabel(option)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary">{roleLabel(member.role)}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {canManage ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={resend.isPending}
                              onClick={() => {
                                if (!tenantId) return;
                                resend.mutate({ tenantId, userId: member.userId });
                              }}
                            >
                              {t("members.resend")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-rose-200 text-rose-700 hover:bg-rose-50"
                              disabled={remove.isPending || member.userId === user?.id}
                              onClick={() => {
                                if (!tenantId) return;
                                if (!window.confirm(t("members.removeConfirm"))) return;
                                remove.mutate({ tenantId, userId: member.userId });
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="block text-right text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}

export default function Members() {
  return (
    <DashboardLayout>
      <MembersContent />
    </DashboardLayout>
  );
}
