import * as React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { OfflineState } from "../src/domain";
import { MobileProvider } from "../src/mobile-context";
import { OfflineStore, type KeyValueStore } from "../src/offline-store";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("expo-router", () => ({ router: { back: vi.fn(), replace: vi.fn() }, useLocalSearchParams: () => ({ projectId: "project-1", formId: "form-1" }) }));
vi.mock("expo-constants", () => ({ default: { expoConfig: { extra: {} } } }));
vi.mock("@react-native-async-storage/async-storage", () => ({ default: { getItem: vi.fn(), setItem: vi.fn() } }));
vi.mock("react-native", async () => {
  const react = await import("react"); const host = (name: string) => ({ children, ...props }: any) => react.createElement(name, props, children);
  return { Alert: { alert: vi.fn() }, Pressable: host("Pressable"), ScrollView: host("ScrollView"), Text: host("Text"), TextInput: host("TextInput"), View: host("View") };
});
vi.mock("../src/ui", async () => {
  const react = await import("react"); const host = (name: string) => ({ children, ...props }: any) => react.createElement(name, props, children);
  return { Card: host("Card"), Kicker: host("Kicker"), Screen: host("Screen"), styles: {}, PrimaryButton: ({ label, onPress, disabled }: any) => react.createElement("Pressable", { accessibilityLabel: label, onPress, disabled }), SecondaryButton: ({ label, onPress, disabled }: any) => react.createElement("Pressable", { accessibilityLabel: label, onPress, disabled }) };
});
vi.mock("../src/i18n-context", () => ({ useI18n: () => ({ t: (key: string, values: Record<string, string | number> = {}) => ({ "common.back": "Back", "common.requiredInformation": "Required", "mobile.formUnavailable": "Unavailable", "mobile.formUnavailableDescription": "Unavailable", "mobile.record": "Record", "mobile.attachedCapture": "Attached", "mobile.addCapture": "Add capture", "mobile.simulatedCaptureDescription": "Capture", "mobile.datePlaceholder": "Date", "mobile.responsePlaceholder": "Response", "mobile.recordSaved": "Saved", "mobile.recordSavedDescription": "Saved", "mobile.viewQueue": "Queue", "steps.progress": `Step ${values.current} of ${values.total}`, "steps.completeStep": "Complete", "steps.draftSaved": "Draft saved", "steps.previous": "Previous", "steps.next": "Next", "steps.finalize": "Save record", "steps.title": "Steps", "steps.biometrics": "Biometrics", "steps.biometricDescription": "Biometrics", "mobile.capture": "Capture", "mobile.captureReady": "Ready", "mobile.captureDescription": "Capture", "mobile.apiUrlRequired": "URL", "mobile.downloadFailed": "Download", "mobile.synchronizationFailed": "Sync" } as Record<string, string>)[key] ?? key }) }));

import CollectScreen from "../app/collect";

class MemoryStore implements KeyValueStore {
  value: string | null = null;
  async getItem() { return this.value; }
  async setItem(_key: string, value: string) { this.value = value; }
}

const state = (currentStepId: string, data: Record<string, string>): OfflineState => ({
  session: { tenantId: "tenant-1", accessToken: "token", agentName: "Awa" }, queue: [],
  projects: [{ projectId: "project-1", projectName: "Pilot", requiredFingers: [], nfiqThreshold: 3, matchingThreshold: 85, downloadedAt: 1, forms: [{ id: "form-1", name: "Survey", fields: [{ id: "name", label: "Name", type: "text", required: true }, { id: "income", label: "Income", type: "text", required: true }], steps: [{ id: "demographics", label: "Demographics", order: 0, kind: "fields", fieldIds: ["name"] }, { id: "socio", label: "Socioeconomics", order: 1, kind: "fields", fieldIds: ["income"] }] }] }],
  drafts: [{ id: "draft-1", tenantId: "tenant-1", projectId: "project-1", formId: "form-1", currentStepId, data, attachments: [], updatedAt: 1 }],
});

const PressableHost = "Pressable" as unknown as React.ElementType;
const TextInputHost = "TextInput" as unknown as React.ElementType;
function button(root: TestRenderer.ReactTestInstance, label: string) { return root.findAllByType(PressableHost).find(item => item.props.accessibilityLabel === label); }

describe("CollectScreen avec MobileProvider", () => {
  it("reprend un brouillon persistant directement sur son étape non initiale", async () => {
    const storage = new OfflineStore(new MemoryStore());
    await storage.write(state("socio", { name: "Awa", income: "120" }));
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<MobileProvider offlineStore={storage}><CollectScreen /></MobileProvider>); await Promise.resolve(); });
    expect(button(renderer.root, "Next")).toBeUndefined();
    expect(button(renderer.root, "Save record")?.props.disabled).toBe(false);
  });

  it("réhydrate un brouillon sur son étape mémorisée, bloque la mise en file intermédiaire puis supprime le brouillon après la dernière étape", async () => {
    const storage = new OfflineStore(new MemoryStore());
    await storage.write(state("demographics", { name: "Awa" }));
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<MobileProvider offlineStore={storage}><CollectScreen /></MobileProvider>); await Promise.resolve(); });
    expect(button(renderer.root, "Next")?.props.disabled).toBe(false);
    expect((await storage.read()).queue).toHaveLength(0);
    await act(async () => { button(renderer.root, "Next")?.props.onPress(); await Promise.resolve(); });
    expect(button(renderer.root, "Save record")?.props.disabled).toBe(true);
    expect((await storage.read()).queue).toHaveLength(0);
    await act(async () => { renderer.root.findByType(TextInputHost).props.onChangeText("120"); });
    const finalButton = button(renderer.root, "Save record");
    expect(finalButton?.props.disabled).toBe(false);
    await act(async () => { await finalButton?.props.onPress(); });
    const persisted = await storage.read();
    expect(persisted.queue).toHaveLength(1);
    expect(persisted.drafts).toEqual([]);
  });
});
