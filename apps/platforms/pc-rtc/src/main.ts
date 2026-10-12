import { createApp, h } from "vue";

createApp({
  setup() {
    return () => h("p", "@g2-platform/pc-rtc (no visible UI yet, event routing only)");
  },
}).mount("#app");
