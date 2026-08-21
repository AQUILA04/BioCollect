import { router } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { useMobile } from "../src/mobile-context";
import { Card, Kicker, Screen, SecondaryButton, styles } from "../src/ui";

export default function ProjectsScreen() {
  const { state } = useMobile();
  const forms = state.projects.flatMap(project => project.forms.map(form => ({ project, form })));
  return <Screen><View style={styles.topBar}><SecondaryButton label="Retour" onPress={() => router.back()} /><Text style={styles.wordmark}>Collecte</Text><View style={{ width: 74 }} /></View><FlatList contentContainerStyle={[styles.page, { paddingTop: 0 }]} data={forms} keyExtractor={({ project, form }) => `${project.projectId}-${form.id}`} ListHeaderComponent={<><Kicker>Formulaires hors ligne</Kicker><Text style={styles.title}>Choisissez un projet de collecte</Text><Text style={[styles.body, { marginTop: 6, marginBottom: 6 }]}>Les formulaires restent disponibles tant que vous ne les supprimez pas de l’appareil.</Text></>} ListEmptyComponent={<Card><View style={styles.empty}><Text style={styles.sectionTitle}>Aucun formulaire disponible</Text><Text style={[styles.body, { textAlign: "center" }]}>Revenez à l’accueil et lancez le téléchargement depuis une connexion sécurisée.</Text></View></Card>} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Ouvrir ${item.form.name}`} onPress={() => router.push({ pathname: "/collect", params: { projectId: item.project.projectId, formId: item.form.id } })} style={({ pressed }) => [styles.card, pressed && styles.buttonPressed]}><Kicker>{item.project.projectName}</Kicker><Text style={[styles.sectionTitle, { marginTop: 7 }]}>{item.form.name}</Text><Text style={[styles.body, { marginTop: 4 }]}>{item.form.fields.length} champ(s) · NFIQ ≤ {item.project.nfiqThreshold}</Text></Pressable>} ItemSeparatorComponent={() => <View style={{ height: 12 }} />} /></Screen>;
}
