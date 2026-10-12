import vueJsx from "@vitejs/plugin-vue-jsx";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vueJsx()],
  resolve: { alias: { "@": fileURLToPath(new URL("../../src", import.meta.url)) } },
  server: { host: "127.0.0.1" },
});
