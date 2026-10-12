import { federation } from "@g2-tooling/mf-vite";
import vueJsx from "@vitejs/plugin-vue-jsx";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  // MF remote 资源必须相对路径；默认 base `/` 会把 png 打成壳根 `/assets/*` 导致 404。
  base: "./",
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: { host: true, port: 5078, strictPort: true, origin: process.env.G2_DEV_ORIGIN ?? "http://localhost:5078" },
  preview: { host: true, port: 5078, strictPort: true },
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
      "echarts",
    ],
    exclude: ["@ant-design/icons-vue", "ant-design-vue"],
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
        // 对齐旧工作台主题色变量，避免卡片主色丢失；不启用 pxtorem，避免根字号差异导致整体缩放错位。
        modifyVars: {
          "ant-prefix": "ant",
        },
      },
    },
  },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    vueJsx(),
    federation({
      name: "workbench",
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
