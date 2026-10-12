import { federation } from "@g2-tooling/mf-vite";
import vueJsx from "@vitejs/plugin-vue-jsx";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: { host: true, port: 5054, strictPort: true, origin: process.env.G2_DEV_ORIGIN ?? "http://localhost:5054" },
  preview: { host: true, port: 5054, strictPort: true },
  resolve: {
    alias: {
      "@ghcloud/cube-dictionary-service": path.join(root, "src/shims/cube-dictionary-service.ts"),
    },
  },
  build: { target: "chrome89", modulePreload: false },
  optimizeDeps: {
    include: ["@amap/amap-jsapi-loader"],
    // markercluster 依赖全局 L；预构建易丢 L 引用，交由运行时 side-effect import
    exclude: ["leaflet.markercluster"],
  },
  plugins: [
    vueJsx(),
    federation({
      name: "pcMap",
      filename: "remoteEntry.js",
      manifest: true,
      mfRuntime: { role: "remote" },
      dts: false,
      exposes: {
        "./info": "./src/info.ts",
        "./index": "./src/index.ts",
        "./platform": "./src/platform-module.ts",
      },
      shared: { vue: { singleton: true } },
    }),
  ],
});
