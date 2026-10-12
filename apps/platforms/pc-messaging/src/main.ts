import { createApp, h } from "vue";

createApp({
  setup() {
    return () => h("p", "@g2-platform/pc-messaging (no visible UI, install-only platform)");
  },
}).mount("#app");
