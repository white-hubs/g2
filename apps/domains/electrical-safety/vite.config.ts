import { federation } from "@g2-tooling/mf-vite";
import vueJsx from "@vitejs/plugin-vue-jsx";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@g2-platform\/pc-ui$/, replacement: path.resolve(__dirname, "../../../packages/runtime-common-loader/src/pc-ui-proxy.ts") },
      { find: /^@g2-platform\/pc-player$/, replacement: path.resolve(__dirname, "./src/pc-player-runtime.ts") },
      { find: /^@g2-platform\/pc-graph-editor$/, replacement: path.resolve(__dirname, "./src/pc-graph-editor-runtime.ts") },
      { find: /^@g2-platform\/pc-scada$/, replacement: path.resolve(__dirname, "./src/pc-scada-runtime.ts") },
      { find: /^@g2-platform\/pc-scada\/core$/, replacement: path.resolve(__dirname, "./src/pc-scada-runtime.ts") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
    dedupe: ["tslib"],
  },
  server: { host: true, port: 5102, strictPort: true, origin: process.env.G2_DEV_ORIGIN ?? "http://localhost:5102" },
  preview: { host: true, port: 5102, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    vueJsx(),
    federation({
      name: "electricalSafety",
      filename: "remoteEntry.js",
      manifest: true,
      dts: false,
      mfRuntime: { role: "remote" },
      exposes: { "./domain": "./src/domain.ts" },
      shared: {
        vue: { singleton: true },
        "vue-router": { singleton: true },
      },
    }),
  ],
});
