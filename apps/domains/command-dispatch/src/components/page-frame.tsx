import { defineComponent } from "vue";

import styles from "./page-frame.module.css";

export const PageFrame = defineComponent({
  name: "CommandDispatchPageFrame",
  props: { title: { type: String, required: true } },
  setup(props, { slots }) {
    return () => (
      <section class={styles.page} aria-label={props.title}>
        <header class={styles.header}>
          <h1 class={styles.title}>{props.title}</h1>
          {slots.actions ? <div class={styles.actions}>{slots.actions()}</div> : null}
        </header>
        {slots.search ? <div class={styles.search}>{slots.search()}</div> : null}
        <div class={styles.body}>{slots.default?.()}</div>
        {slots.footer ? <footer class={styles.footer}>{slots.footer()}</footer> : null}
      </section>
    );
  },
});
