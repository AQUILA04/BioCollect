import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useMemo, useState } from "react";
import type { BiometricAttachment, FormField } from "../src/domain";
import { useMobile } from "../src/mobile-context";
import { Card, colors, Kicker, PrimaryButton, Screen, SecondaryButton, styles } from "../src/ui";

function FieldInput({ field, value, onChange, attachment, onAttach }: { field: FormField; value: string; onChange: (value: string) => void; attachment?: BiometricAttachment; onAttach: () => void }) {
  if (field.type === "multiple choice") return <View style={{ gap: 8 }}><Text style={styles.label}>{field.label}{field.required ? " *" : ""}</Text><View style={{ gap: 8 }}>{field.options?.map(option => <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: value === option }} onPress={() => onChange(option)} style={[styles.option, value === option && styles.optionSelected]}><Text style={styles.optionText}>{option}</Text></Pressable>)}</View></View>;
  if (field.type === "photo") return <View style={{ gap: 8 }}><Text style={styles.label}>{field.label}{field.required ? " *" : ""}</Text><SecondaryButton label={attachment ? "Capture jointe" : "Ajouter une capture simulée"} onPress={onAttach} /><Text style={styles.body}>{attachment ? attachment.minioPath : "La capture est référencée sous forme de chemin MinIO avant envoi."}</Text></View>;
  return <View style={{ gap: 8 }}><Text style={styles.label}>{field.label}{field.required ? " *" : ""}</Text><TextInput value={value} onChangeText={onChange} placeholder={field.type === "date" ? "JJ/MM/AAAA" : "Saisir une réponse"} placeholderTextColor="#8A98A8" style={styles.input} /></View>;
}

export default function CollectScreen() {
  const { projectId, formId } = useLocalSearchParams<{ projectId: string; formId: string }>();
  const { state, createSimulatedAttachment, queueSubmission } = useMobile();
  const project = state.projects.find(item => item.projectId === projectId);
  const form = project?.forms.find(item => item.id === formId);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<BiometricAttachment[]>([]);
  const capturedFingers = useMemo(() => new Set(project?.requiredFingers.filter(finger => attachments.some(item => item.type === "fingerprint" && item.minioPath.includes(`fingerprint_${finger}_`))) ?? []), [attachments, project?.requiredFingers]);
  if (!project || !form) return <Screen><View style={styles.page}><Text style={styles.title}>Formulaire indisponible</Text><Text style={styles.body}>Téléchargez à nouveau les formulaires depuis l’accueil.</Text><SecondaryButton label="Retour" onPress={() => router.replace("/projects")} /></View></Screen>;
  function addAttachment(type: BiometricAttachment["type"], fieldId?: string, reference?: string) { if (!project) return; const attachment = createSimulatedAttachment(project.projectId, type, reference); setAttachments(current => [...current, attachment]); if (fieldId) setAnswers(current => ({ ...current, [fieldId]: attachment.minioPath })); }
  async function save() {
    if (!project || !form) return;
    const missing = form.fields.find(field => field.required && !answers[field.id]);
    if (missing) return Alert.alert("Champ requis", `Complétez « ${missing.label} » avant d’enregistrer.`);
    if (capturedFingers.size < project.requiredFingers.length) return Alert.alert("Empreintes requises", `Capturez les ${project.requiredFingers.length} empreintes attendues avant d’enregistrer.`);
    await queueSubmission({ projectId: project.projectId, formId: form.id, data: answers, attachments });
    Alert.alert("Dossier enregistré", "Le dossier est placé dans la file locale et sera envoyé à la prochaine synchronisation.", [{ text: "Voir la file", onPress: () => router.replace("/sync") }]);
  }
  return <Screen><View style={styles.topBar}><SecondaryButton label="Retour" onPress={() => router.back()} /><Text style={styles.wordmark}>Dossier</Text><View style={{ width: 74 }} /></View><ScrollView contentContainerStyle={[styles.page, { paddingTop: 0 }]} keyboardShouldPersistTaps="handled"><View style={styles.hero}><Kicker>{project.projectName}</Kicker><Text style={styles.heroTitle}>{form.name}</Text><Text style={styles.heroText}>Enregistrement local sécurisé. Les contrôles biométriques sont appliqués avant la mise en file.</Text></View><Card><Kicker>Captures obligatoires</Kicker><Text style={[styles.body, { marginTop: 8, marginBottom: 14 }]}>NFIQ maximal {project.nfiqThreshold}. Les captures sont simulées dans ce MVP puis référencées par chemin MinIO.</Text><View style={{ gap: 8 }}>{project.requiredFingers.map(finger => { const done = capturedFingers.has(finger); return <Pressable key={finger} accessibilityRole="button" accessibilityLabel={`Capturer ${finger}`} onPress={() => !done && addAttachment("fingerprint", undefined, finger)} style={[styles.option, done && styles.optionSelected]}><Text style={styles.optionText}>{done ? "Capture prête · " : "Capturer · "}{finger}</Text></Pressable>; })}</View></Card><Card><Kicker>Données d’enrôlement</Kicker><View style={{ gap: 18, marginTop: 16 }}>{form.fields.map(field => <FieldInput key={field.id} field={field} value={answers[field.id] ?? ""} onChange={value => setAnswers(current => ({ ...current, [field.id]: value }))} attachment={attachments.find(item => answers[field.id] === item.minioPath)} onAttach={() => addAttachment("photo", field.id)} />)}</View></Card><PrimaryButton label="Enregistrer dans la file locale" onPress={() => void save()} /></ScrollView></Screen>;
}
