import { federation } from "@g2-tooling/mf-vite";
import jsxPlugin from "@vitejs/plugin-vue-jsx";
import { defineConfig } from "vite";

export default defineConfig({
  server: { host: true, port: 5205, strictPort: true, origin: process.env.G2_DEV_ORIGIN ?? "http://localhost:5205" },
  preview: { host: true, port: 5205, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [jsxPlugin(), federation({ name: "linkageControl", filename: "remoteEntry.js", manifest: true, dts: false, mfRuntime: { role: "remote" }, exposes: { "./domain": "./src/main.ts" }, shared: { vue: { singleton: true }, "vue-router": { singleton: true } } })],
});
