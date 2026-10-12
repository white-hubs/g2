import { federation } from "@g2-tooling/mf-vite";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { defineConfig } from "vite";

export default defineConfig({
  server: { host: true, port: 5015, strictPort: true, origin: process.env.G2_DEV_ORIGIN ?? "http://localhost:5015" },
  preview: { host: true, port: 5015, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    vueJsx(),
    federation({
      name: "httpPlatform",
      filename: "remoteEntry.js",
      manifest: true,
      mfRuntime: { role: "remote" },
      exposes: {
        "./info": "./src/info.ts",
        "./client": "./src/platform.ts",
        "./errors": "./src/errors.ts",
        "./platform": "./src/platform-module.ts",
      },
      shared: { vue: { singleton: true } },
    }),
  ],
});
