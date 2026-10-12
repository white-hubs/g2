import { defineComponent } from "vue";
import { useRoute } from "vue-router";

import styles from "./placeholder.module.css";

export default defineComponent({
  name: "AccessControlPlaceholder",
  setup() {
    const route = useRoute();
    return () => (
      <section class={styles.root} data-domain="access-control">
        门禁管理（骨架）· {String(route.name ?? route.path)}
      </section>
    );
  },
});
