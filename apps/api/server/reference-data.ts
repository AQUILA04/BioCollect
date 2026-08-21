import * as XLSX from "xlsx";
import type { SelectionOption } from "../shared/biocollect";

export const REFERENCE_DATA_FILE_EXTENSIONS = ["txt", "csv", "xls", "xlsx"] as const;
export const MAX_REFERENCE_DATA_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_REFERENCE_DATA_OPTIONS = 10_000;

export type ParsedReferenceData = {
  options: SelectionOption[];
  rowCount: number;
  columns: string[];
  mapping: { valueColumn: string; labelColumn: string; usesSingleColumn: boolean };
};

function cleanCell(value: unknown) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim();
}

function extensionOf(fileName: string) {
  return fileName.toLowerCase().split(".").pop() ?? "";
}

function textRows(buffer: Buffer) {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const delimiter = ["\t", ";", ",", "|"].find(candidate => text.includes(candidate)) ?? ",";
  return text.split(/\r?\n/).map(line => line.split(delimiter));
}

function workbookRows(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", raw: false });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return [] as unknown[][];
  return XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheet], { header: 1, defval: "", raw: false }) as unknown[][];
}

export function parseReferenceDataFile(input: { fileName: string; buffer: Buffer }): ParsedReferenceData {
  if (input.buffer.byteLength === 0) throw new Error("Le fichier importé est vide.");
  if (input.buffer.byteLength > MAX_REFERENCE_DATA_FILE_BYTES) throw new Error("Le fichier dépasse la limite de 5 Mo.");
  const extension = extensionOf(input.fileName);
  if (!REFERENCE_DATA_FILE_EXTENSIONS.includes(extension as (typeof REFERENCE_DATA_FILE_EXTENSIONS)[number])) throw new Error("Seuls les fichiers TXT, CSV, XLS et XLSX sont acceptés.");

  const rows = extension === "txt" ? textRows(input.buffer) : workbookRows(input.buffer);
  const firstNonEmptyIndex = rows.findIndex(row => row.some(cell => cleanCell(cell)));
  if (firstNonEmptyIndex < 0) throw new Error("Le fichier ne contient aucune option exploitable.");
  const rawHeader = rows[firstNonEmptyIndex].map(cell => cleanCell(cell));
  const header = rawHeader.map(cell => cell.toLowerCase());
  const valueHeader = header.findIndex(cell => cell === "code" || cell === "value");
  const labelHeader = header.findIndex(cell => cell === "label" || cell === "name");
  const hasHeader = valueHeader >= 0 || labelHeader >= 0;
  const startIndex = hasHeader ? firstNonEmptyIndex + 1 : firstNonEmptyIndex;
  const valueIndex = valueHeader >= 0 ? valueHeader : 0;
  const labelIndex = labelHeader >= 0 ? labelHeader : valueIndex === 0 ? 1 : 0;
  const detectedWidth = Math.max(...rows.map(row => row.length), 1);
  const columns = hasHeader ? rawHeader.map((cell, index) => cell || `Colonne ${index + 1}`) : Array.from({ length: detectedWidth }, (_, index) => `Colonne ${index + 1}`);
  const seenValues = new Set<string>();
  const options: SelectionOption[] = [];

  for (const row of rows.slice(startIndex)) {
    const first = cleanCell(row[valueIndex]);
    const second = cleanCell(row[labelIndex]);
    const value = first || second;
    const label = second || first;
    if (!value && !label) continue;
    if (value.length > 120 || label.length > 160) throw new Error("Chaque code doit faire au plus 120 caractères et chaque libellé au plus 160 caractères.");
    if (seenValues.has(value)) throw new Error(`La valeur « ${value} » apparaît plusieurs fois dans ce fichier.`);
    seenValues.add(value);
    options.push({ value, label });
    if (options.length > MAX_REFERENCE_DATA_OPTIONS) throw new Error("Un référentiel ne peut pas contenir plus de 10 000 options.");
  }
  if (!options.length) throw new Error("Le fichier ne contient aucune option exploitable.");
  const usesSingleColumn = rows.slice(startIndex).filter(row => row.some(cell => cleanCell(cell))).every(row => !cleanCell(row[labelIndex]));
  return { options, rowCount: options.length, columns, mapping: { valueColumn: columns[valueIndex] ?? `Colonne ${valueIndex + 1}`, labelColumn: usesSingleColumn ? columns[valueIndex] ?? `Colonne ${valueIndex + 1}` : columns[labelIndex] ?? `Colonne ${labelIndex + 1}`, usesSingleColumn } };
}

export function normalizeSelectionOptions(options: Array<string | SelectionOption> | undefined): SelectionOption[] {
  return (options ?? []).map(option => typeof option === "string" ? { value: option.trim(), label: option.trim() } : { value: option.value.trim(), label: option.label.trim() }).filter(option => option.value && option.label);
}
