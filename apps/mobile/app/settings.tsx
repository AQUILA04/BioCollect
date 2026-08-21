import { router } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useMobile } from "../src/mobile-context";
import { useI18n } from "../src/i18n-context";
import { Card, Kicker, Screen, SecondaryButton, styles } from "../src/ui";

export default function SettingsScreen() {
  const { state, signOut } = useMobile();
  const { t, locale, locales, setLocale } = useI18n();
  async function leave() { await signOut(); router.replace("/"); }
  return <Screen><View style={styles.topBar}><SecondaryButton label={t("common.back")} onPress={() => router.back()} /><Text style={styles.wordmark}>{t("mobile.session")}</Text><View style={{ width: 74 }} /></View><ScrollView contentContainerStyle={[styles.page, { paddingTop: 0 }]}><Card><Kicker>{t("mobile.connectedAgent")}</Kicker><Text style={[styles.title, { marginTop: 8 }]}>{state.session?.agentName ?? "—"}</Text><Text style={[styles.body, { marginTop: 7 }]}>{t("mobile.tenant", { id: state.session?.tenantId ?? "—" })}</Text></Card><Card><Kicker>{t("common.language")}</Kicker><View style={{ gap: 8, marginTop: 12 }}>{locales.map(option => <Pressable key={option.code} accessibilityRole="radio" accessibilityState={{ checked: option.code === locale }} onPress={() => void setLocale(option.code)} style={[styles.option, option.code === locale && styles.optionSelected]}><Text style={styles.optionText}>{option.label}</Text></Pressable>)}</View></Card><Card><Kicker>{t("mobile.storage")}</Kicker><Text style={[styles.body, { marginTop: 8 }]}>{t("mobile.storageDescription", { projects: state.projects.length, records: state.queue.length })}</Text></Card><SecondaryButton label={t("mobile.signOutDevice")} onPress={() => Alert.alert(t("common.signOut"), t("mobile.signOutDescription"), [{ text: t("common.cancel"), style: "cancel" }, { text: t("auth.signOut"), style: "destructive", onPress: () => void leave() }])} /></ScrollView></Screen>;
}
