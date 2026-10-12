import { federation } from "@g2-tooling/mf-vite";
import vueJsx from "@vitejs/plugin-vue-jsx";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: { host: true, port: 5112, strictPort: true, origin: process.env.G2_DEV_ORIGIN ?? "http://localhost:5112" },
  preview: { host: true, port: 5112, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    vueJsx(),
    federation({
      name: "complaint",
      filename: "remoteEntry.js",
      manifest: true,
      dts: false,
      dev: { remoteHmr: true },
      mfRuntime: { role: "remote" },
      exposes: { "./domain": "./src/domain.ts" },
      shared: { vue: { singleton: true }, "vue-router": { singleton: true } },
    }),
  ],
});
