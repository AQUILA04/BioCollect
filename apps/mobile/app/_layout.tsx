import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MobileProvider } from "../src/mobile-context";

export default function RootLayout() {
  return <MobileProvider><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, animation: "fade" }} /></MobileProvider>;
}
