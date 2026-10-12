import { federation } from "@g2-tooling/mf-vite";
import vueJsx from "@vitejs/plugin-vue-jsx";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@g2-platform\/pc-ui$/, replacement: path.resolve(__dirname, "../../../packages/runtime-common-loader/src/pc-ui-proxy.ts") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
  server: { host: true, port: 5086, strictPort: true, origin: process.env.G2_DEV_ORIGIN ?? "http://localhost:5086" },
  preview: { host: true, port: 5086, strictPort: true },
  // 线损领域会经共享页面加载 pc-ui；直接预构建完整 antd 桶会阻塞 manifest，
  // 但 dayjs 插件是 CommonJS，必须单独预构建以保留 default export 互操作。
  optimizeDeps: {
    holdUntilCrawlEnd: false,
    include: [
      "dayjs",
      "dayjs/plugin/advancedFormat",
      "dayjs/plugin/customParseFormat",
      "dayjs/plugin/localeData",
      "dayjs/plugin/quarterOfYear",
      "dayjs/plugin/weekday",
      "dayjs/plugin/weekOfYear",
      "dayjs/plugin/weekYear",
    ],
    exclude: ["@ant-design/icons-vue", "ant-design-vue"],
  },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    vueJsx(),
    federation({
      name: "lineLossManagement",
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
