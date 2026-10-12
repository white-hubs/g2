import { useRoute } from "vue-router";

/** 使用 Shell 当前路由标题，与隐患治理 useLayoutTitle 对齐。 */
export function useLayoutTitle(fallback: string): string {
  const route = useRoute();
  return typeof route.meta.title === "string" ? route.meta.title : fallback;
}

/** 浏览器打印保留告知卡的导出入口；PDF 生成由浏览器打印对话框完成。 */
export async function downloadPDF(element: HTMLElement, title: string): Promise<void> {
  const previous = document.title;
  document.title = title;
  element.ownerDocument.defaultView?.print();
  document.title = previous;
}
