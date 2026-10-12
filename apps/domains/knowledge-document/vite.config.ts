import { federation } from "@g2-tooling/mf-vite";
import jsxPlugin from "@vitejs/plugin-vue-jsx";
import nodePath from "node:path";
import { defineConfig as viteDefineConfig } from "vite";

export default viteDefineConfig({
  resolve: { alias: { "@": nodePath.resolve(__dirname, "./src") } },
  server: { host: true, port: 5121, strictPort: true, origin: process.env.G2_DEV_ORIGIN ?? "http://localhost:5121" },
  preview: { host: true, port: 5121, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    jsxPlugin(),
    federation({
      name: "knowledgeDocument",
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
