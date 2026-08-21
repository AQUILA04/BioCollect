import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/contexts/I18nContext";
import { useTenant } from "@/contexts/TenantContext";
import { trpc } from "@/lib/trpc";
import { fieldsForStep, validateFormSteps } from "@biocollect/form-engine";
import type { TranslationKey } from "@biocollect/i18n";
import { CalendarDays, CheckSquare2, ChevronDown, ChevronUp, Database, Fingerprint, GitBranch, GripVertical, Image, Layers3, Loader2, Plus, Type } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { FormField, FormFieldType, FormStep, SelectionOption } from "../../../api/shared/biocollect";
import DashboardLayout from "../components/DashboardLayout";
import { PageHeader } from "../components/PageHeader";

const fieldOptions = (t: (key: TranslationKey) => string): { type: FormFieldType; label: string; icon: typeof Type }[] => [
  { type: "text", label: t("forms.text"), icon: Type },
  { type: "date", label: t("forms.date"), icon: CalendarDays },
  { type: "multiple choice", label: t("forms.multipleChoice"), icon: CheckSquare2 },
  { type: "photo", label: t("forms.photo"), icon: Image },
];

const makeId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const newField = (type: FormFieldType, t: (key: TranslationKey, values?: Record<string, string | number>) => string): FormField => ({
  id: makeId("field"), label: t("forms.newField", { type }), type, required: false,
  options: type === "multiple choice" ? [{ value: "option_1", label: t("forms.optionOne") }, { value: "option_2", label: t("forms.optionTwo") }] : undefined,
});
const newStep = (label: string): FormStep => ({ id: makeId("step"), label, order: 0, kind: "fields", fieldIds: [] });
const optionText = (options: FormField["options"]) => (options ?? []).map(option => typeof option === "string" ? option : `${option.value} | ${option.label}`).join("\n");
const fieldTypeLabel = (t: (key: TranslationKey) => string, type: FormFieldType) => t(({ text: "forms.text", date: "forms.date", "multiple choice": "forms.multipleChoice", "hierarchical selection": "forms.hierarchicalSelection", photo: "forms.photo" } as const)[type]);
const parseOptions = (value: string): SelectionOption[] => {
  const known = new Set<string>();
  return value.split(/\r?\n/).map(line => { const [first, ...rest] = line.split("|"); const code = first.trim(); return code ? { value: code, label: rest.join("|").trim() || code } : null; }).filter((item): item is SelectionOption => Boolean(item)).filter(item => !known.has(item.value) && Boolean(known.add(item.value)));
};

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
  const referenceData = trpc.biocollect.referenceData.list.useQuery({ tenantId: tenantId ?? "" }, { enabled: Boolean(tenantId) });
  const selectionTypes = trpc.biocollect.selectionTypes.list.useQuery({ tenantId: tenantId ?? "" }, { enabled: Boolean(tenantId) });
  const utils = trpc.useUtils();
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState(() => t("forms.enrollmentForm"));
  const [fields, setFields] = useState<FormField[]>([]);
  const [steps, setSteps] = useState<FormStep[]>(() => [newStep(t("steps.newStep"))]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string>(() => steps[0]?.id ?? "");
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [draggedPaletteType, setDraggedPaletteType] = useState<FormFieldType | null>(null);
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});
  const save = trpc.biocollect.forms.create.useMutation({
    onSuccess: () => { void utils.biocollect.forms.invalidate(); toast.success(t("forms.published")); },
    onError: error => toast.error(error.message),
  });

  const selected = useMemo(() => fields.find(field => field.id === selectedId) ?? null, [fields, selectedId]);
  const selectedStep = useMemo(() => steps.find(step => step.id === selectedStepId) ?? steps[0] ?? null, [steps, selectedStepId]);
  const orderedSteps = useMemo(() => [...steps].sort((left, right) => left.order - right.order), [steps]);
  const stepFields = useMemo(() => selectedStep ? fieldsForStep(fields, selectedStep).filter(field => isVisible(field, previewValues)) : [], [fields, selectedStep, previewValues]);

  function normalize(next: FormStep[]) { setSteps(next.map((step, index) => ({ ...step, order: index }))); }
  function updateField(id: string, patch: Partial<FormField>) { setFields(current => current.map(field => field.id === id ? { ...field, ...patch } : field)); }
  function chooseReferenceData(fieldId: string, referenceDataSetId: string) {
    const reference = referenceData.data?.find(item => item.id === referenceDataSetId);
    updateField(fieldId, reference ? { referenceDataSetId: reference.id, options: reference.options as SelectionOption[] } : { referenceDataSetId: undefined });
  }
  function updateStep(id: string, patch: Partial<FormStep>) { setSteps(current => current.map(step => step.id === id ? { ...step, ...patch } : step)); }
  function addStep(kind: FormStep["kind"] = "fields") {
    if (kind === "biometrics" && steps.some(step => step.kind === "biometrics")) return;
    const step = { ...newStep(kind === "biometrics" ? t("steps.biometrics") : t("steps.newStep")), kind };
    normalize([...orderedSteps, step]); setSelectedStepId(step.id);
  }
  function moveStep(id: string, direction: -1 | 1) {
    const index = orderedSteps.findIndex(step => step.id === id); const target = index + direction;
    if (target < 0 || target >= orderedSteps.length) return;
    const next = [...orderedSteps]; [next[index], next[target]] = [next[target], next[index]]; normalize(next);
  }
  function removeStep(step: FormStep) {
    if (step.fieldIds.length || orderedSteps.length === 1) return toast.error(t("steps.cannotDelete"));
    const next = orderedSteps.filter(item => item.id !== step.id); normalize(next); setSelectedStepId(next[0]?.id ?? "");
  }
  function assignField(fieldId: string, stepId: string) {
    setSteps(current => current.map(step => ({ ...step, fieldIds: step.id === stepId ? [...step.fieldIds.filter(id => id !== fieldId), fieldId] : step.fieldIds.filter(id => id !== fieldId) })));
  }
  function addField(type: FormFieldType) {
    if (!selectedStep || selectedStep.kind !== "fields") return toast.error(t("steps.select"));
    const field = newField(type, t); setFields(current => [...current, field]); assignField(field.id, selectedStep.id); setSelectedId(field.id);
  }
  function addHierarchyField(type: { id: string; name: string }) { if (!selectedStep || selectedStep.kind !== "fields") return toast.error(t("steps.select")); const field: FormField = { id: makeId("field"), label: t("forms.newField", { type: type.name }), type: "hierarchical selection", required: false, selectionTypeId: type.id }; setFields(current => [...current, field]); assignField(field.id, selectedStep.id); setSelectedId(field.id); }
  function placeDraggedField(targetId?: string) {
    if (draggedPaletteType) addField(draggedPaletteType);
    if (draggedFieldId && targetId && draggedFieldId !== targetId) setFields(current => {
      const sourceIndex = current.findIndex(item => item.id === draggedFieldId); const targetIndex = current.findIndex(item => item.id === targetId);
      const next = [...current]; const [moved] = next.splice(sourceIndex, 1); next.splice(targetIndex, 0, moved); return next;
    });
    setDraggedFieldId(null); setDraggedPaletteType(null);
  }
  function publish() {
    if (!projectId) return toast.error(t("forms.selectProjectFirst"));
    if (!fields.length) return toast.error(t("forms.addFieldFirst"));
    if (!tenantId) return toast.error(t("forms.selectTenantFirst"));
    if (validateFormSteps(fields, orderedSteps).length) return toast.error(t("steps.invalid"));
    save.mutate({ tenantId, projectId, name, fields, steps: orderedSteps, isPublished: true });
  }

  return <>
    <PageHeader eyebrow={t("forms.eyebrow")} title={t("forms.title")} description={t("forms.description")} action={<Button onClick={publish} disabled={save.isPending}>{save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{t("forms.publish")}</Button>} />
    <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_2fr]">
      <div className="grid gap-2"><Label htmlFor="builder-project">{t("forms.project")}</Label><select id="builder-project" disabled={projects.isLoading} value={projectId} onChange={event => setProjectId(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">{projects.isLoading ? t("forms.loadingProjects") : t("forms.selectProject")}</option>{projects.data?.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div>
      <div className="grid gap-2"><Label htmlFor="form-name">{t("forms.formName")}</Label><Input id="form-name" value={name} onChange={event => setName(event.target.value)} minLength={3} /></div>
    </div>
    <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
      <Card><CardContent className="p-5"><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-700">{t("steps.title")}</p><p className="mt-1 text-sm text-slate-500">{t("steps.description")}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => addStep()}><Plus className="mr-1 h-4 w-4" />{t("steps.create")}</Button><Button size="sm" variant="outline" disabled={steps.some(step => step.kind === "biometrics")} onClick={() => addStep("biometrics")}><Fingerprint className="mr-1 h-4 w-4" />{t("steps.addBiometrics")}</Button></div></div><div className="grid gap-2">{orderedSteps.map((step, index) => <div key={step.id} role="button" tabIndex={0} onClick={() => setSelectedStepId(step.id)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") setSelectedStepId(step.id); }} className={`flex min-h-14 items-center gap-3 rounded-lg border p-3 text-left ${step.id === selectedStepId ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`}><span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{index + 1}</span>{step.kind === "biometrics" ? <Fingerprint className="h-4 w-4 text-blue-700" /> : <Layers3 className="h-4 w-4 text-blue-700" />}<span className="min-w-0 flex-1"><span className="block truncate font-medium text-slate-900">{step.label}</span><span className="block text-xs text-slate-500">{step.kind === "biometrics" ? t("steps.biometrics") : `${step.fieldIds.length} ${t("steps.fields").toLowerCase()}`}</span></span><span className="flex gap-1"><Button size="icon" variant="ghost" disabled={index === 0} onClick={event => { event.stopPropagation(); moveStep(step.id, -1); }} aria-label={t("steps.moveUp")}><ChevronUp className="h-4 w-4" /></Button><Button size="icon" variant="ghost" disabled={index === orderedSteps.length - 1} onClick={event => { event.stopPropagation(); moveStep(step.id, 1); }} aria-label={t("steps.moveDown")}><ChevronDown className="h-4 w-4" /></Button></span></div>)}</div></CardContent></Card>
      <Card className="h-fit"><CardContent className="grid gap-3 p-5">{selectedStep ? <><div className="grid gap-2"><Label htmlFor="step-label">{t("steps.label")}</Label><Input id="step-label" value={selectedStep.label} onChange={event => updateStep(selectedStep.id, { label: event.target.value })} /></div><p className="text-sm text-slate-500">{selectedStep.kind === "biometrics" ? t("steps.biometricDescription") : t("steps.assignField")}</p><Button variant="ghost" className="justify-start text-rose-700 hover:bg-rose-50 hover:text-rose-800" onClick={() => removeStep(selectedStep)}>{t("steps.remove")}</Button></> : null}</CardContent></Card>
    </div>
    <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)_300px]">
      <Card className="h-fit"><CardContent className="p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{t("forms.fields")}</p><div className="grid gap-2">{fieldOptions(t).map(({ type, label, icon: Icon }) => <Button key={type} variant="outline" draggable className="justify-start" onDragStart={() => { setDraggedPaletteType(type); setDraggedFieldId(null); }} onDragEnd={() => { setDraggedPaletteType(null); setDraggedFieldId(null); }} onClick={() => addField(type)}><Icon className="mr-2 h-4 w-4 text-blue-600" />{label}</Button>)}{selectionTypes.data?.map(type => <Button key={type!.id} variant="outline" className="justify-start border-blue-100 bg-blue-50/40" onClick={() => addHierarchyField(type!)}><GitBranch className="mr-2 h-4 w-4 text-blue-600" />{type!.name}</Button>)}</div></CardContent></Card>
      <Card className="min-h-[520px] border-slate-300 bg-slate-50/60"><CardContent onDragOver={event => event.preventDefault()} onDrop={() => placeDraggedField()} className="mx-auto max-w-2xl p-5 sm:p-8"><div className="mb-6 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-700">{t("forms.preview")}</p><h2 className="mt-1 font-semibold text-slate-950">{selectedStep?.label ?? name}</h2></div><span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">{selectedStep?.kind === "biometrics" ? t("steps.biometrics") : `${stepFields.length} ${t("steps.fields").toLowerCase()}`}</span></div>{selectedStep?.kind === "biometrics" ? <div className="rounded-xl border border-blue-100 bg-blue-50 p-6 text-sm text-blue-900"><Fingerprint className="mb-3 h-6 w-6" />{t("steps.biometricDescription")}</div> : stepFields.length === 0 ? <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-center"><Plus className="mb-3 h-7 w-7 text-blue-600" /><p className="font-medium">{t("steps.noFields")}</p></div> : <div className="grid gap-3">{stepFields.map(field => <button key={field.id} draggable onDragStart={() => { setDraggedFieldId(field.id); setDraggedPaletteType(null); }} onDragEnd={() => { setDraggedFieldId(null); setDraggedPaletteType(null); }} onDragOver={event => event.preventDefault()} onDrop={event => { event.stopPropagation(); placeDraggedField(field.id); }} onClick={() => setSelectedId(field.id)} className={`rounded-lg border bg-white p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${selectedId === field.id ? "border-blue-500 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}><div className="flex gap-3"><GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><span className="font-medium text-slate-900">{field.label}</span>{field.required ? <span className="text-xs font-medium text-rose-600">{t("forms.required")}</span> : null}</div><p className="mt-1 text-xs text-slate-500">{fieldTypeLabel(t, field.type)}</p></div></div></button>)}</div>}</CardContent></Card>
      <Card className="h-fit"><CardContent className="p-4">{selected ? <div className="grid gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t("forms.properties")}</p><h2 className="mt-1 font-semibold text-slate-950">{fieldTypeLabel(t, selected.type)}</h2></div><div className="grid gap-2"><Label htmlFor="field-label">{t("forms.label")}</Label><Input id="field-label" value={selected.label} onChange={event => updateField(selected.id, { label: event.target.value })} /></div><div className="grid gap-2"><Label htmlFor="field-step">{t("steps.assignField")}</Label><select id="field-step" value={orderedSteps.find(step => step.fieldIds.includes(selected.id))?.id ?? ""} onChange={event => assignField(selected.id, event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{orderedSteps.filter(step => step.kind === "fields").map(step => <option key={step.id} value={step.id}>{step.label}</option>)}</select></div><div className="flex items-center justify-between gap-3"><Label htmlFor="field-required">{t("forms.requiredField")}</Label><Switch id="field-required" checked={selected.required} onCheckedChange={required => updateField(selected.id, { required })} /></div>{selected.type === "multiple choice" ? <div className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3"><div className="flex items-center gap-2"><Database className="h-4 w-4 text-blue-700" /><Label htmlFor="field-reference">{t("forms.referenceSource")}</Label></div><select id="field-reference" value={selected.referenceDataSetId ?? ""} onChange={event => chooseReferenceData(selected.id, event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">{t("forms.manualOptions")}</option>{referenceData.data?.map(reference => <option key={reference.id} value={reference.id}>{reference.name} · {reference.type}</option>)}</select>{selected.referenceDataSetId ? <p className="text-xs text-blue-800">{t("forms.referenceDataSet")}</p> : <div className="grid gap-2"><Label htmlFor="field-options">{t("forms.optionsPerLine")}</Label><Textarea id="field-options" value={optionText(selected.options)} placeholder={t("forms.optionFormat")} onChange={event => updateField(selected.id, { options: parseOptions(event.target.value), referenceDataSetId: undefined })} /><p className="text-xs text-slate-500">{t("forms.optionFormat")}</p></div>}</div> : null}{selected.type === "hierarchical selection" ? <div className="grid gap-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3"><Label htmlFor="field-selection-type">{t("forms.hierarchicalSelection")}</Label><select id="field-selection-type" value={selected.selectionTypeId ?? ""} onChange={event => updateField(selected.id, { selectionTypeId: event.target.value || undefined, hierarchicalDefinition: undefined })} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{selectionTypes.data?.map(type => <option key={type!.id} value={type!.id}>{type!.name}</option>)}</select></div> : null}<div className="grid gap-2"><Label htmlFor="field-condition">{t("forms.showWhen")}</Label><select id="field-condition" value={selected.condition?.fieldId ?? ""} onChange={event => updateField(selected.id, { condition: event.target.value ? { fieldId: event.target.value, operator: "isFilled" } : undefined })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">{t("forms.alwaysVisible")}</option>{fields.filter(field => { const sourceStep = orderedSteps.findIndex(step => step.fieldIds.includes(field.id)); const targetStep = orderedSteps.findIndex(step => step.fieldIds.includes(selected.id)); return field.id !== selected.id && sourceStep >= 0 && sourceStep <= targetStep; }).map(field => <option key={field.id} value={field.id}>{field.label} {t("forms.isFilled")}</option>)}</select></div><Button variant="ghost" className="justify-start text-rose-700 hover:bg-rose-50 hover:text-rose-800" onClick={() => { setFields(current => current.filter(field => field.id !== selected.id)); setSteps(current => current.map(step => ({ ...step, fieldIds: step.fieldIds.filter(id => id !== selected.id) }))); setSelectedId(null); }}>{t("forms.removeField")}</Button></div> : <div className="py-12 text-center text-sm text-slate-500">{t("forms.selectField")}</div>}</CardContent></Card>
    </div>
  </>;
}

export default function FormBuilder() { return <DashboardLayout><FormBuilderContent /></DashboardLayout>; }
