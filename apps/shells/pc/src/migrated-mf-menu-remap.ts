import type { MenuContributionNode } from "@g2-composition/contract";

/**
 * 迁移期 portal→MF remap 已退役（门禁/GEM 以 Domain routes + menuContribution 为准）。
 * 旧 `/portal/*` 兼容留给大迁移提测阶段再议；本模块仅保留空实现以免调用方炸裂。
 */

/** @deprecated 不再改写；已迁应用不持有旧 portal path。 */
export function isAccessControlPortalPath(_path: string): boolean {
  return false;
}

/** @deprecated 不再改写。 */
export function remapAccessControlPortalPath(_path: string, _mfBasePath?: string): string | undefined {
  return undefined;
}

/** @deprecated 不再改写。 */
export function isGenericEquipmentMonitorPortalPath(_path: string): boolean {
  return false;
}

/** @deprecated 不再改写。 */
export function remapGenericEquipmentMonitorPortalPath(_path: string, _mfBasePath: string): string | undefined {
  return undefined;
}

/** @deprecated 不再改写。 */
export function remapMigratedMfPortalPath(_path: string, _mfBasePath?: string): string | undefined {
  return undefined;
}

/** 递归改写菜单树 path；无法改写的节点保持原 path。 */
export function remapMenuTreePaths(nodes: MenuContributionNode[], remapPath: (path: string) => string | undefined): MenuContributionNode[] {
  return nodes.map((node) => {
    const next: MenuContributionNode = { label: node.label };
    if (node.iconKey) {
      next.iconKey = node.iconKey;
    }
    if (node.icon) {
      next.icon = node.icon;
    }
    if (node.functionCode) {
      next.functionCode = node.functionCode;
    }
    if (node.path) {
      next.path = remapPath(node.path) ?? node.path;
    }
    if (node.children?.length) {
      next.children = remapMenuTreePaths(node.children, remapPath);
    }
    return next;
  });
}
