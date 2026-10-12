interface MenuRoute {
  path: string;
  meta: Record<string, unknown>;
  query: Record<string, unknown>;
}

interface MenuOriginContext {
  query: Record<string, unknown>;
  resolveRoute: (location: string) => MenuRoute | undefined;
  isMenuPath: (path: string) => boolean;
  previousMenuPath?: string;
}

// ADR-0031 兼容层：旧应用停用后删除。qiankun 的平级表单路由没有 activeMenuPath。
const legacyEducationOwners = new Map([
  ["training-task-form", "training-task"],
  ["exam-task-form", "exam-task"],
  ["test-paper-manage-form", "test-paper-manage"],
  ["courseware-form", "courseware"],
  ["question-form", "question"],
  ["paper-question-rule-form", "paper-question-rule"],
  ["training-detials", "training-count"],
  ["exam-details", "exam-count"],
  ["exam-paper-detail", "exam-task"],
]);

function resolveLegacyMenuPath(path: string, fallback: string, origin: MenuOriginContext): string {
  const base = path.match(/^\/portal\/[^/]+(?=\/|$)/u)?.[0];
  if (!base || origin.isMenuPath(fallback)) {
    return fallback;
  }
  const previous = origin.previousMenuPath;
  if (previous?.startsWith(`${base}/`) && origin.isMenuPath(previous)) {
    return previous;
  }
  // 刷新/直接打开没有来源状态，按旧路由的实际归属恢复；不能指向当前用户没有的菜单。
  if (base === "/portal/secure-edu" || base === "/portal/secure-edu-head") {
    const owner = legacyEducationOwners.get(path.slice(base.length + 1));
    const candidate = owner ? `${base}/${owner}` : undefined;
    if (candidate && origin.isMenuPath(candidate)) {
      return candidate;
    }
  }
  return fallback;
}

function declaredMenuPath(path: string, meta: Record<string, unknown>): string {
  const activeMenuPath = meta.activeMenuPath;
  return typeof activeMenuPath === "string" && activeMenuPath ? activeMenuPath : path;
}

/** 隐藏页面沿同一应用的 returnPath 找到入口菜单；直接访问时仍使用路由声明的归属。 */
export function resolveSideMenuActivePath(path: string, meta: Record<string, unknown>, origin?: MenuOriginContext): string {
  const fallback = declaredMenuPath(path, meta);
  if (path.startsWith("/portal/") && origin) {
    return resolveLegacyMenuPath(path, fallback, origin);
  }
  const base = path.match(/^\/d\/[^/]+(?=\/|$)/u)?.[0];
  if (meta.hideInMenu !== true || !base || !origin) {
    return fallback;
  }

  let current: MenuRoute = { path, meta, query: origin.query };
  let originMenuPath = fallback;
  const visited = new Set<string>();
  while (current.meta.hideInMenu === true) {
    const returnPath = current.query.returnPath;
    if (typeof returnPath !== "string" || !returnPath.startsWith(`${base}/`) || visited.has(returnPath)) {
      return originMenuPath;
    }
    visited.add(returnPath);
    const previous = origin.resolveRoute(returnPath);
    if (!previous || !previous.path.startsWith(`${base}/`)) {
      return originMenuPath;
    }
    const candidate = declaredMenuPath(previous.path, previous.meta);
    if (!origin.isMenuPath(candidate)) {
      return originMenuPath;
    }
    originMenuPath = candidate;
    current = previous;
  }
  return originMenuPath;
}
