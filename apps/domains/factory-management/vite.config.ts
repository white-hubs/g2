import { federation } from "@g2-tooling/mf-vite";
import jsxPlugin from "@vitejs/plugin-vue-jsx";
import nodePath from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@g2-platform\/pc-ui$/u, replacement: nodePath.resolve(__dirname, "./src/pc-ui-runtime.ts") },
      { find: "@", replacement: nodePath.resolve(__dirname, "./src") },
    ],
  },
  server: { host: true, port: 5125, strictPort: true, origin: process.env.G2_DEV_ORIGIN ?? "http://localhost:5125" },
  preview: { host: true, port: 5125, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    jsxPlugin(),
    federation({
      name: "factoryManagement",
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
