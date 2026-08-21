import React from "react";

export function ImportPreviewSummary({ preview }: { preview: { columns: string[]; mapping: { valueColumn: string; labelColumn: string } } }) {
  return <p className="mt-3 text-xs text-slate-600"><span>{preview.columns.join(" · ")}</span><span aria-hidden="true"> · </span><span>{preview.mapping.valueColumn} → {preview.mapping.labelColumn}</span></p>;
}
