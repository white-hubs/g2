import { defineComponent } from "vue";

import styles from "./poc-inline-view.module.css";

export default defineComponent({
  name: "PocInlineView",
  setup() {
    return () => (
      <section class={styles.root} data-domain="poc-inline-pc">
        POC inline domain
      </section>
    );
  },
});
