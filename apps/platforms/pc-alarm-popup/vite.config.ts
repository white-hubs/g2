import { federation } from "@g2-tooling/mf-vite";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { defineConfig } from "vite";

export default defineConfig({
  server: { host: true, port: 5062, strictPort: true, origin: process.env.G2_DEV_ORIGIN ?? "http://localhost:5062" },
  preview: { host: true, port: 5062, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    vueJsx(),
    federation({
      name: "pcAlarmPopup",
      filename: "remoteEntry.js",
      manifest: true,
      mfRuntime: { role: "remote" },
      dts: false,
      exposes: { "./info": "./src/info.ts", "./platform": "./src/platform.ts" },
      shared: { vue: { singleton: true } },
    }),
  ],
});
