import { createApp, h } from "vue";

createApp({
  setup() {
    return () => h("div", { "data-pending": "pc-chrome" }, "pc-chrome dev preview placeholder");
  },
}).mount("#app");
