import { federation } from "@g2-tooling/mf-vite";
import tailwindcss from "@tailwindcss/vite";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { defineConfig } from "vite";

export default defineConfig({
  server: { host: true, port: 5011, strictPort: true, origin: process.env.G2_DEV_ORIGIN ?? "http://localhost:5011" },
  preview: { host: true, port: 5011, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  // Remotes load from the CDN origin (webReleaseBase) — absolute /assets/* would hit the main-site shell.
  experimental: {
    renderBuiltUrl() {
      return { relative: true };
    },
  },
  // holdUntilCrawlEnd:false — 冷启动预构建期间仍尽量响应 mf-manifest
  // exclude 重型 antd 桶：经 pc-ui 拉入时 rolldown 预构建易卡死事件循环，壳会挂在 runPlatformInstalls
  // dayjs 插件必须 include：antd DatePicker 以 ESM default 引用 CJS 插件，否则启动报缺 default export
  optimizeDeps: {
    holdUntilCrawlEnd: false,
    include: [
      "pinyin-pro",
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
  plugins: [
    vueJsx(),
    tailwindcss(),
    federation({
      name: "pcChrome",
      filename: "remoteEntry.js",
      manifest: true,
      mfRuntime: { role: "remote" },
      exposes: {
        "./info": "./src/info.ts",
        "./platform": "./src/platform.ts",
      },
      shared: { vue: { singleton: true }, "vue-router": { singleton: true } },
    }),
  ],
});
