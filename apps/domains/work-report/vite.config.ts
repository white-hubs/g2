import { federation } from "@g2-tooling/mf-vite";
import jsxPlugin from "@vitejs/plugin-vue-jsx";
import path from "node:path";
import { defineConfig as viteDefineConfig } from "vite";
export default viteDefineConfig({
  resolve: { alias: [{ find: /^@g2-platform\/pc-ui$/u, replacement: path.resolve(__dirname, "./src/pc-ui-runtime.ts") }] },
  server: { host: true, port: 5137, strictPort: true, origin: process.env.G2_DEV_ORIGIN ?? "http://localhost:5137" },
  preview: { host: true, port: 5137, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    jsxPlugin(),
    federation({
      name: "workReport",
      filename: "remoteEntry.js",
      manifest: true,
      dts: false,
      mfRuntime: { role: "remote" },
      exposes: { "./domain": "./src/domain.ts" },
      shared: { vue: { singleton: true }, "vue-router": { singleton: true } },
    }),
  ],
});
