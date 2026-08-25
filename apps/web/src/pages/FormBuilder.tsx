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
import { AtSign, CalendarDays, CheckSquare2, ChevronDown, ChevronUp, CircleUserRound, Database, Fingerprint, GitBranch, GripVertical, Image, Layers3, Loader2, MapPin, Phone, Plus, Type } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { FieldValidation, FormField, FormFieldType, FormStep, PhoneValidationDefaults, SelectionOption, TextValidationFormat } from "../../../api/shared/biocollect";
import DashboardLayout from "../components/DashboardLayout";
import { PageHeader } from "../components/PageHeader";

const fieldOptions = (t: (key: TranslationKey) => string): { type: FormFieldType; label: string; icon: typeof Type }[] => [
  { type: "text", label: t("forms.text"), icon: Type },
  { type: "email", label: t("forms.email"), icon: AtSign },
  { type: "phone", label: t("forms.phone"), icon: Phone },
  { type: "sex", label: t("forms.sex"), icon: CircleUserRound },
  { type: "gps", label: t("forms.gps"), icon: MapPin },
  { type: "date", label: t("forms.date"), icon: CalendarDays },
  { type: "multiple choice", label: t("forms.multipleChoice"), icon: CheckSquare2 },
  { type: "photo", label: t("forms.photo"), icon: Image },
];

const makeId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const newField = (type: FormFieldType, t: (key: TranslationKey, values?: Record<string, string | number>) => string, phoneDefaults: PhoneValidationDefaults = {}): FormField => ({
  id: makeId("field"),
  label: t("forms.newField", { type: fieldTypeLabel(t, type) }),
  type,
  required: false,
  validation: type === "phone" ? { ...phoneDefaults } : undefined,
  sexUseOther: type === "sex" ? true : undefined,
  options: type === "multiple choice" ? [{ value: "option_1", label: t("forms.optionOne") }, { value: "option_2", label: t("forms.optionTwo") }] : undefined,
});
const newStep = (label: string): FormStep => ({ id: makeId("step"), label, order: 0, kind: "fields", fieldIds: [] });
const optionText = (options: FormField["options"]) => (options ?? []).map(option => typeof option === "string" ? option : `${option.value} | ${option.label}`).join("\n");
const fieldTypeLabel = (t: (key: TranslationKey) => string, type: FormFieldType) => t(({ text: "forms.text", email: "forms.email", phone: "forms.phone", sex: "forms.sex", gps: "forms.gps", date: "forms.date", "multiple choice": "forms.multipleChoice", "hierarchical selection": "forms.hierarchicalSelection", photo: "forms.photo" } as const)[type]);
const sexOptions = (t: (key: TranslationKey) => string, useOther = true): SelectionOption[] => [{ value: "MALE", label: t("forms.male") }, { value: "FEMALE", label: t("forms.female") }, ...(useOther ? [{ value: "OTHER", label: t("forms.other") }] : [])];
const parseOptions = (value: string): SelectionOption[] => {
  const known = new Set<string>();
  return value.split(/\r?\n/).map(line => { const [first, ...rest] = line.split("|"); const code = first.trim(); return code ? { value: code, label: rest.join("|").trim() || code } : null; }).filter((item): item is SelectionOption => Boolean(item)).filter(item => !known.has(item.value) && Boolean(known.add(item.value)));
};
const optionalInteger = (value: string) => value === "" ? undefined : Math.max(0, Number.parseInt(value, 10) || 0);
const parsePrefixes = (value: string) => Array.from(new Set(value.split(",").map(prefix => prefix.trim()).filter(prefix => /^\d{1,16}$/.test(prefix))));
const prefixText = (prefixes: string[] | undefined) => (prefixes ?? []).join(",");

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
  const phoneDefaultsQuery = trpc.biocollect.forms.phoneDefaults.useQuery({ tenantId: tenantId ?? "" }, { enabled: Boolean(tenantId) });
  const utils = trpc.useUtils();
  const [projectId, setProjectId] = useState("");
  const drafts = trpc.biocollect.forms.drafts.useQuery({ tenantId: tenantId ?? "", projectId }, { enabled: Boolean(tenantId && projectId) });
  const [name, setName] = useState(() => t("forms.enrollmentForm"));
  const [fields, setFields] = useState<FormField[]>([]);
  const [steps, setSteps] = useState<FormStep[]>(() => [newStep(t("steps.newStep"))]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string>(() => steps[0]?.id ?? "");
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [draggedPaletteType, setDraggedPaletteType] = useState<FormFieldType | null>(null);
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});
  const [draftId, setDraftId] = useState<string | undefined>();
  const [phoneDefaults, setPhoneDefaults] = useState<PhoneValidationDefaults>({});

  useEffect(() => { setPhoneDefaults(phoneDefaultsQuery.data ?? {}); }, [phoneDefaultsQuery.data]);

  const save = trpc.biocollect.forms.create.useMutation({
    onSuccess: () => {
      setDraftId(undefined);
      void utils.biocollect.forms.invalidate();
      toast.success(t("forms.published"));
    },
    onError: error => toast.error(error.message),
  });
  const saveDraft = trpc.biocollect.forms.saveDraft.useMutation({
    onSuccess: saved => {
      setDraftId(saved.id);
      void utils.biocollect.forms.drafts.invalidate();
      toast.success(t("forms.draftSaved"));
    },
    onError: error => toast.error(error.message),
  });
  const deleteDraft = trpc.biocollect.forms.deleteDraft.useMutation({
    onSuccess: () => {
      if (draftId) newForm();
      void utils.biocollect.forms.drafts.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const savePhoneDefaults = trpc.biocollect.forms.updatePhoneDefaults.useMutation({
    onSuccess: saved => {
      setPhoneDefaults(saved);
      void utils.biocollect.forms.phoneDefaults.invalidate();
      toast.success(t("forms.phoneDefaultsSaved"));
    },
    onError: error => toast.error(error.message),
  });

  const selected = useMemo(() => fields.find(field => field.id === selectedId) ?? null, [fields, selectedId]);
  const selectedStep = useMemo(() => steps.find(step => step.id === selectedStepId) ?? steps[0] ?? null, [steps, selectedStepId]);
  const orderedSteps = useMemo(() => [...steps].sort((left, right) => left.order - right.order), [steps]);
  const stepFields = useMemo(() => selectedStep ? fieldsForStep(fields, selectedStep).filter(field => isVisible(field, previewValues)) : [], [fields, selectedStep, previewValues]);

  function normalize(next: FormStep[]) { setSteps(next.map((step, index) => ({ ...step, order: index }))); }
  function updateField(id: string, patch: Partial<FormField>) { setFields(current => current.map(field => field.id === id ? { ...field, ...patch } : field)); }
  function updateValidation(id: string, patch: Partial<FieldValidation>) { setFields(current => current.map(field => field.id === id ? { ...field, validation: { ...field.validation, ...patch } } : field)); }
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
    const field = newField(type, t, phoneDefaultsQuery.data ?? phoneDefaults); setFields(current => [...current, field]); assignField(field.id, selectedStep.id); setSelectedId(field.id);
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
  function newForm(nextProjectId = projectId) {
    setDraftId(undefined); setName(t("forms.enrollmentForm")); setFields([]); const firstStep = newStep(t("steps.newStep")); setSteps([firstStep]); setSelectedStepId(firstStep.id); setSelectedId(null); setPreviewValues({});
    if (nextProjectId !== projectId) setProjectId(nextProjectId);
  }
  function selectProject(nextProjectId: string) { newForm(nextProjectId); }
  function resumeDraft(draft: { id: string; name: string; fields: unknown; steps: unknown }) {
    const restoredSteps = (Array.isArray(draft.steps) && draft.steps.length ? draft.steps : [newStep(t("steps.newStep"))]) as FormStep[];
    setDraftId(draft.id); setName(draft.name); setFields(draft.fields as FormField[]); setSteps(restoredSteps); setSelectedStepId(restoredSteps[0]?.id ?? ""); setSelectedId(null); setPreviewValues({});
  }
  function persistDraft() {
    if (!projectId) return toast.error(t("forms.selectProjectFirst"));
    if (!tenantId) return toast.error(t("forms.selectTenantFirst"));
    saveDraft.mutate({ tenantId, projectId, draftId, name, fields, steps: orderedSteps });
  }
  function publish() {
    if (!projectId) return toast.error(t("forms.selectProjectFirst"));
    if (!fields.length) return toast.error(t("forms.addFieldFirst"));
    if (!tenantId) return toast.error(t("forms.selectTenantFirst"));
    if (validateFormSteps(fields, orderedSteps).length) return toast.error(t("steps.invalid"));
    save.mutate({ tenantId, projectId, name, fields, steps: orderedSteps, isPublished: true, draftId });
  }

  const lengthValidation = selected && ["text", "email", "phone"].includes(selected.type) ? <div className="grid grid-cols-2 gap-2"><div className="grid gap-2"><Label htmlFor="field-min-length">{t("forms.minLength")}</Label><Input id="field-min-length" type="number" min="0" value={selected.validation?.minLength ?? ""} onChange={event => updateValidation(selected.id, { minLength: optionalInteger(event.target.value) })} /></div><div className="grid gap-2"><Label htmlFor="field-max-length">{t("forms.maxLength")}</Label><Input id="field-max-length" type="number" min="1" value={selected.validation?.maxLength ?? ""} placeholder={t("forms.unlimited")} onChange={event => updateValidation(selected.id, { maxLength: optionalInteger(event.target.value) })} /></div></div> : null;

  return <>
    <PageHeader eyebrow={t("forms.eyebrow")} title={t("forms.title")} description={t("forms.description")} action={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={persistDraft} disabled={saveDraft.isPending}>{saveDraft.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{t("forms.saveDraft")}</Button><Button onClick={publish} disabled={save.isPending}>{save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{t("forms.publish")}</Button></div>} />
    <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_2fr_auto]">
      <div className="grid gap-2"><Label htmlFor="builder-project">{t("forms.project")}</Label><select id="builder-project" disabled={projects.isLoading} value={projectId} onChange={event => selectProject(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">{projects.isLoading ? t("forms.loadingProjects") : t("forms.selectProject")}</option>{projects.data?.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div>
      <div className="grid gap-2"><Label htmlFor="form-name">{t("forms.formName")}</Label><Input id="form-name" value={name} onChange={event => setName(event.target.value)} minLength={3} /></div>
      <div className="flex items-end"><Button variant="outline" className="w-full" onClick={() => newForm()}>{t("forms.newForm")}</Button></div>
    </div>
    {projectId ? <Card className="mb-5"><CardContent className="p-4"><div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t("forms.drafts")}</p><p className="mt-1 text-sm text-slate-500">{drafts.isLoading ? t("common.loading") : t("forms.noDrafts")}</p></div></div>{drafts.data?.length ? <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{drafts.data.map(draft => <div key={draft.id} className={`flex items-center gap-2 rounded-lg border p-3 ${draft.id === draftId ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}><button type="button" className="min-w-0 flex-1 text-left" onClick={() => resumeDraft(draft)}><span className="block truncate text-sm font-medium text-slate-900">{draft.name}</span><span className="block text-xs text-slate-500">{new Date(draft.updatedAt).toLocaleString()}</span></button><Button size="sm" variant="outline" onClick={() => resumeDraft(draft)}>{t("forms.resumeDraft")}</Button><Button size="sm" variant="ghost" className="text-rose-700 hover:bg-rose-50 hover:text-rose-800" onClick={() => deleteDraft.mutate({ tenantId: tenantId!, projectId, draftId: draft.id })}>{t("forms.deleteDraft")}</Button></div>)}</div> : null}</CardContent></Card> : null}
    <div className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
      <Card><CardContent className="p-5"><div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-700">{t("steps.title")}</p><p className="mt-1 text-sm text-slate-500">{t("steps.description")}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => addStep()}><Plus className="mr-1 h-4 w-4" />{t("steps.create")}</Button><Button size="sm" variant="outline" disabled={steps.some(step => step.kind === "biometrics")} onClick={() => addStep("biometrics")}><Fingerprint className="mr-1 h-4 w-4" />{t("steps.addBiometrics")}</Button></div></div><div className="grid gap-2">{orderedSteps.map((step, index) => <div key={step.id} role="button" tabIndex={0} onClick={() => setSelectedStepId(step.id)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") setSelectedStepId(step.id); }} className={`flex min-h-14 items-center gap-3 rounded-lg border p-3 text-left ${step.id === selectedStepId ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"}`}><span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{index + 1}</span>{step.kind === "biometrics" ? <Fingerprint className="h-4 w-4 text-blue-700" /> : <Layers3 className="h-4 w-4 text-blue-700" />}<span className="min-w-0 flex-1"><span className="block truncate font-medium text-slate-900">{step.label}</span><span className="block text-xs text-slate-500">{step.kind === "biometrics" ? t("steps.biometrics") : `${step.fieldIds.length} ${t("steps.fields").toLowerCase()}`}</span></span><span className="flex gap-1"><Button size="icon" variant="ghost" disabled={index === 0} onClick={event => { event.stopPropagation(); moveStep(step.id, -1); }} aria-label={t("steps.moveUp")}><ChevronUp className="h-4 w-4" /></Button><Button size="icon" variant="ghost" disabled={index === orderedSteps.length - 1} onClick={event => { event.stopPropagation(); moveStep(step.id, 1); }} aria-label={t("steps.moveDown")}><ChevronDown className="h-4 w-4" /></Button></span></div>)}</div></CardContent></Card>
      <Card className="h-fit"><CardContent className="grid gap-3 p-5">{selectedStep ? <><div className="grid gap-2"><Label htmlFor="step-label">{t("steps.label")}</Label><Input id="step-label" value={selectedStep.label} onChange={event => updateStep(selectedStep.id, { label: event.target.value })} /></div><p className="text-sm text-slate-500">{selectedStep.kind === "biometrics" ? t("steps.biometricDescription") : t("steps.assignField")}</p><Button variant="ghost" className="justify-start text-rose-700 hover:bg-rose-50 hover:text-rose-800" onClick={() => removeStep(selectedStep)}>{t("steps.remove")}</Button></> : null}</CardContent></Card>
    </div>
    <div className="grid gap-5 xl:grid-cols-[250px_minmax(0,1fr)_320px]">
      <Card className="h-fit"><CardContent className="p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{t("forms.fields")}</p><div className="grid gap-2">{fieldOptions(t).map(({ type, label, icon: Icon }) => <Button key={type} variant="outline" draggable className="justify-start" onDragStart={() => { setDraggedPaletteType(type); setDraggedFieldId(null); }} onDragEnd={() => { setDraggedPaletteType(null); setDraggedFieldId(null); }} onClick={() => addField(type)}><Icon className="mr-2 h-4 w-4 text-blue-600" />{label}</Button>)}{selectionTypes.data?.map(type => <Button key={type!.id} variant="outline" className="justify-start border-blue-100 bg-blue-50/40" onClick={() => addHierarchyField(type!)}><GitBranch className="mr-2 h-4 w-4 text-blue-600" />{type!.name}</Button>)}</div><div className="mt-5 grid gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3"><div><p className="text-sm font-medium text-slate-950">{t("forms.phoneDefaults")}</p><p className="mt-1 text-xs text-slate-600">{t("forms.phoneDefaultsDescription")}</p></div><div className="grid grid-cols-2 gap-2"><div className="grid gap-1"><Label htmlFor="default-phone-min" className="text-xs">{t("forms.minLength")}</Label><Input id="default-phone-min" type="number" min="0" value={phoneDefaults.minLength ?? ""} onChange={event => setPhoneDefaults(current => ({ ...current, minLength: optionalInteger(event.target.value) }))} /></div><div className="grid gap-1"><Label htmlFor="default-phone-max" className="text-xs">{t("forms.maxLength")}</Label><Input id="default-phone-max" type="number" min="1" value={phoneDefaults.maxLength ?? ""} placeholder={t("forms.unlimited")} onChange={event => setPhoneDefaults(current => ({ ...current, maxLength: optionalInteger(event.target.value) }))} /></div></div><div className="grid gap-1"><Label htmlFor="default-phone-prefixes" className="text-xs">{t("forms.allowedPrefixes")}</Label><Input id="default-phone-prefixes" value={prefixText(phoneDefaults.allowedPrefixes)} onChange={event => setPhoneDefaults(current => ({ ...current, allowedPrefixes: parsePrefixes(event.target.value) }))} /><p className="text-xs text-slate-500">{t("forms.prefixesHelp")}</p></div><Button size="sm" variant="outline" onClick={() => tenantId && savePhoneDefaults.mutate({ tenantId, validation: phoneDefaults })} disabled={!tenantId || savePhoneDefaults.isPending}>{savePhoneDefaults.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{t("forms.savePhoneDefaults")}</Button></div></CardContent></Card>
      <Card className="min-h-[520px] border-slate-300 bg-slate-50/60"><CardContent onDragOver={event => event.preventDefault()} onDrop={() => placeDraggedField()} className="mx-auto max-w-2xl p-5 sm:p-8"><div className="mb-6 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-700">{t("forms.preview")}</p><h2 className="mt-1 font-semibold text-slate-950">{selectedStep?.label ?? name}</h2></div><span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">{selectedStep?.kind === "biometrics" ? t("steps.biometrics") : `${stepFields.length} ${t("steps.fields").toLowerCase()}`}</span></div>{selectedStep?.kind === "biometrics" ? <div className="rounded-xl border border-blue-100 bg-blue-50 p-6 text-sm text-blue-900"><Fingerprint className="mb-3 h-6 w-6" />{t("steps.biometricDescription")}</div> : stepFields.length === 0 ? <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-center"><Plus className="mb-3 h-7 w-7 text-blue-600" /><p className="font-medium">{t("steps.noFields")}</p></div> : <div className="grid gap-3">{stepFields.map(field => <button key={field.id} draggable onDragStart={() => { setDraggedFieldId(field.id); setDraggedPaletteType(null); }} onDragEnd={() => { setDraggedFieldId(null); setDraggedPaletteType(null); }} onDragOver={event => event.preventDefault()} onDrop={event => { event.stopPropagation(); placeDraggedField(field.id); }} onClick={() => setSelectedId(field.id)} className={`rounded-lg border bg-white p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${selectedId === field.id ? "border-blue-500 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}><div className="flex gap-3"><GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><span className="font-medium text-slate-900">{field.label}</span>{field.required ? <span className="text-xs font-medium text-rose-600">{t("forms.required")}</span> : null}</div><p className="mt-1 text-xs text-slate-500">{fieldTypeLabel(t, field.type)}</p></div></div></button>)}</div>}</CardContent></Card>
      <Card className="h-fit"><CardContent className="p-4">{selected ? <div className="grid gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t("forms.properties")}</p><h2 className="mt-1 font-semibold text-slate-950">{fieldTypeLabel(t, selected.type)}</h2></div><div className="grid gap-2"><Label htmlFor="field-label">{t("forms.label")}</Label><Input id="field-label" value={selected.label} onChange={event => updateField(selected.id, { label: event.target.value })} /></div><div className="grid gap-2"><Label htmlFor="field-step">{t("steps.assignField")}</Label><select id="field-step" value={orderedSteps.find(step => step.fieldIds.includes(selected.id))?.id ?? ""} onChange={event => assignField(selected.id, event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{orderedSteps.filter(step => step.kind === "fields").map(step => <option key={step.id} value={step.id}>{step.label}</option>)}</select></div><div className="flex items-center justify-between gap-3"><Label htmlFor="field-required">{t("forms.requiredField")}</Label><Switch id="field-required" checked={selected.required} onCheckedChange={required => updateField(selected.id, { required })} /></div>{selected.type === "sex" ? <div className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3"><div className="flex items-center justify-between gap-3"><div><Label htmlFor="field-sex-other">{t("forms.sexIncludeOther")}</Label><p className="mt-1 text-xs text-slate-500">{t("forms.sexIncludeOtherDescription")}</p></div><Switch id="field-sex-other" checked={selected.sexUseOther !== false} onCheckedChange={sexUseOther => updateField(selected.id, { sexUseOther })} /></div><div className="grid gap-1">{sexOptions(t, selected.sexUseOther !== false).map(option => <div key={option.value} className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm"><span>{option.label}</span><code className="text-xs text-slate-500">{option.value}</code></div>)}</div></div> : null}{selected.type === "multiple choice" ? <div className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3"><div className="flex items-center gap-2"><Database className="h-4 w-4 text-blue-700" /><Label htmlFor="field-reference">{t("forms.referenceSource")}</Label></div><select id="field-reference" value={selected.referenceDataSetId ?? ""} onChange={event => chooseReferenceData(selected.id, event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">{t("forms.manualOptions")}</option>{referenceData.data?.map(reference => <option key={reference.id} value={reference.id}>{reference.name} · {reference.type}</option>)}</select>{selected.referenceDataSetId ? <p className="text-xs text-blue-800">{t("forms.referenceDataSet")}</p> : <div className="grid gap-2"><Label htmlFor="field-options">{t("forms.optionsPerLine")}</Label><Textarea id="field-options" value={optionText(selected.options)} placeholder={t("forms.optionFormat")} onChange={event => updateField(selected.id, { options: parseOptions(event.target.value), referenceDataSetId: undefined })} /><p className="text-xs text-slate-500">{t("forms.optionFormat")}</p></div>}</div> : null}{selected.type === "hierarchical selection" ? <div className="grid gap-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3"><Label htmlFor="field-selection-type">{t("forms.hierarchicalSelection")}</Label><select id="field-selection-type" value={selected.selectionTypeId ?? ""} onChange={event => updateField(selected.id, { selectionTypeId: event.target.value || undefined, hierarchicalDefinition: undefined })} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{selectionTypes.data?.map(type => <option key={type!.id} value={type!.id}>{type!.name}</option>)}</select></div> : null}{["text", "email", "phone", "date"].includes(selected.type) ? <div className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3"><p className="text-sm font-medium text-slate-950">{t("forms.validation")}</p>{selected.type === "text" ? <><div className="grid gap-2"><Label htmlFor="field-text-format">{t("forms.textFormat")}</Label><select id="field-text-format" value={selected.validation?.textFormat ?? "none"} onChange={event => updateValidation(selected.id, { textFormat: event.target.value as TextValidationFormat, regex: event.target.value === "regex" ? selected.validation?.regex : undefined })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="none">{t("forms.noConstraint")}</option><option value="alphabetic">{t("forms.alphabetic")}</option><option value="numeric">{t("forms.numeric")}</option><option value="alphanumeric">{t("forms.alphanumeric")}</option><option value="regex">{t("forms.regularExpression")}</option></select></div>{selected.validation?.textFormat === "regex" ? <div className="grid gap-2"><Label htmlFor="field-regex">{t("forms.regexPattern")}</Label><Input id="field-regex" value={selected.validation?.regex ?? ""} onChange={event => updateValidation(selected.id, { regex: event.target.value })} /></div> : null}{lengthValidation}</> : null}{selected.type === "email" ? lengthValidation : null}{selected.type === "phone" ? <><p className="text-xs text-slate-600">{t("forms.numeric")}</p>{lengthValidation}<div className="grid gap-2"><Label htmlFor="field-phone-prefixes">{t("forms.allowedPrefixes")}</Label><Input id="field-phone-prefixes" value={prefixText(selected.validation?.allowedPrefixes)} onChange={event => updateValidation(selected.id, { allowedPrefixes: parsePrefixes(event.target.value) })} /><p className="text-xs text-slate-500">{t("forms.prefixesHelp")}</p></div></> : null}{selected.type === "date" ? <div className="grid grid-cols-2 gap-2"><div className="grid gap-2"><Label htmlFor="field-min-date">{t("forms.minDate")}</Label><Input id="field-min-date" type="date" value={selected.validation?.minDate ?? ""} onChange={event => updateValidation(selected.id, { minDate: event.target.value || undefined })} /></div><div className="grid gap-2"><Label htmlFor="field-max-date">{t("forms.maxDate")}</Label><Input id="field-max-date" type="date" value={selected.validation?.maxDate ?? ""} onChange={event => updateValidation(selected.id, { maxDate: event.target.value || undefined })} /></div></div> : null}</div> : null}<div className="grid gap-2"><Label htmlFor="field-condition">{t("forms.showWhen")}</Label><select id="field-condition" value={selected.condition?.fieldId ?? ""} onChange={event => updateField(selected.id, { condition: event.target.value ? { fieldId: event.target.value, operator: "isFilled" } : undefined })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">{t("forms.alwaysVisible")}</option>{fields.filter(field => { const sourceStep = orderedSteps.findIndex(step => step.fieldIds.includes(field.id)); const targetStep = orderedSteps.findIndex(step => step.fieldIds.includes(selected.id)); return field.id !== selected.id && sourceStep >= 0 && sourceStep <= targetStep; }).map(field => <option key={field.id} value={field.id}>{field.label} {t("forms.isFilled")}</option>)}</select></div><Button variant="ghost" className="justify-start text-rose-700 hover:bg-rose-50 hover:text-rose-800" onClick={() => { setFields(current => current.filter(field => field.id !== selected.id)); setSteps(current => current.map(step => ({ ...step, fieldIds: step.fieldIds.filter(id => id !== selected.id) }))); setSelectedId(null); }}>{t("forms.removeField")}</Button></div> : <div className="py-12 text-center text-sm text-slate-500">{t("forms.selectField")}</div>}</CardContent></Card>
    </div>
  </>;
}

export default function FormBuilder() { return <DashboardLayout><FormBuilderContent /></DashboardLayout>; }
