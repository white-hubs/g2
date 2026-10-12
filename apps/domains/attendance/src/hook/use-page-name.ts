import { useRoute } from "vue-router";
export function usePageName(): { pageTitle: string; title: string } {
  const route = useRoute();
  const title = String(route.meta.title ?? "考勤管理");
  return { pageTitle: title, title };
}
