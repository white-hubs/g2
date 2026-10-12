import { federation } from "@g2-tooling/mf-vite";
import jsxPlugin from "@vitejs/plugin-vue-jsx";
import nodePath from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: { alias: { "@": nodePath.resolve(__dirname, "./src") } },
  server: { host: true, port: 5117, strictPort: true, origin: process.env.G2_DEV_ORIGIN ?? "http://localhost:5117" },
  preview: { host: true, port: 5117, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    jsxPlugin(),
    federation({
      name: "electronicPatrol",
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
