import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MobileProvider } from "../src/mobile-context";
import { I18nProvider } from "../src/i18n-context";

export default function RootLayout() {
  return <I18nProvider><MobileProvider><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, animation: "fade" }} /></MobileProvider></I18nProvider>;
}
