import type { HazardCategoryTreeVO } from "@g2-contract/hazard-governance";

export const normalizeHazardCategoryTree = (nodes: HazardCategoryTreeVO[]): HazardCategoryTreeVO[] =>
  nodes
    .toSorted((left, right) => (left.sortNo ?? 0) - (right.sortNo ?? 0))
    .map((node) => ({
      ...node,
      id: String(node.id),
      ...(node.parentId === undefined || node.parentId === null ? {} : { parentId: String(node.parentId) }),
      ...(node.children ? { children: normalizeHazardCategoryTree(node.children) } : {}),
    }));

export const resolveHazardCategoryPath = (value: unknown, options: HazardCategoryTreeVO[]): string[] => {
  const currentPath = Array.isArray(value) ? value.map(String) : [];
  const targetId = currentPath.at(-1);
  if (!targetId) {
    return [];
  }

  const findPath = (nodes: HazardCategoryTreeVO[], parentPath: string[]): string[] | undefined => {
    for (const node of nodes) {
      const nodePath = [...parentPath, String(node.id)];
      if (String(node.id) === targetId) {
        return nodePath;
      }
      const childPath = node.children ? findPath(node.children, nodePath) : undefined;
      if (childPath) {
        return childPath;
      }
    }
    return undefined;
  };

  return findPath(options, []) ?? currentPath;
};
