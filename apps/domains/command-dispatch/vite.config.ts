import { federation } from "@g2-tooling/mf-vite";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { defineConfig } from "vite";

export default defineConfig({
  server: { host: true, port: 5082, strictPort: true, origin: process.env.G2_DEV_ORIGIN ?? "http://localhost:5082" },
  preview: { host: true, port: 5082, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    vueJsx(),
    federation({
      name: "commandDispatch",
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
