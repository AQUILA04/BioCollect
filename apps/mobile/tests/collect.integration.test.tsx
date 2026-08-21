import * as React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mobile = vi.hoisted(() => ({
  value: null as any,
  queueSubmission: vi.fn(async () => undefined),
  finalizeSubmission: vi.fn(async () => undefined),
  saveDraft: vi.fn(async () => undefined),
  removeDraft: vi.fn(async () => undefined),
}));

vi.mock("expo-router", () => ({ router: { back: vi.fn(), replace: vi.fn() }, useLocalSearchParams: () => ({ projectId: "project-1", formId: "form-1" }) }));
vi.mock("react-native", async () => {
  const react = await import("react");
  const host = (name: string) => ({ children, ...props }: any) => react.createElement(name, props, children);
  return { Alert: { alert: vi.fn() }, Pressable: host("Pressable"), ScrollView: host("ScrollView"), Text: host("Text"), TextInput: host("TextInput"), View: host("View") };
});
vi.mock("../src/ui", async () => {
  const react = await import("react");
  const host = (name: string) => ({ children, ...props }: any) => react.createElement(name, props, children);
  return {
    Card: host("Card"), Kicker: host("Kicker"), Screen: host("Screen"), styles: {},
    PrimaryButton: ({ label, onPress, disabled }: any) => react.createElement("Pressable", { accessibilityLabel: label, onPress, disabled }),
    SecondaryButton: ({ label, onPress, disabled }: any) => react.createElement("Pressable", { accessibilityLabel: label, onPress, disabled }),
  };
});
vi.mock("../src/mobile-context", () => ({ useMobile: () => mobile.value }));
vi.mock("../src/i18n-context", () => ({
  useI18n: () => ({
    t: (key: string, values: Record<string, string | number> = {}) => ({
      "common.back": "Back", "common.requiredInformation": "Required", "mobile.formUnavailable": "Unavailable", "mobile.formUnavailableDescription": "Unavailable description", "mobile.record": "Record", "mobile.attachedCapture": "Attached", "mobile.addCapture": "Add capture", "mobile.simulatedCaptureDescription": "Capture", "mobile.datePlaceholder": "Date", "mobile.responsePlaceholder": "Response", "mobile.searchOptions": "Search options", "mobile.searchResults": `${values.count} results`, "mobile.recordSaved": "Saved", "mobile.recordSavedDescription": "Saved description", "mobile.viewQueue": "Queue", "steps.progress": `Step ${values.current} of ${values.total}`, "steps.completeStep": "Complete this step", "steps.draftSaved": "Draft saved", "steps.previous": "Previous", "steps.next": "Next", "steps.finalize": "Save record", "steps.title": "Steps", "steps.biometrics": "Biometrics", "steps.biometricDescription": "Biometrics", "mobile.capture": `Capture ${values.finger}`, "mobile.captureReady": `Ready ${values.finger}`, "mobile.captureDescription": "Capture",
    } as Record<string, string>)[key] ?? key,
  }),
}));

import CollectScreen from "../app/collect";

const form = {
  id: "form-1", name: "Survey", fields: [
    { id: "name", label: "Name", type: "text" as const, required: true },
    { id: "income", label: "Income", type: "text" as const, required: true },
  ],
  steps: [
    { id: "demographics", label: "Demographics", order: 0, kind: "fields" as const, fieldIds: ["name"] },
    { id: "socio", label: "Socioeconomics", order: 1, kind: "fields" as const, fieldIds: ["income"] },
  ],
};

function setup(draft?: { currentStepId: string; data: Record<string, string> }) {
  mobile.queueSubmission.mockClear(); mobile.finalizeSubmission.mockClear(); mobile.saveDraft.mockClear(); mobile.removeDraft.mockClear();
  mobile.value = {
    state: { session: { tenantId: "tenant-1", accessToken: "token", agentName: "Awa" }, queue: [], drafts: draft ? [{ id: "draft-1", tenantId: "tenant-1", projectId: "project-1", formId: "form-1", attachments: [], updatedAt: 1, ...draft }] : [], projects: [{ projectId: "project-1", projectName: "Pilot", requiredFingers: ["RIGHT_THUMB"], nfiqThreshold: 3, matchingThreshold: 85, forms: [form], downloadedAt: 1 }] },
    createSimulatedAttachment: () => ({ id: "attachment", type: "fingerprint", minioPath: "minio://capture", capturedAt: 1, fingerType: "RIGHT_THUMB", nfiqScore: 1 }),
    queueSubmission: mobile.queueSubmission, finalizeSubmission: mobile.finalizeSubmission, saveDraft: mobile.saveDraft, removeDraft: mobile.removeDraft,
  };
}

const PressableHost = "Pressable" as unknown as React.ElementType;
const TextInputHost = "TextInput" as unknown as React.ElementType;
const TextHost = "Text" as unknown as React.ElementType;
function button(root: TestRenderer.ReactTestInstance, label: string) { return root.findAllByType(PressableHost).find(item => item.props.accessibilityLabel === label); }

describe("écran de collecte multi-étapes", () => {
  beforeEach(() => setup());

  it("désactive Suivant tant que l’étape est invalide, puis permet la navigation précédente et suivante", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<CollectScreen />); });
    expect(button(renderer.root, "Next")?.props.disabled).toBe(true);
    await act(async () => { renderer.root.findByType(TextInputHost).props.onChangeText("Awa"); });
    expect(mobile.saveDraft).toHaveBeenCalledWith(expect.objectContaining({ currentStepId: "demographics", data: { name: "Awa" } }));
    expect(button(renderer.root, "Next")?.props.disabled).toBe(false);
    await act(async () => { button(renderer.root, "Next")?.props.onPress(); });
    expect(button(renderer.root, "Previous")).toBeDefined();
    await act(async () => { button(renderer.root, "Previous")?.props.onPress(); });
    expect(button(renderer.root, "Next")).toBeDefined();
  });

  it("reprend le brouillon sur la dernière étape et ne met en file qu’à son enregistrement final", async () => {
    setup({ currentStepId: "socio", data: { name: "Awa", income: "120" } });
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<CollectScreen />); });
    const finalButton = button(renderer.root, "Save record");
    expect(finalButton?.props.disabled).toBe(false);
    await act(async () => { await finalButton?.props.onPress(); });
    expect(mobile.finalizeSubmission).toHaveBeenCalledWith(expect.objectContaining({ projectId: "project-1", formId: "form-1", data: { name: "Awa", income: "120" } }));
  });

  it("affiche le libellé d’un référentiel mais conserve son code dans le brouillon", async () => {
    setup();
    mobile.value.state.projects[0].forms = [{ id: "form-1", name: "Selection", fields: [{ id: "status", label: "Consentement", type: "multiple choice", required: true, options: [{ value: "true", label: "Oui" }, { value: "false", label: "Non" }] }], steps: [{ id: "selection", label: "Choix", order: 0, kind: "fields", fieldIds: ["status"] }] }];
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<CollectScreen />); });
    expect(renderer.root.findAllByType(TextHost).some(item => item.props.children === "Oui")).toBe(true);
    const yes = renderer.root.findAllByType(PressableHost).find(item => item.props.accessibilityRole === "radio" && item.props.children?.props?.children === "Oui");
    await act(async () => { yes?.props.onPress(); });
    expect(mobile.saveDraft).toHaveBeenCalledWith(expect.objectContaining({ currentStepId: "selection", data: { status: "true" } }));
  });

  it("enchaîne les niveaux hiérarchiques, réinitialise les descendants et soumet la relation complète", async () => {
    setup();
    mobile.value.state.projects[0].forms = [{ id: "form-1", name: "Geolocation", fields: [{ id: "geo", label: "Localité", type: "hierarchical selection", required: true, selectionTypeId: "geo", hierarchicalDefinition: { selectionTypeId: "geo", key: "geolocation", name: "Geolocation", levels: [{ id: "region", label: "Region", order: 0 }, { id: "prefecture", label: "Prefecture", order: 1 }], nodes: [{ id: "r-maritime", levelId: "region", value: "MAR", label: "Maritime" }, { id: "r-plateaux", levelId: "region", value: "PLA", label: "Plateaux" }, { id: "p-golfe", levelId: "prefecture", value: "GOL", label: "Golfe", parentNodeId: "r-maritime" }, { id: "p-ogat", levelId: "prefecture", value: "OGA", label: "Ogou", parentNodeId: "r-plateaux" }] } }], steps: [{ id: "geo-step", label: "Geography", order: 0, kind: "fields", fieldIds: ["geo"] }] }];
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<CollectScreen />); });
    const radio = (label: string) => renderer.root.findAllByType(PressableHost).find(item => item.props.accessibilityRole === "radio" && item.props.children?.props?.children === label);
    expect(button(renderer.root, "Save record")?.props.disabled).toBe(true);
    await act(async () => { radio("Maritime")?.props.onPress(); });
    await act(async () => { radio("Golfe")?.props.onPress(); });
    const completeDraft = mobile.saveDraft.mock.calls.at(-1)?.[0].data.geo;
    expect(JSON.parse(completeDraft).selections).toEqual({ region: "r-maritime", prefecture: "p-golfe" });
    await act(async () => { radio("Plateaux")?.props.onPress(); });
    const resetDraft = mobile.saveDraft.mock.calls.at(-1)?.[0].data.geo;
    expect(JSON.parse(resetDraft).selections).toEqual({ region: "r-plateaux" });
    expect(button(renderer.root, "Save record")?.props.disabled).toBe(true);
    await act(async () => { radio("Ogou")?.props.onPress(); });
    await act(async () => { await button(renderer.root, "Save record")?.props.onPress(); });
    const submitted = mobile.finalizeSubmission.mock.calls.at(-1)?.[0].data.geo;
    expect(JSON.parse(submitted).selections).toEqual({ region: "r-plateaux", prefecture: "p-ogat" });
  });

  it("affiche une recherche pour une grande liste, filtre les résultats et indique l’absence de résultat", async () => {
    setup(); mobile.value.state.projects[0].forms = [{ id: "form-1", name: "Large list", fields: [{ id: "village", label: "Village", type: "multiple choice", required: true, options: Array.from({ length: 20 }, (_, index) => ({ value: `v${index}`, label: `Village ${index}` })) }], steps: [{ id: "list-step", label: "List", order: 0, kind: "fields", fieldIds: ["village"] }] }];
    let renderer!: TestRenderer.ReactTestRenderer; await act(async () => { renderer = TestRenderer.create(<CollectScreen />); }); const search = renderer.root.findByProps({ accessibilityLabel: "Search options" }); expect(search).toBeDefined(); await act(async () => { search.props.onChangeText("Village 10"); }); const matching = renderer.root.findAllByType(PressableHost).filter(item => item.props.accessibilityRole === "radio"); expect(matching).toHaveLength(1); expect(matching[0].props.children?.props?.children).toBe("Village 10"); await act(async () => { search.props.onChangeText("Inconnu"); }); expect(renderer.root.findAllByType(PressableHost).filter(item => item.props.accessibilityRole === "radio")).toHaveLength(0); expect(JSON.stringify(renderer.toJSON())).toContain("0 results");
  });

  it("efface la recherche enfant lorsqu’un parent hiérarchique est remplacé", async () => {
    setup(); const regions = [{ id: "r-maritime", levelId: "region", value: "MAR", label: "Maritime" }, { id: "r-plateaux", levelId: "region", value: "PLA", label: "Plateaux" }, ...Array.from({ length: 11 }, (_, index) => ({ id: `r-${index}`, levelId: "region", value: `R${index}`, label: `Autre ${index}` }))]; const maritimePrefectures = Array.from({ length: 13 }, (_, index) => ({ id: `m-${index}`, levelId: "prefecture", value: `M${index}`, label: `Golfe ${index}`, parentNodeId: "r-maritime" })); const plateauPrefectures = Array.from({ length: 13 }, (_, index) => ({ id: `p-${index}`, levelId: "prefecture", value: `P${index}`, label: `Plateau ${index}`, parentNodeId: "r-plateaux" })); mobile.value.state.projects[0].forms = [{ id: "form-1", name: "Search geography", fields: [{ id: "geo", label: "Localité", type: "hierarchical selection", required: true, selectionTypeId: "geo", hierarchicalDefinition: { selectionTypeId: "geo", key: "geo", name: "Geo", levels: [{ id: "region", label: "Region", order: 0 }, { id: "prefecture", label: "Prefecture", order: 1 }], nodes: [...regions, ...maritimePrefectures, ...plateauPrefectures] } }], steps: [{ id: "geo-step", label: "Geography", order: 0, kind: "fields", fieldIds: ["geo"] }] }];
    let renderer!: TestRenderer.ReactTestRenderer; await act(async () => { renderer = TestRenderer.create(<CollectScreen />); }); const radio = (label: string) => renderer.root.findAllByType(PressableHost).find(item => item.props.accessibilityRole === "radio" && item.props.children?.props?.children === label); const regionSearch = () => renderer.root.findByProps({ accessibilityLabel: "Search options Region" }); await act(async () => { regionSearch().props.onChangeText("Maritime"); }); await act(async () => { radio("Maritime")?.props.onPress(); }); const prefectureSearch = () => renderer.root.findByProps({ accessibilityLabel: "Search options Prefecture" }); await act(async () => { prefectureSearch().props.onChangeText("Golfe 12"); regionSearch().props.onChangeText("Plateaux"); }); await act(async () => { radio("Plateaux")?.props.onPress(); }); expect(prefectureSearch().props.value).toBe("");
  });
});
