import { router } from "expo-router";
import { Alert, FlatList, Text, View } from "react-native";
import { useState } from "react";
import { useMobile } from "../src/mobile-context";
import { Card, Kicker, PrimaryButton, Screen, SecondaryButton, styles } from "../src/ui";

export default function SyncScreen() {
  const { state, error, pull, push } = useMobile();
  const [busy, setBusy] = useState<"pull" | "push" | null>(null);
  async function run(type: "pull" | "push") { setBusy(type); await (type === "pull" ? pull() : push()); setBusy(null); }
  return <Screen><View style={styles.topBar}><SecondaryButton label="Retour" onPress={() => router.back()} /><Text style={styles.wordmark}>Synchronisation</Text><View style={{ width: 74 }} /></View><FlatList contentContainerStyle={[styles.page, { paddingTop: 0 }]} data={state.queue} keyExtractor={item => item.id} ListHeaderComponent={<><View style={styles.hero}><Kicker>File de transmission</Kicker><Text style={styles.heroTitle}>{state.queue.length} dossier(s) local(aux)</Text><Text style={styles.heroText}>Les dossiers restent sur l’appareil jusqu’à confirmation du serveur.</Text></View>{error ? <Card><Text style={styles.danger}>{error}</Text></Card> : null}<Card><Kicker>Actions réseau</Kicker><View style={{ gap: 10, marginTop: 14 }}><PrimaryButton label={busy === "push" ? "Envoi en cours…" : "Envoyer les dossiers"} disabled={busy !== null || state.queue.length === 0} onPress={() => void run("push")} /><SecondaryButton label={busy === "pull" ? "Téléchargement…" : "Télécharger les formulaires"} disabled={busy !== null} onPress={() => void run("pull")} /></View></Card><Text style={styles.sectionTitle}>Dossiers en attente</Text></>} ListEmptyComponent={<Card><View style={styles.empty}><Text style={styles.sectionTitle}>La file est vide</Text><Text style={[styles.body, { textAlign: "center" }]}>Les dossiers enregistrés depuis la collecte apparaîtront ici avant leur envoi.</Text></View></Card>} renderItem={({ item }) => <Card><Kicker>{item.status}</Kicker><Text style={[styles.sectionTitle, { marginTop: 7 }]}>Dossier {item.id.slice(-6).toUpperCase()}</Text><Text style={[styles.body, { marginTop: 5 }]}>{item.attachments.length} pièce(s) jointe(s) · {item.retryCount ? `${item.retryCount} nouvelle(s) tentative(s)` : "prêt à envoyer"}</Text></Card>} ItemSeparatorComponent={() => <View style={{ height: 12 }} />} /></Screen>;
}
