import { defineComponent, nextTick, onBeforeUnmount, onMounted, ref, type SlotsType } from "vue";

import { CubeLayout } from "@/compat/app-design";

import styles from "./fumigation-page-shell.module.less";

export const FumigationPageShell = defineComponent({
  name: "FumigationPageShell",
  props: {
    title: { type: String, default: "" },
    showFooter: { type: Boolean, default: true },
  },
  slots: Object as SlotsType<{
    "layout-header"?: () => unknown;
    "layout-content"?: () => unknown;
    "footer-page"?: () => unknown;
    default?: () => unknown;
  }>,
  setup(props, { slots }) {
    const shellRef = ref<HTMLElement>();
    const shellHeight = ref("100%");

    const updateShellHeight = (): void => {
      const element = shellRef.value;
      if (element == null) {
        return;
      }
      const top = element.getBoundingClientRect().top;
      const height = Math.max(window.innerHeight - top - 12, 320);
      shellHeight.value = `${height}px`;
    };

    onMounted(() => {
      void nextTick(() => {
        updateShellHeight();
        window.addEventListener("resize", updateShellHeight);
      });
    });

    onBeforeUnmount(() => {
      window.removeEventListener("resize", updateShellHeight);
    });

    return (): JSX.Element => (
      <div ref={shellRef} class={styles.shell} style={{ height: shellHeight.value, maxHeight: shellHeight.value }}>
        <CubeLayout
          title={props.title}
          showFooter={props.showFooter}
          v-slots={{
            "layout-header": slots["layout-header"],
            "layout-content": slots["layout-content"]
              ? (): JSX.Element => <div class={styles.contentBody}>{slots["layout-content"]?.()}</div>
              : undefined,
            "footer-page": slots["footer-page"],
            default: slots.default,
          }}
        />
      </div>
    );
  },
});
