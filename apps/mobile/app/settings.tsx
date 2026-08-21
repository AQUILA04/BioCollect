import { router } from "expo-router";
import { Alert, ScrollView, Text, View } from "react-native";
import { useMobile } from "../src/mobile-context";
import { Card, Kicker, Screen, SecondaryButton, styles } from "../src/ui";

export default function SettingsScreen() {
  const { state, signOut } = useMobile();
  async function leave() { await signOut(); router.replace("/"); }
  return <Screen><View style={styles.topBar}><SecondaryButton label="Retour" onPress={() => router.back()} /><Text style={styles.wordmark}>Session</Text><View style={{ width: 74 }} /></View><ScrollView contentContainerStyle={[styles.page, { paddingTop: 0 }]}><Card><Kicker>Agent connecté</Kicker><Text style={[styles.title, { marginTop: 8 }]}>{state.session?.agentName ?? "—"}</Text><Text style={[styles.body, { marginTop: 7 }]}>Tenant : {state.session?.tenantId ?? "—"}</Text></Card><Card><Kicker>Stockage local</Kicker><Text style={[styles.body, { marginTop: 8 }]}>Cette session conserve {state.projects.length} projet(s) et {state.queue.length} dossier(s) sur l’appareil jusqu’à leur synchronisation.</Text></Card><SecondaryButton label="Se déconnecter de cet appareil" onPress={() => Alert.alert("Déconnexion", "La session sera supprimée de cet appareil. Les données locales restent présentes pour reprise contrôlée.", [{ text: "Annuler", style: "cancel" }, { text: "Se déconnecter", style: "destructive", onPress: () => void leave() }])} /></ScrollView></Screen>;
}
