import { federation } from "@g2-tooling/mf-vite";
import vueJsx from "@vitejs/plugin-vue-jsx";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: { host: true, port: 5074, strictPort: true, origin: process.env.G2_DEV_ORIGIN ?? "http://localhost:5074" },
  preview: { host: true, port: 5074, strictPort: true },
  // Exclude heavy antd barrels (rolldown can hang). Include amap so CJS default
  // export works when pc-map is pulled into this remote under Module Federation.
  // dayjs 插件必须 include：antd DatePicker 以 ESM default 引用 CJS 插件，否则启动报缺 default export
  // leaflet.markercluster 仅作依赖解析（域侧直解 pc-map 源码）；勿 include 预构建，rolldown 易卡死进程
  optimizeDeps: {
    holdUntilCrawlEnd: false,
    include: [
      "@amap/amap-jsapi-loader",
      "dayjs",
      "dayjs/plugin/advancedFormat",
      "dayjs/plugin/customParseFormat",
      "dayjs/plugin/localeData",
      "dayjs/plugin/quarterOfYear",
      "dayjs/plugin/weekday",
      "dayjs/plugin/weekOfYear",
      "dayjs/plugin/weekYear",
    ],
    exclude: ["@ant-design/icons-vue", "ant-design-vue", "leaflet.markercluster"],
  },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    vueJsx(),
    federation({
      name: "emergencyDispatch",
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
