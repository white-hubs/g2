import { federation } from "@g2-tooling/mf-vite";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@g2-platform\/pc-ui$/,
        replacement: fileURLToPath(new URL("./src/pc-ui-runtime.ts", import.meta.url)),
      },
    ],
  },
  server: { host: true, port: 5051, strictPort: true, origin: "http://localhost:5051" },
  preview: { host: true, port: 5051, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    vueJsx(),
    federation({
      name: "genericEquipmentMonitorPages",
      filename: "remoteEntry.js",
      manifest: true,
      dts: false,
      mfRuntime: { role: "remote" },
      exposes: {
        "./OverView": "./src/pages/over-view.tsx",
        "./EquipmentMonitorList": "./src/pages/equipment-monitor-list.tsx",
        "./EquipmentMonitorDetail": "./src/pages/equipment-monitor-detail.tsx",
        "./AlarmRecord": "./src/pages/alarm-record.tsx",
        "./AlarmDetail": "./src/pages/alarm-detail.tsx",
        "./AlarmRecordSafety": "./src/pages/alarm-record-safety.tsx",
        "./AlarmSafetyDetail": "./src/pages/alarm-safety-detail.tsx",
        "./AlarmConfigList": "./src/pages/alarm-config-list.tsx",
        "./AlarmConfigEnergyList": "./src/pages/alarm-config-energy.tsx",
        "./AlarmConfigureAdd": "./src/pages/alarm-configure-add.tsx",
        "./AlarmStatistic": "./src/pages/alarm-statistic.tsx",
        "./AlarmHandelStatistics": "./src/pages/alarm-handle-statistics.tsx",
        "./AlarmAnalysis": "./src/pages/alarm-analysis.tsx",
        "./ApplicationEquipment": "./src/pages/application-equipment.tsx",
        "./EquipmentAssociation": "./src/pages/equipment-association.tsx",
        "./Configuration": "./src/pages/configuration.tsx",
        "./MessageNotice": "./src/pages/message-notice.tsx",
        "./AlarmHandlerSubmitConfig": "./src/pages/alarm-handler-submit-config.tsx",
        "./pageKeys": "./src/page-keys.ts",
        "./contractInfo": "./src/contract-info.ts",
      },
      shared: {
        vue: { singleton: true },
        // GEM 内的 PcPage 需要读取 Shell Router 注入；不共享会产生独立 vue-router 实例。
        "vue-router": { singleton: true },
      },
    }),
  ],
});
