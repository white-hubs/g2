import { PageLayout as CubeLayout } from "@g2-platform/pc-ui";
/** @jsxImportSource vue */
import { type SlotsType, defineComponent } from "vue";

import styles from "./page-shell.module.css";

export const PageShell = defineComponent({
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
    return () => (
      <div class={styles.shell}>
        <CubeLayout
          title={props.title}
          showFooter={props.showFooter}
          v-slots={{
            "layout-header": slots["layout-header"],
            "layout-content": slots["layout-content"]
              ? () => <div class={styles.contentBody}>{slots["layout-content"]?.()}</div>
              : undefined,
            "footer-page": slots["footer-page"],
            default: slots.default,
          }}
        />
      </div>
    );
  },
});
