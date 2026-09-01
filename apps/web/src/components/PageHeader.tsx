import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="bio-panel mb-8">
      <CardContent className="p-6 lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            {backTo ? (
              <Button variant="ghost" size="sm" className="-ml-2 mb-3 text-slate-500" onClick={() => setLocation(backTo)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> {t("common.back")}
              </Button>
            ) : null}
            <p className="bio-kicker flex items-center gap-2">
              <span className="bio-eyebrow-dot" aria-hidden />
              {eyebrow}
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}
