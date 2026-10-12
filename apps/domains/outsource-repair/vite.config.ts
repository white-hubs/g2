import { federation } from "@g2-tooling/mf-vite";
import vueJsx from "@vitejs/plugin-vue-jsx";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@g2-platform\/pc-ui$/, replacement: path.resolve(__dirname, "../../../packages/runtime-common-loader/src/pc-ui-proxy.ts") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
  server: { host: true, port: 5115, strictPort: true, origin: process.env.G2_DEV_ORIGIN ?? "http://localhost:5115" },
  preview: { host: true, port: 5115, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    vueJsx(),
    federation({
      name: "outsourceRepair",
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
