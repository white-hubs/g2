import { defineComponent } from "vue";

import { PageLayout } from "../pc-ui-runtime";

import styles from "./page-frame.module.css";

export const PageFrame = defineComponent({
  name: "SecureEduPageFrame",
  props: {
    title: { type: String, required: true },
  },
  setup(props, { slots }) {
    return () => (
      <PageLayout title={props.title} showFooter={Boolean(slots.footer)}>
        {{
          "layout-header": slots.actions ? () => <div class={styles.actions}>{slots.actions?.()}</div> : undefined,
          "layout-content": () => (
            <>
              {slots.search ? <div class={styles.search}>{slots.search()}</div> : null}
              <main class={styles.body}>{slots.default?.()}</main>
            </>
          ),
          "footer-page": slots.footer ? () => slots.footer?.() : undefined,
        }}
      </PageLayout>
    );
  },
});
