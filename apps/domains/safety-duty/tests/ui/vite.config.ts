import vueJsx from "@vitejs/plugin-vue-jsx";
import path from "node:path";
import { defineConfig } from "vite";
export default defineConfig({
  root: import.meta.dirname,
  plugins: [vueJsx()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "../../src") } },
  server: { host: "127.0.0.1", port: 5179, strictPort: true, fs: { allow: [path.resolve(import.meta.dirname, "../../../../..")] } },
});
