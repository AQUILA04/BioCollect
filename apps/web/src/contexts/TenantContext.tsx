import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type TenantEntry = { tenant: { id: string; name: string; slug: string; isActive: boolean }; membership: { role: "Administrateur" | "Superviseur" | "Enquêteur" } | null };
type TenantContextValue = { tenantId: string | null; tenants: TenantEntry[]; loading: boolean; setTenantId: (tenantId: string) => void; refresh: () => Promise<unknown> };

const TenantContext = createContext<TenantContextValue | null>(null);
const STORAGE_KEY = "biocollect-active-tenant";

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const tenantQuery = trpc.biocollect.tenants.mine.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const [tenantId, setTenantIdState] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const tenants = (tenantQuery.data ?? []) as TenantEntry[];

  useEffect(() => {
    if (!isAuthenticated) { setTenantIdState(null); return; }
    if (tenantId && tenants.some(entry => entry.tenant.id === tenantId)) return;
    if (tenants[0]?.tenant.id) setTenantIdState(tenants[0].tenant.id);
  }, [isAuthenticated, tenantId, tenants]);

  function setTenantId(value: string) {
    localStorage.setItem(STORAGE_KEY, value);
    setTenantIdState(value);
  }

  const value = useMemo(() => ({ tenantId, tenants, loading: tenantQuery.isLoading, setTenantId, refresh: tenantQuery.refetch }), [tenantId, tenants, tenantQuery.isLoading, tenantQuery.refetch]);
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) throw new Error("useTenant must be used inside TenantProvider");
  return context;
}
