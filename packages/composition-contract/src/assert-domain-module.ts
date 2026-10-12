import type { DomainModule, MenuContributionNode } from "./types";

export type AssertDomainModuleResult = { ok: true; module: DomainModule } | { ok: false; errors: string[] };

function validateMenuNode(node: unknown, path: string): string[] {
  if (!node || typeof node !== "object") {
    return [`${path} must be an object`];
  }
  const n = node as Partial<MenuContributionNode>;
  const errors: string[] = [];
  if (typeof n.label !== "string" || n.label.length === 0) {
    errors.push(`${path}.label must be a non-empty string`);
  }
  if (n.children !== undefined) {
    if (!Array.isArray(n.children)) {
      errors.push(`${path}.children must be an array when present`);
    } else {
      n.children.forEach((child, index) => {
        errors.push(...validateMenuNode(child, `${path}.children[${index}]`));
      });
    }
  }
  return errors;
}

function collectMenuPaths(nodes: MenuContributionNode[]): Set<string> {
  const paths = new Set<string>();
  const visit = (items: MenuContributionNode[]): void => {
    for (const item of items) {
      if (item.path) {
        paths.add(item.path);
      }
      if (item.children) {
        visit(item.children);
      }
    }
  };
  visit(nodes);
  return paths;
}

function validateHiddenRoutes(routes: DomainModule["routes"], menuPaths: Set<string>): string[] {
  const errors: string[] = [];
  const visit = (items: DomainModule["routes"]): void => {
    for (const route of items) {
      if (route.meta?.hideInMenu === true) {
        const activeMenuPath = route.meta.activeMenuPath;
        if (typeof activeMenuPath !== "string" || activeMenuPath.length === 0) {
          errors.push(`hidden route "${route.path}" must declare a non-empty meta.activeMenuPath`);
        } else if (menuPaths.size > 0 && !menuPaths.has(activeMenuPath)) {
          errors.push(`hidden route "${route.path}" points to unknown menu path "${activeMenuPath}"`);
        }
      }
      if (route.children) {
        visit(route.children);
      }
    }
  };
  visit(routes);
  return errors;
}

export function assertDomainModule(input: unknown): AssertDomainModuleResult {
  if (!input || typeof input !== "object") {
    return { ok: false, errors: ["domain module must be an object"] };
  }
  const mod = input as Partial<DomainModule>;
  if (!Array.isArray(mod.routes)) {
    return { ok: false, errors: ["domain module must expose routes array"] };
  }
  let menuPaths = new Set<string>();
  if (mod.menuContribution !== undefined) {
    if (!Array.isArray(mod.menuContribution)) {
      return { ok: false, errors: ["domain module 'menuContribution' must be an array when present"] };
    }
    const errors = mod.menuContribution.flatMap((node, index) => validateMenuNode(node, `menuContribution[${index}]`));
    if (errors.length > 0) {
      return { ok: false, errors };
    }
    menuPaths = collectMenuPaths(mod.menuContribution);
  }
  const routeErrors = validateHiddenRoutes(mod.routes, menuPaths);
  if (routeErrors.length > 0) {
    return { ok: false, errors: routeErrors };
  }
  return { ok: true, module: mod as DomainModule };
}
