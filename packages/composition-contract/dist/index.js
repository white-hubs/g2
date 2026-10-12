// @bun
// src/assert-domain-module.ts
function validateMenuNode(node, path) {
  if (!node || typeof node !== "object") {
    return [`${path} must be an object`];
  }
  const n = node;
  const errors = [];
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
function collectMenuPaths(nodes) {
  const paths = new Set;
  const visit = (items) => {
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
function validateHiddenRoutes(routes, menuPaths) {
  const errors = [];
  const visit = (items) => {
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
function assertDomainModule(input) {
  if (!input || typeof input !== "object") {
    return { ok: false, errors: ["domain module must be an object"] };
  }
  const mod = input;
  if (!Array.isArray(mod.routes)) {
    return { ok: false, errors: ["domain module must expose routes array"] };
  }
  let menuPaths = new Set;
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
  return { ok: true, module: mod };
}
// src/menu-overlay.ts
function cloneMenuTree(nodes) {
  return nodes.map((node) => ({
    ...node,
    ...node.children ? { children: cloneMenuTree(node.children) } : {}
  }));
}
function assertMenuOverlay(input) {
  if (!Array.isArray(input)) {
    return { ok: false, errors: ["menu overlay must be an array"] };
  }
  const errors = [];
  const overlay = [];
  for (const [index, raw] of input.entries()) {
    const path = `overlay[${index}]`;
    if (!raw || typeof raw !== "object") {
      errors.push(`${path} must be an object`);
      continue;
    }
    const record = raw;
    if ("path" in record && record.path !== undefined) {
      errors.push(`${path} must not include path`);
      continue;
    }
    const code = typeof record.code === "string" ? record.code.trim() : "";
    if (!code) {
      errors.push(`${path}.code must be a non-empty string`);
      continue;
    }
    const node = { code };
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
function indexByFunctionCode(roots) {
  const map = new Map;
  const walk = (nodes) => {
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
function findChildrenBucket(roots, parentCode) {
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
function mergeMenuContribution(defaultTree, overlay) {
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
// src/assert-platform-module.ts
function assertPlatformModule(input) {
  if (!input || typeof input !== "object") {
    return { ok: false, errors: ["platform module must be an object"] };
  }
  const mod = input;
  const errors = [];
  if (mod.slots !== undefined && (typeof mod.slots !== "object" || mod.slots === null || Array.isArray(mod.slots))) {
    errors.push("platform module 'slots' must be an object map when present");
  }
  if (mod.install !== undefined && typeof mod.install !== "function") {
    errors.push("platform module 'install' must be a function when present");
  }
  if (mod.label !== undefined && typeof mod.label !== "string") {
    errors.push("platform module 'label' must be a string when present");
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, module: mod };
}
// src/test-harness.ts
function createFakeBus() {
  const handlers = new Map;
  const published = [];
  return {
    published,
    publish(event, payload) {
      published.push({ event, payload });
      for (const handler of handlers.get(event) ?? []) {
        handler(payload);
      }
    },
    subscribe(event, handler) {
      if (!handlers.has(event)) {
        handlers.set(event, new Set);
      }
      handlers.get(event).add(handler);
      return () => handlers.get(event)?.delete(handler);
    }
  };
}
function createFakePlatformContext(overrides = {}) {
  return {
    bus: overrides.bus ?? createFakeBus(),
    getAuthHeaders: overrides.getAuthHeaders ?? (() => ({})),
    loadPlatform: overrides.loadPlatform ?? (async () => {
      throw new Error("createFakePlatformContext: loadPlatform not stubbed for this test, pass an override");
    }),
    loadRuntimeCommon: overrides.loadRuntimeCommon ?? (async () => {
      throw new Error("createFakePlatformContext: loadRuntimeCommon not stubbed for this test, pass an override");
    }),
    ensureClient: overrides.ensureClient ?? (async () => {
      throw new Error("createFakePlatformContext: ensureClient not stubbed for this test, pass an override");
    })
  };
}
function createFakeDomainContext(overrides = {}) {
  const platform = createFakePlatformContext(overrides);
  return {
    ...platform,
    loadRuntimeCommon: overrides.loadRuntimeCommon ?? (async () => {
      throw new Error("createFakeDomainContext: loadRuntimeCommon not stubbed for this test, pass an override");
    }),
    loadPageLibrary: overrides.loadPageLibrary ?? (async () => {
      throw new Error("createFakeDomainContext: loadPageLibrary not stubbed for this test, pass an override");
    }),
    getFunctionCodes: overrides.getFunctionCodes ?? (() => new Set)
  };
}
function createFakeApp() {
  return {
    use: () => {
      return;
    },
    provide: () => {
      return;
    },
    component: () => {
      return;
    },
    config: { globalProperties: {} }
  };
}
function createFakeRouter() {
  const routes = [];
  return {
    addRoute: (route) => routes.push(route),
    removeRoute: () => {
      return;
    },
    beforeEach: () => () => {
      return;
    },
    push: async () => {
      return;
    }
  };
}
export {
  mergeMenuContribution,
  createFakeRouter,
  createFakePlatformContext,
  createFakeDomainContext,
  createFakeBus,
  createFakeApp,
  assertPlatformModule,
  assertMenuOverlay,
  assertDomainModule
};
