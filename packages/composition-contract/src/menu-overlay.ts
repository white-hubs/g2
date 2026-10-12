import type { MenuContributionNode } from "./types";

/** 菜单 overlay 节点：仅按 code 改展示，禁止 path（ADR-0059）。 */
export interface MenuOverlayNode {
  code: string;
  parentCode?: string;
  order?: number;
  alias?: string;
  hidden?: boolean;
}

export type AssertMenuOverlayResult = { ok: true; overlay: MenuOverlayNode[] } | { ok: false; errors: string[] };

function cloneMenuTree(nodes: MenuContributionNode[]): MenuContributionNode[] {
  return nodes.map((node) => ({
    ...node,
    ...(node.children ? { children: cloneMenuTree(node.children) } : {}),
  }));
}

export function assertMenuOverlay(input: unknown): AssertMenuOverlayResult {
  if (!Array.isArray(input)) {
    return { ok: false, errors: ["menu overlay must be an array"] };
  }
  const errors: string[] = [];
  const overlay: MenuOverlayNode[] = [];
  for (const [index, raw] of input.entries()) {
    const path = `overlay[${index}]`;
    if (!raw || typeof raw !== "object") {
      errors.push(`${path} must be an object`);
      continue;
    }
    const record = raw as Record<string, unknown>;
    if ("path" in record && record.path !== undefined) {
      errors.push(`${path} must not include path`);
      continue;
    }
    const code = typeof record.code === "string" ? record.code.trim() : "";
    if (!code) {
      errors.push(`${path}.code must be a non-empty string`);
      continue;
    }
    const node: MenuOverlayNode = { code };
    if (typeof record.parentCode === "string" && record.parentCode.trim()) {
      node.parentCode = record.parentCode.trim();
    }
    if (typeof record.order === "number" && Number.isFinite(record.order)) {
      node.order = record.order;
    }
    if (typeof record.alias === "string") {
      node.alias = record.alias;
    }
    if (typeof record.hidden === "boolean") {
      node.hidden = record.hidden;
    }
    overlay.push(node);
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, overlay };
}

interface IndexedNode {
  node: MenuContributionNode;
  parent: MenuContributionNode[] | null;
  index: number;
}

function indexByFunctionCode(roots: MenuContributionNode[]): Map<string, IndexedNode> {
  const map = new Map<string, IndexedNode>();
  const walk = (nodes: MenuContributionNode[]) => {
    nodes.forEach((node, index) => {
      if (node.functionCode) {
        map.set(node.functionCode, { node, parent: nodes, index });
      }
      if (node.children) {
        walk(node.children);
      }
    });
  };
  walk(roots);
  return map;
}

function findChildrenBucket(roots: MenuContributionNode[], parentCode: string | undefined): MenuContributionNode[] | null {
  if (!parentCode) {
    return roots;
  }
  const indexed = indexByFunctionCode(roots);
  const parent = indexed.get(parentCode);
  if (!parent) {
    return null;
  }
  if (!parent.node.children) {
    parent.node.children = [];
  }
  return parent.node.children;
}

/**
 * 将可选 overlay 合并进默认 menuContribution。
 * 无 overlay → 默认树深拷贝；未知 code 忽略；不得因 overlay 新建默认可导航叶子。
 */
export function mergeMenuContribution(defaultTree: MenuContributionNode[], overlay: MenuOverlayNode[] | undefined): MenuContributionNode[] {
  const tree = cloneMenuTree(defaultTree);
  if (!overlay || overlay.length === 0) {
    return tree;
  }

  for (const patch of overlay) {
    const indexed = indexByFunctionCode(tree);
    const hit = indexed.get(patch.code);
    if (!hit) {
      continue;
    }
    if (patch.alias !== undefined) {
      hit.node.label = patch.alias;
    }
    if (patch.hidden === true) {
      if (hit.parent) {
        hit.parent.splice(hit.index, 1);
      }
      continue;
    }
    if (patch.parentCode !== undefined || patch.order !== undefined) {
      const fromParent = hit.parent;
      if (!fromParent) {
        continue;
      }
      fromParent.splice(hit.index, 1);
      const bucket = patch.parentCode !== undefined ? findChildrenBucket(tree, patch.parentCode) : fromParent;
      if (!bucket) {
        fromParent.splice(Math.min(hit.index, fromParent.length), 0, hit.node);
        continue;
      }
      const insertAt = typeof patch.order === "number" ? Math.max(0, Math.min(patch.order, bucket.length)) : bucket.length;
      bucket.splice(insertAt, 0, hit.node);
    }
  }
  return tree;
}
