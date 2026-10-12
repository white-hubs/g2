import { federation } from "@g2-tooling/mf-vite";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { defineConfig } from "vite";
export default defineConfig({
  server: { host: true, port: 5142, strictPort: true, origin: process.env.G2_DEV_ORIGIN ?? "http://localhost:5142" },
  build: { target: "esnext", modulePreload: false },
  plugins: [
    vueJsx(),
    federation({
      name: "secureEduPages",
      filename: "remoteEntry.js",
      manifest: true,
      dts: false,
      mfRuntime: { role: "remote" },
      exposes: { "./pages": "./src/index.ts" },
      shared: { vue: { singleton: true }, "vue-router": { singleton: true } },
    }),
  ],
});
