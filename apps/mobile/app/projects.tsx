import { router } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { useMobile } from "../src/mobile-context";
import { useI18n } from "../src/i18n-context";
import { Card, Kicker, Screen, SecondaryButton, styles } from "../src/ui";

export default function ProjectsScreen() {
  const { state } = useMobile();
  const { t } = useI18n();
  const forms = state.projects.flatMap(project => project.forms.map(form => ({ project, form })));
  return <Screen><View style={styles.topBar}><SecondaryButton label={t("common.back")} onPress={() => router.back()} /><Text style={styles.wordmark}>{t("mobile.collect")}</Text><View style={{ width: 74 }} /></View><FlatList contentContainerStyle={[styles.page, { paddingTop: 0 }]} data={forms} keyExtractor={({ project, form }) => `${project.projectId}-${form.id}`} ListHeaderComponent={<><Kicker>{t("mobile.formsOffline")}</Kicker><Text style={styles.title}>{t("mobile.chooseProject")}</Text><Text style={[styles.body, { marginTop: 6, marginBottom: 6 }]}>{t("mobile.formsDescription")}</Text></>} ListEmptyComponent={<Card><View style={styles.empty}><Text style={styles.sectionTitle}>{t("mobile.noForms")}</Text><Text style={[styles.body, { textAlign: "center" }]}>{t("mobile.noFormsDescription")}</Text></View></Card>} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={t("mobile.openForm", { name: item.form.name })} onPress={() => router.push({ pathname: "/collect", params: { projectId: item.project.projectId, formId: item.form.id } })} style={({ pressed }) => [styles.card, pressed && styles.buttonPressed]}><Kicker>{item.project.projectName}</Kicker><Text style={[styles.sectionTitle, { marginTop: 7 }]}>{item.form.name}</Text><Text style={[styles.body, { marginTop: 4 }]}>{item.form.fields.length} champ(s) · NFIQ ≤ {item.project.nfiqThreshold}</Text></Pressable>} ItemSeparatorComponent={() => <View style={{ height: 12 }} />} /></Screen>;
}
