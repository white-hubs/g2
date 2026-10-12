import { defineComponent } from "vue";

import styles from "./HomeView.module.css";

export default defineComponent({
  name: "HomeView",
  setup() {
    return () => <main class={styles.root}>Capability validation shell: Profile-driven platform + inline + remote composition.</main>;
  },
});
