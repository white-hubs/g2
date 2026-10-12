import type { AreaTreeItem } from "../../evacuation-shared/data/types";
import type { AreaTreeNode as AreaTree } from "@/api/mdata";

export function mapAreaTreeToTreeItem(area: AreaTree, defaultExpanded = true): AreaTreeItem {
  return {
    id: String(area.id),
    name: area.name,
    expanded: defaultExpanded,
    children: (area.children ?? []).map((child) => mapAreaTreeToTreeItem(child, defaultExpanded)),
  };
}

export function mapAreaTreesToTreeItems(areas: AreaTree[]): AreaTreeItem[] {
  return areas.map((area) => mapAreaTreeToTreeItem(area));
}

export function findAreaTreeItem(nodes: AreaTreeItem[], id: string): AreaTreeItem | undefined {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    const found = findAreaTreeItem(node.children, id);
    if (found) {
      return found;
    }
  }
  return undefined;
}

export function walkAreaTreeItems(nodes: AreaTreeItem[], visit: (node: AreaTreeItem) => void): void {
  nodes.forEach((node) => {
    visit(node);
    walkAreaTreeItems(node.children, visit);
  });
}

export function flattenAreaTreeItems(nodes: AreaTreeItem[]): AreaTreeItem[] {
  const result: AreaTreeItem[] = [];
  walkAreaTreeItems(nodes, (node) => {
    result.push(node);
  });
  return result;
}

export function filterAreaTreeItems(nodes: AreaTreeItem[], keyword: string): AreaTreeItem[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) {
    return nodes;
  }
  return nodes
    .map((node) => {
      const filteredChildren = filterAreaTreeItems(node.children, kw);
      const selfMatch = node.name.toLowerCase().includes(kw);
      if (selfMatch || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    })
    .filter((node): node is AreaTreeItem => node !== null);
}
