import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import React, { useEffect, useMemo, useState } from "react";
import { fieldsForStep, normalizeFormSteps } from "@biocollect/form-engine";
import type { BiometricAttachment, FormField } from "../src/domain";
import { useI18n } from "../src/i18n-context";
import { useMobile } from "../src/mobile-context";
import { canQueueSubmission, isStepValid } from "../src/step-workflow";
import { changeHierarchyAnswer, optionsForHierarchyLevel, parseHierarchicalAnswer } from "../src/hierarchy";
import { normalizeSelectionOption, searchChoiceItems, searchSelectionOptions, shouldUseSelectionSearch } from "../src/selection-search";
import { Card, Kicker, PrimaryButton, Screen, SecondaryButton, styles } from "../src/ui";

function FieldInput({ field, value, onChange, attachment, onAttach }: { field: FormField; value: string; onChange: (value: string) => void; attachment?: BiometricAttachment; onAttach: () => void }) {
  const { t } = useI18n();
  const [selectionQuery, setSelectionQuery] = useState(""); const [hierarchyQueries, setHierarchyQueries] = useState<Record<string, string>>({});
  if (field.type === "multiple choice") { const options = (field.options ?? []).map(normalizeSelectionOption); const searchable = shouldUseSelectionSearch(options); const visibleOptions = searchable ? searchSelectionOptions(options, selectionQuery) : options; return <View style={{ gap: 8 }}><Text style={styles.label}>{field.label}{field.required ? " *" : ""}</Text>{searchable ? <><TextInput accessibilityLabel={t("mobile.searchOptions")} value={selectionQuery} onChangeText={setSelectionQuery} placeholder={t("mobile.searchOptions")} placeholderTextColor="#60758A" style={styles.input} /><Text style={styles.statusText}>{t("mobile.searchResults", { count: visibleOptions.length })}</Text></> : null}<View style={{ gap: 8 }}>{visibleOptions.map(option => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: value === option.value }} onPress={() => onChange(option.value)} style={[styles.option, value === option.value && styles.optionSelected]}><Text style={styles.optionText}>{option.label}</Text></Pressable>)}</View></View>; }
  if (field.type === "hierarchical selection" && field.hierarchicalDefinition) { const definition = field.hierarchicalDefinition; const answer = parseHierarchicalAnswer(value); const levels = [...definition.levels].sort((left, right) => left.order - right.order); return <View style={{ gap: 14 }}><Text style={styles.label}>{field.label}{field.required ? " *" : ""}</Text>{levels.map((level, index) => { const parentId = index ? answer?.selections[levels[index - 1].id] : undefined; const enabled = index === 0 || Boolean(parentId); const options = enabled ? optionsForHierarchyLevel(definition, level.id, parentId) : []; const selected = answer?.selections[level.id]; const query = hierarchyQueries[level.id] ?? ""; const searchable = shouldUseSelectionSearch(options); const visibleOptions = searchable ? searchChoiceItems(options, query) : options; return <View key={level.id} style={{ gap: 8, opacity: enabled ? 1 : 0.55 }}><Text style={styles.statusText}>{level.label}</Text>{enabled ? options.length ? <View style={{ gap: 8 }}>{searchable ? <><TextInput accessibilityLabel={`${t("mobile.searchOptions")} ${level.label}`} value={query} onChangeText={next => setHierarchyQueries(current => ({ ...current, [level.id]: next }))} placeholder={t("mobile.searchOptions")} placeholderTextColor="#60758A" style={styles.input} /><Text style={styles.statusText}>{t("mobile.searchResults", { count: visibleOptions.length })}</Text></> : null}{visibleOptions.map(option => <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ checked: selected === option.id }} onPress={() => { setHierarchyQueries(current => { const next = { ...current }; levels.slice(index + 1).forEach(descendant => { delete next[descendant.id]; }); return next; }); onChange(JSON.stringify(changeHierarchyAnswer(definition, answer, level.id, option.id))); }} style={[styles.option, selected === option.id && styles.optionSelected]}><Text style={styles.optionText}>{option.label}</Text></Pressable>)}</View> : <Text style={styles.body}>—</Text> : <Text style={styles.body}>—</Text>}</View>; })}</View>; }
  if (field.type === "photo") return <View style={{ gap: 8 }}><Text style={styles.label}>{field.label}{field.required ? " *" : ""}</Text><SecondaryButton label={attachment ? t("mobile.attachedCapture") : t("mobile.addCapture")} onPress={onAttach} /><Text style={styles.body}>{attachment ? attachment.minioPath : t("mobile.simulatedCaptureDescription")}</Text></View>;
  return <View style={{ gap: 8 }}><Text style={styles.label}>{field.label}{field.required ? " *" : ""}</Text><TextInput value={value} onChangeText={onChange} placeholder={field.type === "date" ? t("mobile.datePlaceholder") : t("mobile.responsePlaceholder")} placeholderTextColor="#8A98A8" style={styles.input} /></View>;
}

export default function CollectScreen() {
  const { projectId, formId } = useLocalSearchParams<{ projectId: string; formId: string }>();
  const { state, createSimulatedAttachment, finalizeSubmission, saveDraft } = useMobile();
  const { t } = useI18n();
  const project = state.projects.find(item => item.projectId === projectId);
  const form = project?.forms.find(item => item.id === formId);
  const steps = useMemo(() => form ? normalizeFormSteps(form.name, form.fields, form.steps) : [], [form]);
  const draft = state.drafts.find(item => item.tenantId === state.session?.tenantId && item.projectId === projectId && item.formId === formId);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<BiometricAttachment[]>([]);
  const [currentStepId, setCurrentStepId] = useState("");

  useEffect(() => {
    if (!form || !steps.length) return;
    setAnswers(draft?.data ?? {});
    setAttachments(draft?.attachments ?? []);
    setCurrentStepId(steps.some(step => step.id === draft?.currentStepId) ? draft!.currentStepId : steps[0].id);
  }, [draft?.id, form?.id, steps]);

  const currentIndex = Math.max(0, steps.findIndex(step => step.id === currentStepId));
  const currentStep = steps[currentIndex];
  const currentFields = useMemo(() => currentStep ? fieldsForStep(form?.fields ?? [], currentStep) : [], [form?.fields, currentStep]);
  const capturedFingers = useMemo(() => new Set(project?.requiredFingers.filter(finger => attachments.some(item => item.type === "fingerprint" && item.fingerType === finger)) ?? []), [attachments, project?.requiredFingers]);
  const currentStepValid = Boolean(currentStep) && isStepValid({ step: currentStep!, fields: form?.fields ?? [], answers, requiredFingers: project?.requiredFingers ?? [], capturedFingers });
  const isLastStep = steps.at(-1)?.id === currentStepId;
  const canSave = canQueueSubmission(steps, currentStepId, currentStepValid);

  if (!project || !form || !currentStep) return <Screen><View style={styles.page}><Text style={styles.title}>{t("mobile.formUnavailable")}</Text><Text style={styles.body}>{t("mobile.formUnavailableDescription")}</Text><SecondaryButton label={t("common.back")} onPress={() => router.replace("/projects")} /></View></Screen>;
  const activeProject = project;
  const activeForm = form;

  function persistDraft(nextData = answers, nextAttachments = attachments, nextStepId = currentStep.id) {
    void saveDraft({ projectId: activeProject.projectId, formId: activeForm.id, currentStepId: nextStepId, data: nextData, attachments: nextAttachments });
  }
  function updateAnswer(fieldId: string, value: string) { const next = { ...answers, [fieldId]: value }; setAnswers(next); persistDraft(next); }
  function addAttachment(type: BiometricAttachment["type"], fieldId?: string, reference?: string) {
    const attachment = createSimulatedAttachment(activeProject.projectId, type, reference);
    const nextAttachments = [...attachments, attachment]; setAttachments(nextAttachments);
    const nextData = fieldId ? { ...answers, [fieldId]: attachment.minioPath } : answers;
    if (fieldId) setAnswers(nextData); persistDraft(nextData, nextAttachments);
  }
  function next() {
    if (!currentStepValid) return Alert.alert(t("common.requiredInformation"), t("steps.completeStep"));
    const following = steps[currentIndex + 1]; if (!following) return;
    setCurrentStepId(following.id); persistDraft(answers, attachments, following.id);
  }
  function previous() {
    const preceding = steps[currentIndex - 1]; if (!preceding) return;
    setCurrentStepId(preceding.id); persistDraft(answers, attachments, preceding.id);
  }
  async function save() {
    if (!currentStepValid) return Alert.alert(t("common.requiredInformation"), t("steps.completeStep"));
    await finalizeSubmission({ projectId: activeProject.projectId, formId: activeForm.id, data: answers, attachments });
    Alert.alert(t("mobile.recordSaved"), t("mobile.recordSavedDescription"), [{ text: t("mobile.viewQueue"), onPress: () => router.replace("/sync") }]);
  }

  return <Screen><View style={styles.topBar}><SecondaryButton label={t("common.back")} onPress={() => router.back()} /><Text style={styles.wordmark}>{t("mobile.record")}</Text><View style={{ width: 74 }} /></View><ScrollView contentContainerStyle={[styles.page, { paddingTop: 0 }]} keyboardShouldPersistTaps="handled"><View style={styles.hero}><Kicker>{project.projectName}</Kicker><Text style={styles.heroTitle}>{form.name}</Text><Text style={styles.heroText}>{t("steps.progress", { current: currentIndex + 1, total: steps.length })} · {currentStep.label}</Text></View><Card><View style={styles.row}><Kicker>{t("steps.title")}</Kicker><Text style={styles.statusText}>{t("steps.progress", { current: currentIndex + 1, total: steps.length })}</Text></View><View style={{ flexDirection: "row", gap: 6, marginTop: 12 }}>{steps.map((step, index) => <View key={step.id} style={{ height: 5, flex: 1, borderRadius: 999, backgroundColor: index <= currentIndex ? "#137A9A" : "#D8E5E8" }} />)}</View></Card>{currentStep.kind === "biometrics" ? <Card><Kicker>{t("steps.biometrics")}</Kicker><Text style={[styles.body, { marginTop: 8, marginBottom: 14 }]}>{t("steps.biometricDescription")}</Text><Text style={[styles.body, { marginBottom: 14 }]}>{t("mobile.captureDescription", { threshold: project.nfiqThreshold })}</Text><View style={{ gap: 8 }}>{project.requiredFingers.map(finger => { const done = capturedFingers.has(finger); return <Pressable key={finger} accessibilityRole="button" accessibilityLabel={t("mobile.capture", { finger })} onPress={() => !done && addAttachment("fingerprint", undefined, finger)} style={[styles.option, done && styles.optionSelected]}><Text style={styles.optionText}>{done ? t("mobile.captureReady", { finger }) : t("mobile.capture", { finger })}</Text></Pressable>; })}</View></Card> : <Card><Kicker>{currentStep.label}</Kicker><View style={{ gap: 18, marginTop: 16 }}>{currentFields.map(field => <FieldInput key={field.id} field={field} value={answers[field.id] ?? ""} onChange={value => updateAnswer(field.id, value)} attachment={attachments.find(item => answers[field.id] === item.minioPath)} onAttach={() => addAttachment("photo", field.id)} />)}</View></Card>}{!currentStepValid ? <Text style={styles.danger}>{t("steps.completeStep")}</Text> : <Text style={styles.success}>{t("steps.draftSaved")}</Text>}<View style={{ flexDirection: "row", gap: 12 }}><View style={{ flex: 1 }}>{currentIndex > 0 ? <SecondaryButton label={t("steps.previous")} onPress={previous} /> : null}</View><View style={{ flex: 1 }}><PrimaryButton label={isLastStep ? t("steps.finalize") : t("steps.next")} disabled={isLastStep ? !canSave : !currentStepValid} onPress={() => { if (isLastStep) void save(); else next(); }} /></View></View></ScrollView></Screen>;
}
