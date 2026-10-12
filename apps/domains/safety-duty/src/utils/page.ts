import { useRoute } from "vue-router";
export function usePageName(): { pageTitle: string } {
  const route = useRoute();
  return { pageTitle: typeof route.meta.title === "string" ? route.meta.title : "安全履职" };
}
export { downloadPDF } from "@/pc-ui-runtime";
