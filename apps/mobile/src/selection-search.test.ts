import { describe, expect, it } from "vitest";
import { searchSelectionOptions, shouldUseSelectionSearch } from "./selection-search";

describe("recherche de sélection", () => {
  it("n’active la recherche que pour les longues listes", () => { expect(shouldUseSelectionSearch(Array.from({ length: 12 }, (_, index) => `v${index}`))).toBe(false); expect(shouldUseSelectionSearch(Array.from({ length: 13 }, (_, index) => `v${index}`))).toBe(true); });
  it("cherche sans tenir compte des accents, priorise les préfixes et borne les résultats", () => { const options = [{ value: "lom", label: "Lomé" }, { value: "ago", label: "Agou" }, { value: "plateau", label: "Plateaux" }]; expect(searchSelectionOptions(options, "lome")).toEqual([{ value: "lom", label: "Lomé" }]); expect(searchSelectionOptions(options, "ag")).toEqual([{ value: "ago", label: "Agou" }]); expect(searchSelectionOptions(Array.from({ length: 80 }, (_, index) => ({ value: String(index), label: `Localité ${index}` })), "localité")).toHaveLength(50); });
});
