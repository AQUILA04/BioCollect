import type { BioCollectHierarchicalSelectionDefinition } from "@biocollect/form-engine";

export type HierarchicalSelectionAnswer = { selectionTypeId: string; selections: Record<string, string>; leafNodeId: string };

export function parseHierarchicalAnswer(value: string | undefined): HierarchicalSelectionAnswer | null {
  if (!value) return null;
  try { const parsed = JSON.parse(value) as HierarchicalSelectionAnswer; return parsed?.selectionTypeId && parsed.selections ? parsed : null; } catch { return null; }
}

export function optionsForHierarchyLevel(definition: BioCollectHierarchicalSelectionDefinition, levelId: string, parentNodeId?: string) {
  return definition.nodes.filter(node => node.levelId === levelId && (parentNodeId ? node.parentNodeId === parentNodeId : !node.parentNodeId));
}

export function changeHierarchyAnswer(definition: BioCollectHierarchicalSelectionDefinition, current: HierarchicalSelectionAnswer | null, levelId: string, nodeId: string): HierarchicalSelectionAnswer {
  const level = definition.levels.find(item => item.id === levelId); const selections = { ...(current?.selections ?? {}), [levelId]: nodeId };
  for (const descendant of definition.levels.filter(item => (level?.order ?? -1) < item.order)) delete selections[descendant.id];
  const selectedLevels = definition.levels.filter(item => selections[item.id]); const leafNodeId = selections[selectedLevels.at(-1)?.id ?? levelId] ?? nodeId;
  return { selectionTypeId: definition.selectionTypeId, selections, leafNodeId };
}

export function isHierarchyComplete(definition: BioCollectHierarchicalSelectionDefinition, value: string | undefined) {
  const answer = parseHierarchicalAnswer(value); return Boolean(answer && definition.levels.every(level => answer.selections[level.id]));
}
