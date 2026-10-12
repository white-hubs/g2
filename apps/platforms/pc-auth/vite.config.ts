import { federation } from "@g2-tooling/mf-vite";
import tailwindcss from "@tailwindcss/vite";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { defineConfig } from "vite";

export default defineConfig({
  server: { host: true, port: 5010, strictPort: true, origin: process.env.G2_DEV_ORIGIN ?? "http://localhost:5010" },
  preview: { host: true, port: 5010, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  // 冷启动：避免 antd 桶预构建卡死导致壳 hang 在 runPlatformInstalls
  // dayjs 插件必须 include：antd DatePicker 以 ESM default 引用 CJS 插件，否则启动报缺 default export
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
  // Remotes load from the CDN origin (webReleaseBase) — absolute /assets/* would hit the main-site shell.
  experimental: {
    renderBuiltUrl() {
      return { relative: true };
    },
  },
  plugins: [
    vueJsx(),
    tailwindcss(),
    federation({
      name: "pcAuth",
      filename: "remoteEntry.js",
      manifest: true,
      mfRuntime: { role: "remote" },
      exposes: {
        "./platform": "./src/platform.ts",
      },
      shared: { vue: { singleton: true }, "vue-router": { singleton: true } },
    }),
  ],
});
