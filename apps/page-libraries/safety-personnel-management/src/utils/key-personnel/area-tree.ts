import type { KeyPersonAreaOptionVO } from "@g2-contract/safety-personnel";

export interface AreaTreeNode {
  value: string;
  label: string;
  children?: AreaTreeNode[];
}

export function areaOptionsToTree(areas: KeyPersonAreaOptionVO[]): AreaTreeNode[] {
  return areas.map((a) => ({
    value: a.sequence,
    label: a.name,
    children: a.children?.length ? areaOptionsToTree(a.children) : undefined,
  }));
}

export function findAreaSequencePath(areas: KeyPersonAreaOptionVO[], sequence: string, path: string[] = []): string[] | null {
  for (const a of areas) {
    const next = [...path, a.sequence];
    if (a.sequence === sequence) {
      return next;
    }
    if (a.children?.length) {
      const found = findAreaSequencePath(a.children, sequence, next);
      if (found) {
        return found;
      }
    }
  }
  return null;
}
