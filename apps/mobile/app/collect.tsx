import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useMemo, useState } from "react";
import type { BiometricAttachment, FormField } from "../src/domain";
import { useI18n } from "../src/i18n-context";
import { useMobile } from "../src/mobile-context";
import { Card, colors, Kicker, PrimaryButton, Screen, SecondaryButton, styles } from "../src/ui";

function FieldInput({ field, value, onChange, attachment, onAttach }: { field: FormField; value: string; onChange: (value: string) => void; attachment?: BiometricAttachment; onAttach: () => void }) {
  const { t } = useI18n();
  if (field.type === "multiple choice") return <View style={{ gap: 8 }}><Text style={styles.label}>{field.label}{field.required ? " *" : ""}</Text><View style={{ gap: 8 }}>{field.options?.map(option => <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: value === option }} onPress={() => onChange(option)} style={[styles.option, value === option && styles.optionSelected]}><Text style={styles.optionText}>{option}</Text></Pressable>)}</View></View>;
  if (field.type === "photo") return <View style={{ gap: 8 }}><Text style={styles.label}>{field.label}{field.required ? " *" : ""}</Text><SecondaryButton label={attachment ? t("mobile.attachedCapture") : t("mobile.addCapture")} onPress={onAttach} /><Text style={styles.body}>{attachment ? attachment.minioPath : t("mobile.simulatedCaptureDescription")}</Text></View>;
  return <View style={{ gap: 8 }}><Text style={styles.label}>{field.label}{field.required ? " *" : ""}</Text><TextInput value={value} onChangeText={onChange} placeholder={field.type === "date" ? t("mobile.datePlaceholder") : t("mobile.responsePlaceholder")} placeholderTextColor="#8A98A8" style={styles.input} /></View>;
}

export default function CollectScreen() {
  const { projectId, formId } = useLocalSearchParams<{ projectId: string; formId: string }>();
  const { state, createSimulatedAttachment, queueSubmission } = useMobile();
  const { t } = useI18n();
  const project = state.projects.find(item => item.projectId === projectId);
  const form = project?.forms.find(item => item.id === formId);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<BiometricAttachment[]>([]);
  const capturedFingers = useMemo(() => new Set(project?.requiredFingers.filter(finger => attachments.some(item => item.type === "fingerprint" && item.minioPath.includes(`fingerprint_${finger}_`))) ?? []), [attachments, project?.requiredFingers]);
  if (!project || !form) return <Screen><View style={styles.page}><Text style={styles.title}>{t("mobile.formUnavailable")}</Text><Text style={styles.body}>{t("mobile.formUnavailableDescription")}</Text><SecondaryButton label={t("common.back")} onPress={() => router.replace("/projects")} /></View></Screen>;
  function addAttachment(type: BiometricAttachment["type"], fieldId?: string, reference?: string) { if (!project) return; const attachment = createSimulatedAttachment(project.projectId, type, reference); setAttachments(current => [...current, attachment]); if (fieldId) setAnswers(current => ({ ...current, [fieldId]: attachment.minioPath })); }
  async function save() {
    if (!project || !form) return;
    const missing = form.fields.find(field => field.required && !answers[field.id]);
    if (missing) return Alert.alert(t("common.requiredField"), t("mobile.requiredFieldDescription", { field: missing.label }));
    if (capturedFingers.size < project.requiredFingers.length) return Alert.alert(t("mobile.fingerprintsRequired"), t("mobile.fingerprintsRequiredDescription", { count: project.requiredFingers.length }));
    await queueSubmission({ projectId: project.projectId, formId: form.id, data: answers, attachments });
    Alert.alert(t("mobile.recordSaved"), t("mobile.recordSavedDescription"), [{ text: t("mobile.viewQueue"), onPress: () => router.replace("/sync") }]);
  }
  return <Screen><View style={styles.topBar}><SecondaryButton label={t("common.back")} onPress={() => router.back()} /><Text style={styles.wordmark}>{t("mobile.record")}</Text><View style={{ width: 74 }} /></View><ScrollView contentContainerStyle={[styles.page, { paddingTop: 0 }]} keyboardShouldPersistTaps="handled"><View style={styles.hero}><Kicker>{project.projectName}</Kicker><Text style={styles.heroTitle}>{form.name}</Text><Text style={styles.heroText}>{t("mobile.secureLocalRecord")}</Text></View><Card><Kicker>{t("mobile.requiredCaptures")}</Kicker><Text style={[styles.body, { marginTop: 8, marginBottom: 14 }]}>{t("mobile.captureDescription", { threshold: project.nfiqThreshold })}</Text><View style={{ gap: 8 }}>{project.requiredFingers.map(finger => { const done = capturedFingers.has(finger); return <Pressable key={finger} accessibilityRole="button" accessibilityLabel={t("mobile.capture", { finger })} onPress={() => !done && addAttachment("fingerprint", undefined, finger)} style={[styles.option, done && styles.optionSelected]}><Text style={styles.optionText}>{done ? t("mobile.captureReady", { finger }) : t("mobile.capture", { finger })}</Text></Pressable>; })}</View></Card><Card><Kicker>{t("mobile.enrollmentData")}</Kicker><View style={{ gap: 18, marginTop: 16 }}>{form.fields.map(field => <FieldInput key={field.id} field={field} value={answers[field.id] ?? ""} onChange={value => setAnswers(current => ({ ...current, [field.id]: value }))} attachment={attachments.find(item => answers[field.id] === item.minioPath)} onAttach={() => addAttachment("photo", field.id)} />)}</View></Card><PrimaryButton label={t("mobile.queueRecord")} onPress={() => void save()} /></ScrollView></Screen>;
}
