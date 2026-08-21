import { router } from "expo-router";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { useState } from "react";
import { useMobile } from "../src/mobile-context";
import { useI18n } from "../src/i18n-context";
import { Card, colors, Field, Kicker, PrimaryButton, Screen, SecondaryButton, styles } from "../src/ui";

function Activation() {
  const { activate } = useMobile();
  const { t } = useI18n();
  const [agentName, setAgentName] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [token, setToken] = useState("");
  async function continueOffline() {
    if (!agentName.trim() || !tenantId.trim() || !token.trim()) return Alert.alert(t("common.requiredInformation"), t("mobile.requiredActivation"));
    await activate({ agentName: agentName.trim(), tenantId: tenantId.trim(), accessToken: token.trim() });
  }
  return <Screen><ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled"><View style={styles.hero}><Kicker>{t("mobile.product")}</Kicker><Text style={styles.heroTitle}>{t("mobile.offlineIntro")}</Text><Text style={styles.heroText}>{t("mobile.offlineDescription")}</Text></View><Card><Kicker>{t("mobile.activation")}</Kicker><Text style={[styles.sectionTitle, { marginTop: 8 }]}>{t("mobile.connectSpace")}</Text><View style={{ gap: 15, marginTop: 18 }}><Field label={t("mobile.agentName")} value={agentName} onChangeText={setAgentName} autoCapitalize="words" placeholder="Ex. Marie N." /><Field label={t("mobile.tenantId")} value={tenantId} onChangeText={setTenantId} autoCapitalize="none" placeholder="Ex. association-sante" /><Field label={t("mobile.accessToken")} value={token} onChangeText={setToken} autoCapitalize="none" secureTextEntry placeholder="Token provided by supervisor" /><PrimaryButton label={t("mobile.activate")} onPress={() => void continueOffline()} /></View></Card><Text style={styles.body}>{t("mobile.apiUrlDescription")} <Text style={{ fontWeight: "700" }}>EXPO_PUBLIC_BIOCOLLECT_API_URL</Text>.</Text></ScrollView></Screen>;
}

function AgentHome() {
  const { state, pull, push, error } = useMobile();
  const { t } = useI18n();
  const [busy, setBusy] = useState<"pull" | "push" | null>(null);
  async function sync(type: "pull" | "push") { setBusy(type); await (type === "pull" ? pull() : push()); setBusy(null); }
  const formCount = state.projects.reduce((total, project) => total + project.forms.length, 0);
  return <Screen><ScrollView contentContainerStyle={styles.page}><View style={styles.topBar}><Text style={styles.wordmark}>{t("mobile.product")}</Text><View style={styles.status}><View style={{ width: 7, height: 7, borderRadius: 7, backgroundColor: colors.success }} /><Text style={styles.statusText}>{t("mobile.activeSpace")}</Text></View></View><View style={styles.hero}><Kicker>{t("mobile.agent")}</Kicker><Text style={styles.heroTitle}>{t("mobile.greeting", { name: state.session?.agentName ?? "" })}</Text><Text style={styles.heroText}>{formCount ? t("mobile.availableOffline", { count: formCount }) : t("mobile.updateFormsDescription")}</Text></View>{error ? <Card><Text style={styles.danger}>{error}</Text></Card> : null}<View style={{ flexDirection: "row", gap: 12 }}><View style={styles.actionTile}><Text style={styles.actionTitle}>{t("mobile.projects")}</Text><Text style={styles.actionMeta}>{t("mobile.availableOffline", { count: formCount })}</Text><View style={{ marginTop: "auto" }}><SecondaryButton label={t("mobile.collect")} onPress={() => router.push("/projects")} /></View></View><View style={styles.actionTile}><Text style={styles.actionTitle}>{t("mobile.localQueue")}</Text><Text style={styles.actionMeta}>{t("mobile.queuedItems", { count: state.queue.length })}</Text><View style={{ marginTop: "auto" }}><SecondaryButton label={t("mobile.sync")} onPress={() => router.push("/sync")} /></View></View></View><Card><Kicker>{t("mobile.connectivity")}</Kicker><Text style={[styles.sectionTitle, { marginTop: 8 }]}>{t("mobile.updateForms")}</Text><Text style={[styles.body, { marginTop: 6, marginBottom: 16 }]}>{t("mobile.updateFormsDescription")}</Text><PrimaryButton label={busy === "pull" ? t("mobile.downloading") : t("mobile.downloadForms")} disabled={busy !== null} onPress={() => void sync("pull")} /><View style={{ height: 10 }} /><SecondaryButton label={busy === "push" ? t("mobile.syncing") : t("mobile.sendQueue")} disabled={busy !== null || state.queue.length === 0} onPress={() => void sync("push")} /></Card><SecondaryButton label={t("mobile.sessionSettings")} onPress={() => router.push("/settings")} /></ScrollView></Screen>;
}

export default function Index() {
  const { ready, state } = useMobile();
  const { t } = useI18n();
  if (!ready) return <Screen><View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.blue} /><Text style={[styles.body, { marginTop: 12 }]}>{t("mobile.preparingWorkspace")}</Text></View></Screen>;
  return state.session ? <AgentHome /> : <Activation />;
}
