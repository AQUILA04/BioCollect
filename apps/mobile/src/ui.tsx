import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export const colors = {
  navy: "#082541",
  blue: "#137A9A",
  blueSoft: "#E8F5F7",
  background: "#F4F8F9",
  surface: "#FFFFFF",
  text: "#10223B",
  muted: "#5F6F82",
  border: "#D8E5E8",
  success: "#0F7A5A",
  warning: "#A16207",
  danger: "#B42318",
};

export function Screen({ children }: { children: ReactNode }) {
  return <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>{children}</SafeAreaView>;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Kicker({ children }: { children: ReactNode }) { return <Text style={styles.kicker}>{children}</Text>; }

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor="#8A98A8" style={styles.input} {...props} /></View>;
}

export function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.primaryButton, (pressed || disabled) && styles.buttonPressed, disabled && styles.buttonDisabled]}><Text style={styles.primaryButtonText}>{label}</Text></Pressable>;
}

export function SecondaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.secondaryButton, (pressed || disabled) && styles.buttonPressed, disabled && styles.buttonDisabled]}><Text style={styles.secondaryButtonText}>{label}</Text></Pressable>;
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  page: { flexGrow: 1, padding: 20, gap: 16 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  wordmark: { color: colors.navy, fontSize: 18, fontWeight: "800", letterSpacing: -0.4 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 18, shadowColor: colors.navy, shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  hero: { backgroundColor: colors.navy, borderRadius: 24, padding: 22, gap: 10 },
  heroTitle: { color: "#FFFFFF", fontSize: 28, lineHeight: 34, fontWeight: "800", letterSpacing: -0.6 },
  heroText: { color: "#C9E5E9", fontSize: 15, lineHeight: 22 },
  kicker: { color: colors.blue, fontSize: 11, lineHeight: 16, letterSpacing: 1.2, fontWeight: "700", textTransform: "uppercase" },
  title: { color: colors.text, fontSize: 23, lineHeight: 29, fontWeight: "800", letterSpacing: -0.4 },
  sectionTitle: { color: colors.text, fontSize: 17, lineHeight: 23, fontWeight: "700" },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  label: { color: colors.text, fontSize: 13, lineHeight: 18, fontWeight: "700" },
  field: { gap: 7 },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: "#FFFFFF", paddingHorizontal: 14, color: colors.text, fontSize: 16 },
  primaryButton: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#0D4B7A", paddingHorizontal: 18 },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  secondaryButton: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: "#FFFFFF", paddingHorizontal: 18 },
  secondaryButtonText: { color: colors.text, fontWeight: "700", fontSize: 15 },
  buttonPressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  buttonDisabled: { opacity: 0.48 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  status: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.blueSoft },
  statusText: { color: colors.blue, fontSize: 12, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#EAF0F1" },
  actionTile: { minHeight: 104, flex: 1, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: "#FFFFFF", padding: 14, gap: 6 },
  actionTitle: { color: colors.text, fontWeight: "800", fontSize: 14 },
  actionMeta: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  empty: { alignItems: "center", gap: 10, paddingVertical: 30, paddingHorizontal: 14 },
  option: { minHeight: 46, justifyContent: "center", borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13 },
  optionSelected: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  optionText: { color: colors.text, fontSize: 14, fontWeight: "600" },
  danger: { color: colors.danger, fontSize: 13, lineHeight: 19 },
  success: { color: colors.success, fontSize: 13, lineHeight: 19 },
});
