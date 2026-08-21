import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/contexts/TenantContext";
import { useI18n } from "@/contexts/I18nContext";
import type { FormField, FormFieldType } from "../../../api/shared/biocollect";
import { CalendarDays, CheckSquare2, GripVertical, Image, Loader2, Plus, Type } from "lucide-react";
import { useMemo, useState } from "react";
import type { TranslationKey } from "@biocollect/i18n";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";

const fieldOptions = (t: (key: TranslationKey) => string): { type: FormFieldType; label: string; icon: typeof Type }[] => [
  { type: "text", label: t("forms.text"), icon: Type },
  { type: "date", label: t("forms.date"), icon: CalendarDays },
  { type: "multiple choice", label: t("forms.multipleChoice"), icon: CheckSquare2 },
  { type: "photo", label: t("forms.photo"), icon: Image },
];

function newField(type: FormFieldType, t: (key: TranslationKey, values?: Record<string, string | number>) => string): FormField {
  return {
    id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    label: t("forms.newField", { type }),
    type,
    required: false,
    options: type === "multiple choice" ? [t("forms.optionOne"), t("forms.optionTwo")] : undefined,
  };
}

function isVisible(field: FormField, values: Record<string, string>) {
  if (!field.condition) return true;
  const value = values[field.condition.fieldId] ?? "";
  if (field.condition.operator === "isFilled") return value.length > 0;
  if (field.condition.operator === "equals") return value === field.condition.value;
  return value !== field.condition.value;
}

function FormBuilderContent() {
  const { tenantId } = useTenant();
  const { t } = useI18n();
  const projects = trpc.biocollect.projects.list.useQuery({ tenantId: tenantId ?? "" }, { enabled: Boolean(tenantId) });
  const utils = trpc.useUtils();
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState(() => t("forms.enrollmentForm"));
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [draggedPaletteType, setDraggedPaletteType] = useState<FormFieldType | null>(null);
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});
  const save = trpc.biocollect.forms.create.useMutation({
    onSuccess: () => { void utils.biocollect.forms.invalidate(); toast.success(t("forms.published")); },
    onError: error => toast.error(error.message),
  });

  const selected = useMemo(() => fields.find(field => field.id === selectedId) ?? null, [fields, selectedId]);
  const visibleFields = useMemo(() => fields.filter(field => isVisible(field, previewValues)), [fields, previewValues]);
  const conditionDrivers = useMemo(() => fields.filter(field => fields.some(candidate => candidate.condition?.fieldId === field.id)), [fields]);

  function updateField(id: string, patch: Partial<FormField>) {
    setFields(current => current.map(field => field.id === id ? { ...field, ...patch } : field));
  }

  function addField(type: FormFieldType) {
    const field = newField(type, t);
    setFields(current => [...current, field]);
    setSelectedId(field.id);
  }

  function placeDraggedField(targetId?: string) {
    if (draggedPaletteType) {
      const field = newField(draggedPaletteType, t);
      setFields(current => {
        const targetIndex = targetId ? current.findIndex(item => item.id === targetId) : current.length;
        return [...current.slice(0, targetIndex), field, ...current.slice(targetIndex)];
      });
      setSelectedId(field.id);
    }
    if (draggedFieldId && targetId && draggedFieldId !== targetId) {
      setFields(current => {
        const sourceIndex = current.findIndex(item => item.id === draggedFieldId);
        const targetIndex = current.findIndex(item => item.id === targetId);
        const next = [...current];
        const [moved] = next.splice(sourceIndex, 1);
        next.splice(targetIndex, 0, moved);
        return next;
      });
    }
    setDraggedFieldId(null);
    setDraggedPaletteType(null);
  }

  function publish() {
    if (!projectId) return toast.error(t("forms.selectProjectFirst"));
    if (!fields.length) return toast.error(t("forms.addFieldFirst"));
    if (!tenantId) return toast.error(t("forms.selectTenantFirst"));
    save.mutate({ tenantId, projectId, name, fields, isPublished: true });
  }

  return <>
    <PageHeader eyebrow={t("forms.eyebrow")} title={t("forms.title")} description={t("forms.description")} action={<Button onClick={publish} disabled={save.isPending}>{save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{t("forms.publish")}</Button>} />
    {projects.isError ? <Card className="mb-5 border-rose-200"><CardContent className="p-4 text-sm text-rose-700">{t("forms.projectLoadFailed")} : {projects.error.message}</CardContent></Card> : null}
    <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_2fr]">
      <div className="grid gap-2"><Label htmlFor="builder-project">{t("forms.project")}</Label><select id="builder-project" disabled={projects.isLoading || projects.isError} value={projectId} onChange={event => setProjectId(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">{projects.isLoading ? t("forms.loadingProjects") : t("forms.selectProject")}</option>{projects.data?.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div>
      <div className="grid gap-2"><Label htmlFor="form-name">{t("forms.formName")}</Label><Input id="form-name" value={name} onChange={event => setName(event.target.value)} minLength={3} /></div>
    </div>
    <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)_300px]">
      <Card className="h-fit"><CardContent className="p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{t("forms.fields")}</p><p className="mb-3 text-xs leading-5 text-slate-500">{t("forms.paletteHelp")}</p><div className="grid gap-2">{fieldOptions(t).map(({ type, label, icon: Icon }) => <Button key={type} variant="outline" draggable className="justify-start" onDragStart={() => { setDraggedPaletteType(type); setDraggedFieldId(null); }} onDragEnd={() => { setDraggedPaletteType(null); setDraggedFieldId(null); }} onClick={() => addField(type)}><Icon className="mr-2 h-4 w-4 text-blue-600" />{label}</Button>)}</div></CardContent></Card>
      <Card className="min-h-[520px] border-slate-300 bg-slate-50/60"><CardContent onDragOver={event => event.preventDefault()} onDrop={() => placeDraggedField()} className="mx-auto max-w-2xl p-5 sm:p-8">
        <div className="mb-6 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-700">{t("forms.preview")}</p><h2 className="mt-1 font-semibold text-slate-950">{name || t("forms.unnamedForm")}</h2></div><span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">{visibleFields.length}/{fields.length} {t("forms.visible")}</span></div>
        {conditionDrivers.length ? <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-3"><p className="text-xs font-semibold text-blue-800">{t("forms.conditionalSimulation")}</p><div className="mt-2 flex flex-wrap gap-2">{conditionDrivers.map(field => <Button key={field.id} size="sm" variant={previewValues[field.id] ? "default" : "outline"} onClick={() => setPreviewValues(current => ({ ...current, [field.id]: current[field.id] ? "" : t("forms.testValue") }))}>{field.label} : {previewValues[field.id] ? t("forms.filled") : t("forms.empty")}</Button>)}</div></div> : null}
        {fields.length === 0 ? <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-center"><Plus className="mb-3 h-7 w-7 text-blue-600" /><p className="font-medium">{t("forms.addFirstField")}</p><p className="mt-1 max-w-xs text-sm text-slate-500">{t("forms.useLeftColumn")}</p></div> : <div className="grid gap-3">{visibleFields.map(field => <button key={field.id} draggable onDragStart={() => { setDraggedFieldId(field.id); setDraggedPaletteType(null); }} onDragEnd={() => { setDraggedFieldId(null); setDraggedPaletteType(null); }} onDragOver={event => event.preventDefault()} onDrop={event => { event.stopPropagation(); placeDraggedField(field.id); }} onClick={() => setSelectedId(field.id)} className={`rounded-lg border bg-white p-4 text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${selectedId === field.id ? "border-blue-500 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}><div className="flex gap-3"><GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><span className="font-medium text-slate-900">{field.label}</span>{field.required ? <span className="text-xs font-medium text-rose-600">{t("forms.required")}</span> : null}</div><p className="mt-1 text-xs text-slate-500">{field.type}</p>{field.type === "multiple choice" ? <div className="mt-3 flex flex-wrap gap-2">{field.options?.map(option => <span key={option} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{option}</span>)}</div> : <div className="mt-3 h-9 rounded border border-slate-200 bg-slate-50" />}</div></div></button>)}</div>}
      </CardContent></Card>
      <Card className="h-fit"><CardContent className="p-4">{selected ? <div className="grid gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t("forms.properties")}</p><h2 className="mt-1 font-semibold text-slate-950">{selected.type}</h2></div><div className="grid gap-2"><Label htmlFor="field-label">{t("forms.label")}</Label><Input id="field-label" value={selected.label} onChange={event => updateField(selected.id, { label: event.target.value })} /></div><div className="flex items-center justify-between gap-3"><Label htmlFor="field-required">{t("forms.requiredField")}</Label><Switch id="field-required" checked={selected.required} onCheckedChange={required => updateField(selected.id, { required })} /></div>{selected.type === "multiple choice" ? <div className="grid gap-2"><Label htmlFor="field-options">{t("forms.optionsPerLine")}</Label><Textarea id="field-options" value={selected.options?.join("\n") ?? ""} onChange={event => updateField(selected.id, { options: event.target.value.split("\n").map(item => item.trim()).filter(Boolean) })} /></div> : null}<div className="grid gap-2"><Label htmlFor="field-condition">{t("forms.showWhen")}</Label><select id="field-condition" value={selected.condition?.fieldId ?? ""} onChange={event => updateField(selected.id, { condition: event.target.value ? { fieldId: event.target.value, operator: "isFilled" } : undefined })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">{t("forms.alwaysVisible")}</option>{fields.filter(field => field.id !== selected.id).map(field => <option key={field.id} value={field.id}>{field.label} {t("forms.isFilled")}</option>)}</select></div><Button variant="ghost" className="justify-start text-rose-700 hover:bg-rose-50 hover:text-rose-800" onClick={() => { setFields(current => current.filter(field => field.id !== selected.id)); setSelectedId(null); }}>{t("forms.removeField")}</Button></div> : <div className="py-12 text-center text-sm text-slate-500">{t("forms.selectField")}</div>}</CardContent></Card>
    </div>
  </>;
}

export default function FormBuilder() { return <DashboardLayout><FormBuilderContent /></DashboardLayout>; }
