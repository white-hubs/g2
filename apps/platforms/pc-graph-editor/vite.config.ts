import { federation } from "@g2-tooling/mf-vite";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: { dedupe: ["tslib"] },
  server: { host: true, port: 5058, strictPort: true, origin: process.env.G2_DEV_ORIGIN ?? "http://localhost:5058" },
  preview: { host: true, port: 5058, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    vueJsx(),
    federation({
      name: "pcGraphEditor",
      filename: "remoteEntry.js",
      manifest: true,
      mfRuntime: { role: "remote" },
      dts: false,
      exposes: {
        "./info": "./src/info.ts",
        "./index": "./src/index.ts",
        "./LineLoss": "./src/LineLoss.ts",
        "./platform": "./src/platform-module.ts",
      },
      shared: {
        vue: { singleton: true },
        "@g2-platform/pc-ui": { singleton: true },
      },
    }),
  ],
});
