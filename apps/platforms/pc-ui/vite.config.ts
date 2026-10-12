import { federation } from "@g2-tooling/mf-vite";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { defineConfig } from "vite";

export default defineConfig({
  server: { host: true, port: 5016, strictPort: true, origin: process.env.G2_DEV_ORIGIN ?? "http://localhost:5016" },
  preview: { host: true, port: 5016, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  // exclude 重型 antd 桶防 rolldown 卡死；但 antd DatePicker 会 ESM-default 引用 dayjs 插件（CJS），
  // 未预构建时会出现 “does not provide an export named 'default'”，故显式 include 这些插件。
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
  plugins: [
    vueJsx(),
    federation({
      name: "pcUi",
      filename: "remoteEntry.js",
      manifest: true,
      mfRuntime: { role: "remote" },
      exposes: {
        "./info": "./src/info.ts",
        "./platform": "./src/platform-module.ts",
        "./index": "./src/index.ts",
        "./button": "./src/button.ts",
        "./table": "./src/table.ts",
        "./modal": "./src/modal.ts",
        "./space": "./src/space.ts",
        "./card": "./src/card.ts",
        "./image": "./src/image.ts",
        "./radio": "./src/radio.ts",
        "./form": "./src/form.ts",
        "./select": "./src/select.ts",
        "./input": "./src/input.ts",
        "./cascader": "./src/cascader.ts",
        "./steps": "./src/steps.ts",
        "./popover": "./src/popover.ts",
        "./popconfirm": "./src/popconfirm.ts",
        "./message": "./src/message.ts",
        "./page": "./src/page.ts",
        "./date-picker": "./src/date-picker.ts",
        "./page-layout": "./src/page-layout.ts",
        "./rich-text-editor": "./src/rich-text-editor.ts",
        "./use-pc-table": "./src/use-pc-table.ts",
        "./use-pc-form": "./src/use-pc-form.ts",
      },
      shared: {
        vue: { singleton: true },
        "vue-router": { singleton: true },
      },
    }),
  ],
});
