import { computed } from "vue";
import { useRoute } from "vue-router";
export function usePageName() {
  const route = useRoute();
  return { pageTitle: computed(() => String(route.meta.title ?? "安全人员管理")) };
}
