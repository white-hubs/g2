import { defineComponent } from "vue";

import styles from "./poc-remote-view.module.css";

export default defineComponent({
  name: "PocRemoteView",
  setup() {
    return () => (
      <section class={styles.root} data-domain="poc-remote-pc">
        POC remote domain
      </section>
    );
  },
});
