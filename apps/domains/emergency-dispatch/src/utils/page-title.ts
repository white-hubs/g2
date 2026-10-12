import { useRoute } from "vue-router";

export function resolvePageTitle(meta: Record<string, unknown>): string {
  return String(meta.title ?? "应急指挥");
}

export function usePageName(): { pageTitle: string } {
  const route = useRoute();
  return {
    pageTitle: resolvePageTitle(route.meta as Record<string, unknown>),
  };
}
