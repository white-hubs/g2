import vueJsx from "@vitejs/plugin-vue-jsx";
import { defineConfig } from "vite";

export default defineConfig({ root: __dirname, plugins: [vueJsx()], server: { host: "127.0.0.1", port: 5196, strictPort: true } });
