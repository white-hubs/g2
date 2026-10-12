import { onBeforeUnmount, onMounted, ref } from "vue";

export function useLayoutTableScroll(extraOffset = 16) {
  const scrollY = ref(400);
  let observer: ResizeObserver | undefined;
  const calc = () => {
    const content = document.querySelector("#pc-layout-content");
    if (!content) {
      return;
    }
    const table = content.querySelector(".ant-table-thead");
    const top = table?.getBoundingClientRect().bottom ?? content.getBoundingClientRect().top;
    scrollY.value = Math.max(content.getBoundingClientRect().bottom - top - extraOffset, 200);
  };
  onMounted(() => {
    calc();
    observer = new ResizeObserver(calc);
    const content = document.querySelector("#pc-layout-content");
    if (content) {
      observer.observe(content);
      content
        .querySelectorAll("[data-layout-toolbar], [data-layout-tabs], .ant-table-thead")
        .forEach((element) => observer?.observe(element));
    }
    window.addEventListener("resize", calc);
  });
  onBeforeUnmount(() => {
    observer?.disconnect();
    window.removeEventListener("resize", calc);
  });
  return { scrollY, recalc: calc };
}
