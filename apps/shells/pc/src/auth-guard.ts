import type { NavigationGuardWithThis, RouteLocationNormalized } from "vue-router";

export interface AuthGuardDeps {
  getToken: () => string | undefined;
  whiteList: string[];
}

export function createAuthGuard(deps: AuthGuardDeps): NavigationGuardWithThis<undefined> {
  return async (to: RouteLocationNormalized, _from, next) => {
    if (deps.whiteList.includes(String(to.name))) {
      next();
      return;
    }
    if (!deps.getToken()) {
      next({ path: "/login", replace: true });
      return;
    }
    next();
  };
}
