import { createApp, h } from "vue";

createApp({
  setup() {
    return () => h("p", "@g2-platform/pc-alarm-popup (overlay mount via PlatformInstall)");
  },
}).mount("#app");
