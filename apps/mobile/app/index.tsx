import { router } from "expo-router";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { useState } from "react";
import { useMobile } from "../src/mobile-context";
import { Card, colors, Field, Kicker, PrimaryButton, Screen, SecondaryButton, styles } from "../src/ui";

function Activation() {
  const { activate } = useMobile();
  const [agentName, setAgentName] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [token, setToken] = useState("");
  async function continueOffline() {
    if (!agentName.trim() || !tenantId.trim() || !token.trim()) return Alert.alert("Informations requises", "Renseignez votre nom, votre tenant et votre jeton d’accès.");
    await activate({ agentName: agentName.trim(), tenantId: tenantId.trim(), accessToken: token.trim() });
  }
  return <Screen><ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled"><View style={styles.hero}><Kicker>BioCollect Terrain</Kicker><Text style={styles.heroTitle}>Collectez hors connexion, synchronisez avec contrôle.</Text><Text style={styles.heroText}>Activez l’application avec les identifiants fournis par votre superviseur. Les formulaires et les dossiers restent disponibles localement.</Text></View><Card><Kicker>Activation agent</Kicker><Text style={[styles.sectionTitle, { marginTop: 8 }]}>Connecter votre espace de collecte</Text><View style={{ gap: 15, marginTop: 18 }}><Field label="Nom de l’agent" value={agentName} onChangeText={setAgentName} autoCapitalize="words" placeholder="Ex. Marie N." /><Field label="Identifiant du tenant" value={tenantId} onChangeText={setTenantId} autoCapitalize="none" placeholder="Ex. association-sante" /><Field label="Jeton d’accès terrain" value={token} onChangeText={setToken} autoCapitalize="none" secureTextEntry placeholder="Jeton fourni par le superviseur" /><PrimaryButton label="Activer mon espace terrain" onPress={() => void continueOffline()} /></View></Card><Text style={styles.body}>Une URL API est également nécessaire pour télécharger et envoyer les dossiers. Elle est configurée par le déploiement via <Text style={{ fontWeight: "700" }}>EXPO_PUBLIC_BIOCOLLECT_API_URL</Text>.</Text></ScrollView></Screen>;
}

function AgentHome() {
  const { state, pull, push, error } = useMobile();
  const [busy, setBusy] = useState<"pull" | "push" | null>(null);
  async function sync(type: "pull" | "push") { setBusy(type); await (type === "pull" ? pull() : push()); setBusy(null); }
  const formCount = state.projects.reduce((total, project) => total + project.forms.length, 0);
  return <Screen><ScrollView contentContainerStyle={styles.page}><View style={styles.topBar}><Text style={styles.wordmark}>BioCollect Terrain</Text><View style={styles.status}><View style={{ width: 7, height: 7, borderRadius: 7, backgroundColor: colors.success }} /><Text style={styles.statusText}>Espace actif</Text></View></View><View style={styles.hero}><Kicker>Agent Enquêteur</Kicker><Text style={styles.heroTitle}>Bonjour, {state.session?.agentName}</Text><Text style={styles.heroText}>{formCount ? `${formCount} formulaire(s) disponible(s) hors connexion.` : "Téléchargez les formulaires affectés à votre espace."}</Text></View>{error ? <Card><Text style={styles.danger}>{error}</Text></Card> : null}<View style={{ flexDirection: "row", gap: 12 }}><View style={styles.actionTile}><Text style={styles.actionTitle}>Formulaires</Text><Text style={styles.actionMeta}>{formCount} disponibles localement</Text><View style={{ marginTop: "auto" }}><SecondaryButton label="Collecter" onPress={() => router.push("/projects")} /></View></View><View style={styles.actionTile}><Text style={styles.actionTitle}>File locale</Text><Text style={styles.actionMeta}>{state.queue.length} dossier(s) à envoyer</Text><View style={{ marginTop: "auto" }}><SecondaryButton label="Synchroniser" onPress={() => router.push("/sync")} /></View></View></View><Card><Kicker>Connectivité</Kicker><Text style={[styles.sectionTitle, { marginTop: 8 }]}>Mettre à jour les formulaires</Text><Text style={[styles.body, { marginTop: 6, marginBottom: 16 }]}>Le téléchargement ne modifie jamais les dossiers déjà enregistrés sur l’appareil.</Text><PrimaryButton label={busy === "pull" ? "Téléchargement…" : "Télécharger les formulaires"} disabled={busy !== null} onPress={() => void sync("pull")} /><View style={{ height: 10 }} /><SecondaryButton label={busy === "push" ? "Synchronisation…" : "Envoyer la file locale"} disabled={busy !== null || state.queue.length === 0} onPress={() => void sync("push")} /></Card><SecondaryButton label="Paramètres de session" onPress={() => router.push("/settings")} /></ScrollView></Screen>;
}

export default function Index() {
  const { ready, state } = useMobile();
  if (!ready) return <Screen><View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.blue} /><Text style={[styles.body, { marginTop: 12 }]}>Préparation de l’espace terrain…</Text></View></Screen>;
  return state.session ? <AgentHome /> : <Activation />;
}
