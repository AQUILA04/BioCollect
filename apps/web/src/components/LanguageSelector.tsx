import { Languages } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { locale, locales, setLocale, t } = useI18n();
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size={compact ? "icon" : "sm"} aria-label={t("common.chooseLanguage")} className="gap-2 text-current hover:bg-white/10"><Languages className="h-4 w-4" />{compact ? null : <span className="uppercase">{locale}</span>}</Button></DropdownMenuTrigger><DropdownMenuContent align="end">{locales.map(item => <DropdownMenuItem key={item.code} onClick={() => setLocale(item.code)} className={item.code === locale ? "font-semibold" : ""}>{item.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>;
}
