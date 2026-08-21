import { describe, expect, it } from "vitest";
import { changeHierarchyAnswer, isHierarchyComplete, optionsForHierarchyLevel } from "./hierarchy";

const definition = {
  selectionTypeId: "geo", key: "geolocation", name: "Géolocalisation",
  levels: [{ id: "region", label: "Région", order: 0 }, { id: "prefecture", label: "Préfecture", order: 1 }, { id: "commune", label: "Commune", order: 2 }],
  nodes: [{ id: "r-maritime", levelId: "region", value: "MAR", label: "Maritime" }, { id: "p-golfe", levelId: "prefecture", value: "GOL", label: "Golfe", parentNodeId: "r-maritime" }, { id: "c-lome", levelId: "commune", value: "LOM", label: "Lomé", parentNodeId: "p-golfe" }],
};

describe("sélection hiérarchique", () => {
  it("filtre chaque niveau par le nœud choisi au niveau précédent", () => {
    expect(optionsForHierarchyLevel(definition, "region").map(node => node.id)).toEqual(["r-maritime"]);
    expect(optionsForHierarchyLevel(definition, "prefecture", "r-maritime").map(node => node.id)).toEqual(["p-golfe"]);
  });

  it("efface les descendants lors de la modification d’un niveau supérieur et exige tous les niveaux", () => {
    let answer = changeHierarchyAnswer(definition, null, "region", "r-maritime");
    answer = changeHierarchyAnswer(definition, answer, "prefecture", "p-golfe");
    answer = changeHierarchyAnswer(definition, answer, "commune", "c-lome");
    expect(isHierarchyComplete(definition, JSON.stringify(answer))).toBe(true);
    expect(changeHierarchyAnswer(definition, answer, "region", "r-maritime").selections).toEqual({ region: "r-maritime" });
  });
});
