import { federation } from "@g2-tooling/mf-vite";
import vueJsx from "@vitejs/plugin-vue-jsx";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: { alias: [{ find: /^@g2-platform\/pc-ui$/, replacement: path.resolve(__dirname, "./src/pc-ui-runtime.ts") }] },
  server: { host: true, port: 5107, strictPort: true, origin: process.env.G2_DEV_ORIGIN ?? "http://localhost:5107" },
  preview: { host: true, port: 5107, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    vueJsx(),
    federation({
      name: "streamEnginePages",
      filename: "remoteEntry.js",
      manifest: true,
      dts: false,
      mfRuntime: { role: "remote" },
      exposes: {
        "./FlowformList": "./src/pages/flowform-list.tsx",
        "./FormProcessDesign": "./src/pages/form-process-design.tsx",
        "./WorkOrderDesign": "./src/pages/work-order-design.tsx",
        "./StreamEngineRender": "./src/pages/stream-engine-render.tsx",
        "./ApprovalConfig": "./src/pages/approval-config.tsx",
        "./contractInfo": "./src/contract-info.ts",
      },
      shared: {
        vue: { singleton: true },
        "vue-router": { singleton: true },
      },
    }),
  ],
});
