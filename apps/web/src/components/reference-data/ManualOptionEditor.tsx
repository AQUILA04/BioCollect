import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

export type ManualOptionRow = { label: string; value: string };

export function normalizeManualOptionRows(rows: ManualOptionRow[]) { const seen = new Set<string>(); return rows.map(row => ({ label: row.label.trim(), value: row.value.trim() || row.label.trim() })).filter(row => row.label && !seen.has(row.value) && Boolean(seen.add(row.value))); }

export function ManualOptionEditor({ rows, onChange, t }: { rows: ManualOptionRow[]; onChange: (rows: ManualOptionRow[]) => void; t: (key: any, values?: any) => string }) {
  const update = (index: number, patch: Partial<ManualOptionRow>) => onChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  const remove = (index: number) => onChange(rows.length === 1 ? [{ label: "", value: "" }] : rows.filter((_, rowIndex) => rowIndex !== index));
  return <fieldset className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"><legend className="px-1 text-sm font-semibold">{t("referenceData.options")}</legend><p className="text-xs leading-5 text-slate-500">{t("referenceData.manualGuide")}</p><div className="grid gap-2">{rows.map((row, index) => <div key={index} className="grid gap-2 rounded-xl border border-slate-100 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_40px]"><div className="grid gap-1.5"><Label htmlFor={`manual-label-${index}`} className="text-xs">{t("referenceData.optionLabel")}</Label><Input id={`manual-label-${index}`} value={row.label} required={index === 0} placeholder={t("referenceData.optionLabelPlaceholder")} onChange={event => update(index, { label: event.target.value })} /></div><div className="grid gap-1.5"><Label htmlFor={`manual-value-${index}`} className="text-xs">{t("referenceData.optionValue")}</Label><Input id={`manual-value-${index}`} value={row.value} placeholder={t("referenceData.optionValuePlaceholder")} onChange={event => update(index, { value: event.target.value })} /></div><Button type="button" size="icon" variant="ghost" className="self-end rounded-xl text-rose-700 hover:bg-rose-50" aria-label={t("referenceData.removeOption")} onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button></div>)}</div><div className="flex items-center justify-between gap-3"><p className="text-xs text-slate-500">{t("referenceData.valueAutofill")}</p><Button type="button" size="sm" variant="outline" className="shrink-0 rounded-xl" onClick={() => onChange([...rows, { label: "", value: "" }])}><Plus className="mr-1.5 h-4 w-4" />{t("referenceData.addOption")}</Button></div></fieldset>;
}
