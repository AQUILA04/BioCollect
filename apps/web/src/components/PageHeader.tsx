import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import type { ReactNode } from "react";
import { useLocation } from "wouter";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  backTo?: string;
};

export function PageHeader({ eyebrow, title, description, action, backTo }: PageHeaderProps) {
  const [, setLocation] = useLocation();
  const { t } = useI18n();
  return (
    <header className="mb-8 flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {backTo ? (
          <Button variant="ghost" size="sm" className="-ml-2 mb-3 text-slate-500" onClick={() => setLocation(backTo)}>
            <ChevronLeft className="mr-1 h-4 w-4" /> {t("common.back")}
          </Button>
        ) : null}
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
