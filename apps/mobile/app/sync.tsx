import { router } from "expo-router";
import { Alert, FlatList, Text, View } from "react-native";
import { useState } from "react";
import { useMobile } from "../src/mobile-context";
import { useI18n } from "../src/i18n-context";
import { Card, Kicker, PrimaryButton, Screen, SecondaryButton, styles } from "../src/ui";

export default function SyncScreen() {
  const { state, error, pull, push } = useMobile();
  const { t } = useI18n();
  const [busy, setBusy] = useState<"pull" | "push" | null>(null);
  async function run(type: "pull" | "push") { setBusy(type); await (type === "pull" ? pull() : push()); setBusy(null); }
  return <Screen><View style={styles.topBar}><SecondaryButton label={t("common.back")} onPress={() => router.back()} /><Text style={styles.wordmark}>{t("mobile.sync")}</Text><View style={{ width: 74 }} /></View><FlatList contentContainerStyle={[styles.page, { paddingTop: 0 }]} data={state.queue} keyExtractor={item => item.id} ListHeaderComponent={<><View style={styles.hero}><Kicker>{t("mobile.syncQueue")}</Kicker><Text style={styles.heroTitle}>{t("mobile.localRecords", { count: state.queue.length })}</Text><Text style={styles.heroText}>{t("mobile.queueDescription")}</Text></View>{error ? <Card><Text style={styles.danger}>{error}</Text></Card> : null}<Card><Kicker>{t("mobile.networkActions")}</Kicker><View style={{ gap: 10, marginTop: 14 }}><PrimaryButton label={busy === "push" ? t("mobile.syncing") : t("mobile.sendRecords")} disabled={busy !== null || state.queue.length === 0} onPress={() => void run("push")} /><SecondaryButton label={busy === "pull" ? t("mobile.downloading") : t("mobile.downloadForms")} disabled={busy !== null} onPress={() => void run("pull")} /></View></Card><Text style={styles.sectionTitle}>{t("mobile.pendingRecords")}</Text></>} ListEmptyComponent={<Card><View style={styles.empty}><Text style={styles.sectionTitle}>{t("mobile.queueEmpty")}</Text><Text style={[styles.body, { textAlign: "center" }]}>{t("mobile.queueEmptyDescription")}</Text></View></Card>} renderItem={({ item }) => <Card><Kicker>{item.status}</Kicker><Text style={[styles.sectionTitle, { marginTop: 7 }]}>{t("mobile.record")} {item.id.slice(-6).toUpperCase()}</Text><Text style={[styles.body, { marginTop: 5 }]}>{t("mobile.attachments", { count: item.attachments.length })} · {item.retryCount ? t("mobile.retries", { count: item.retryCount }) : t("mobile.readyToSend")}</Text></Card>} ItemSeparatorComponent={() => <View style={{ height: 12 }} />} /></Screen>;
}
