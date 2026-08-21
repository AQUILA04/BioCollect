export type SelectionTypeLevelInput = { id: string; label: string; order: number };
export type SelectionTypeNodeInput = { id: string; levelId: string; value: string; parentNodeId?: string | null };

export function isValidSelectionType(levels: SelectionTypeLevelInput[], nodes: SelectionTypeNodeInput[]) {
  if (levels.length < 2 || new Set(levels.map(level => level.id)).size !== levels.length || levels.some((level, index) => level.order !== index)) return false;
  const levelOrder = new Map(levels.map(level => [level.id, level.order])); const nodeById = new Map(nodes.map(node => [node.id, node]));
  if (new Set(nodes.map(node => node.id)).size !== nodes.length || new Set(nodes.map(node => node.value)).size !== nodes.length) return false;
  return nodes.every(node => { const order = levelOrder.get(node.levelId); if (order === undefined) return false; if (order === 0) return !node.parentNodeId; const parent = node.parentNodeId ? nodeById.get(node.parentNodeId) : null; return Boolean(parent && levelOrder.get(parent.levelId) === order - 1); });
}
