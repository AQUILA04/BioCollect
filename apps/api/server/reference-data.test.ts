import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { normalizeSelectionOptions, parseReferenceDataFile } from "./reference-data";

describe("référentiels importés", () => {
  it("reconnaît les colonnes code et label dans un CSV", () => {
    const parsed = parseReferenceDataFile({ fileName: "statuts.csv", buffer: Buffer.from("code;label\ntrue;Oui\nfalse;Non\n") });
    expect(parsed).toMatchObject({ rowCount: 2, columns: ["code", "label"], mapping: { valueColumn: "code", labelColumn: "label", usesSingleColumn: false }, options: [{ value: "true", label: "Oui" }, { value: "false", label: "Non" }] });
  });

  it("utilise une unique colonne comme valeur et libellé pour un TXT", () => {
    const parsed = parseReferenceDataFile({ fileName: "pays.txt", buffer: Buffer.from("Bénin\nTogo\n") });
    expect(parsed.options).toEqual([{ value: "Bénin", label: "Bénin" }, { value: "Togo", label: "Togo" }]);
    expect(parsed.mapping).toEqual({ valueColumn: "Colonne 1", labelColumn: "Colonne 1", usesSingleColumn: true });
  });

  it("importe la première feuille XLSX et accepte les en-têtes value et name", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["value", "name"], ["F", "Femme"], ["M", "Homme"]]), "Sexe");
    const parsed = parseReferenceDataFile({ fileName: "sexe.xlsx", buffer: XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) });
    expect(parsed.options).toEqual([{ value: "F", label: "Femme" }, { value: "M", label: "Homme" }]);
  });

  it("rejette les valeurs métier dupliquées et normalise les options manuelles historiques", () => {
    expect(() => parseReferenceDataFile({ fileName: "doublons.csv", buffer: Buffer.from("code,label\nA,Alpha\nA,Autre\n") })).toThrow("apparaît plusieurs fois");
    expect(normalizeSelectionOptions(["Oui", { value: "no", label: "Non" }])).toEqual([{ value: "Oui", label: "Oui" }, { value: "no", label: "Non" }]);
  });
});
