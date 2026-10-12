import type { RouteLocationRaw, Router } from "vue-router";
import { useRoute } from "vue-router";

export function useLayoutTitle(fallback: string): string {
  const route = useRoute();
  return typeof route.meta.title === "string" ? route.meta.title : fallback;
}

export function pushByHistory(router: Router, location: RouteLocationRaw): void {
  const resolved = router.resolve(location);
  window.history.pushState(window.history.state, "", resolved.href);
  window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
}

export function goBack(_router: Router, _fallback?: RouteLocationRaw): void {
  window.history.back();
}
