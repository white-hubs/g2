import type { EnergyConsumptionClient } from "@g2-client/energy-consumption/client";
import type { DomainModule } from "@g2-composition/contract";
import dayjs from "dayjs";

import { APPLICATION_CODE_KEY, DOMAIN_CONTEXT_KEY, installEnergyConsumptionContext } from "./domain-context";
import "dayjs/locale/zh-cn";

import { hostEnergyGemPage } from "./gem-page-host";
import { installEnergyConsumptionPcUi } from "./pc-ui-runtime";
import { installCssStyleIndexedGuard } from "./utils/css-style-indexed-guard";

import "./assets/style.less";

dayjs.locale("zh-cn");
installCssStyleIndexedGuard();

const BASE = "/d/energy-consumption";

const domainModule: DomainModule = {
  routes: [
    {
      path: BASE,
      name: "energy-consumption-home",
      meta: { title: "能碳管理" },
      redirect: `${BASE}/energy-overview`,
    },
    // 能耗分析
    {
      path: `${BASE}/energy-overview`,
      name: "energy-overview",
      meta: { title: "能耗总览" },
      component: () => import("./views/energy/energy-overview").then((m) => m.EnergyOverview),
    },
    {
      path: `${BASE}/energy-statistics`,
      name: "energy-statistics",
      meta: { title: "碳排统计" },
      component: () => import("./views/energy/energy-statistics").then((m) => m.EnergyStatistics),
    },
    {
      path: `${BASE}/energy-synthesize`,
      name: "energy-synthesize",
      meta: { title: "综合能耗" },
      component: () => import("./views/energy/energy-synthesize").then((m) => m.EnergySynthesize),
    },
    {
      path: `${BASE}/dosage-analysis`,
      name: "dosage-analysis",
      meta: { title: "用量分析" },
      component: () => import("./views/energy/dosage-analysis").then((m) => m.DosageAnalysisPage),
    },
    {
      path: `${BASE}/load-prediction`,
      name: "load-prediction",
      meta: { title: "负荷预测" },
      component: () => import("./views/energy/load-prediction").then((m) => m.LoadPrediction),
    },
    // 费用管理
    {
      path: `${BASE}/fee-overview`,
      name: "fee-overview",
      meta: { title: "费用总览" },
      component: () => import("./views/fee/fee-overview").then((m) => m.FeeOverview),
    },
    {
      path: `${BASE}/fee-report`,
      name: "fee-report",
      meta: { title: "费用报表" },
      component: () => import("./views/fee/fee-report").then((m) => m.FeeReport),
    },
    {
      path: `${BASE}/fee-calculation-rules`,
      name: "fee-calculation-rules",
      meta: { title: "费用计算规则" },
      component: () => import("./views/fee/fee-calculation-rules").then((m) => m.FeeCalculationRules),
    },
    {
      path: `${BASE}/district-fee`,
      name: "district-fee",
      meta: { title: "分区费用" },
      component: () => import("./views/fee/district-fee").then((m) => m.DistrictFee),
    },
    {
      path: `${BASE}/fee-settings`,
      name: "fee-settings",
      meta: { title: "费用设置" },
      component: () => import("./views/fee/fee-settings").then((m) => m.FeeSettings),
    },
    {
      path: `${BASE}/fee-settings/electric`,
      name: "fee-settings-electric",
      meta: { title: "电费配置", hideInMenu: true, activeMenuPath: `${BASE}/fee-overview` },
      component: () => import("./views/fee/fee-settings-electric").then((m) => m.FeeSettingsElectric),
    },
    {
      path: `${BASE}/fee-settings/water`,
      name: "fee-settings-water",
      meta: { title: "水费配置", hideInMenu: true, activeMenuPath: `${BASE}/fee-overview` },
      component: () => import("./views/fee/fee-settings-water").then((m) => m.FeeSettingsWater),
    },
    {
      path: `${BASE}/fee-settings/gas`,
      name: "fee-settings-gas",
      meta: { title: "燃气费配置", hideInMenu: true, activeMenuPath: `${BASE}/fee-overview` },
      component: () => import("./views/fee/fee-settings-gas").then((m) => m.FeeSettingsGas),
    },
    // 能耗报表
    {
      path: `${BASE}/usage-report`,
      name: "usage-report",
      meta: { title: "用量报表" },
      component: () => import("./views/report/usage-report").then((m) => m.UsageReport),
    },
    {
      path: `${BASE}/carbon-emission-report`,
      name: "carbon-emission-report",
      meta: { title: "碳排报表" },
      component: () => import("./views/report/carbon-emission-report").then((m) => m.CarbonEmissionReport),
    },
    {
      path: `${BASE}/comprehensive-report`,
      name: "comprehensive-report",
      meta: { title: "综合能耗报表" },
      component: () => import("./views/report/comprehensive-report").then((m) => m.ComprehensiveReport),
    },
    // 能耗配置
    {
      path: `${BASE}/associated-devices`,
      name: "associated-devices",
      meta: { title: "关联设备" },
      component: () => import("./views/config/associated-devices").then((m) => m.AssociatedDevices),
    },
    {
      path: `${BASE}/classify-settings`,
      name: "classify-settings",
      meta: { title: "分类设置" },
      component: () => import("./views/config/classify-settings").then((m) => m.ClassifySettings),
    },
    {
      path: `${BASE}/sub-item-settings`,
      name: "sub-item-settings",
      meta: { title: "分项配置" },
      component: () => import("./views/config/sub-item-settings").then((m) => m.SubItemSettings),
    },
    {
      path: `${BASE}/area-configure`,
      name: "area-configure",
      meta: { title: "区域配置" },
      component: () => import("./views/config/area-configure").then((m) => m.AreaConfigure),
    },
    {
      path: `${BASE}/peak-valley-periods`,
      name: "peak-valley-periods",
      meta: { title: "峰平谷设置" },
      component: () => import("./views/config/peak-valley-periods").then((m) => m.PeakValleyPeriodsPage),
    },
    {
      path: `${BASE}/energy-usage-setting`,
      name: "energy-usage-setting",
      meta: { title: "用能设置" },
      component: () => import("./views/config/energy-usage-setting").then((m) => m.EnergyUsageSetting),
    },
    // 计量设备
    {
      path: `${BASE}/device/list`,
      name: "device-list",
      meta: { title: "设备列表" },
      component: () => import("./views/device/device-list").then((m) => m.DeviceListPage),
    },
    {
      path: `${BASE}/device/detail`,
      name: "device-detail",
      meta: { title: "设备列表详情", hideInMenu: true, activeMenuPath: `${BASE}/device/list` },
      component: () => import("./views/device/device-detail").then((m) => m.DeviceDetail),
    },
    {
      path: `${BASE}/device/record`,
      name: "device-record",
      meta: { title: "采集读数记录" },
      component: () => import("./views/device/device-record").then((m) => m.DeviceRecord),
    },
    {
      path: `${BASE}/device/cycle`,
      name: "device-cycle",
      meta: { title: "采集策略" },
      component: () => import("./views/device/device-cycle").then((m) => m.DeviceCycle),
    },
    // 设备报警由 GEM 页面库提供，但必须由能碳 Domain 注入 ENERGY_CONSUMPTION 上下文。
    {
      path: `${BASE}/alarm-record`,
      name: "energy-alarm-record",
      meta: { title: "报警列表" },
      component: () => hostEnergyGemPage("AlarmRecord", { pageProps: { title: "报警列表" } }),
    },
    {
      path: `${BASE}/alarm-detail`,
      name: "energy-alarm-detail",
      meta: { title: "报警详情", hideInMenu: true, activeMenuPath: `${BASE}/alarm-record` },
      component: () => hostEnergyGemPage("AlarmDetail", { idAs: "alarmId", pageProps: { title: "报警详情" } }),
    },
    {
      path: `${BASE}/alarm-config-list`,
      name: "energy-alarm-config-list",
      meta: { title: "报警配置" },
      component: () => hostEnergyGemPage("AlarmConfigList", { pageProps: { title: "报警配置" } }),
    },
    {
      path: `${BASE}/alarm-configure`,
      name: "energy-alarm-configure",
      meta: { title: "报警规则配置", hideInMenu: true, activeMenuPath: `${BASE}/alarm-config-list` },
      component: () => hostEnergyGemPage("AlarmConfigureAdd", { idAs: "ruleId", pageProps: { title: "报警规则配置" } }),
    },
  ],
  menuContribution: [
    {
      label: "能耗总览",
      iconKey: "energy-consumption",
      entry: "energy-overview",
      path: `${BASE}/energy-overview`,
    },
    {
      label: "计量设备",
      iconKey: "energy-device",
      children: [
        { label: "设备列表", entry: "device-list", path: `${BASE}/device/list` },
        { label: "采集读数记录", entry: "device-record", path: `${BASE}/device/record` },
        { label: "采集策略", entry: "device-cycle", path: `${BASE}/device/cycle` },
      ],
    },
    {
      label: "设备报警",
      iconKey: "energy-alarm",
      children: [
        { label: "报警列表", entry: "alarm-record", path: `${BASE}/alarm-record` },
        { label: "报警配置", entry: "alarm-config-list", path: `${BASE}/alarm-config-list` },
      ],
    },
    {
      label: "能耗分析",
      iconKey: "energy-analysis",
      children: [
        { label: "碳排统计", entry: "energy-statistics", path: `${BASE}/energy-statistics` },
        { label: "综合能耗", entry: "energy-synthesize", path: `${BASE}/energy-synthesize` },
        { label: "用能分析", entry: "dosage-analysis", path: `${BASE}/dosage-analysis` },
      ],
    },
    {
      label: "能耗报表",
      iconKey: "energy-report",
      children: [
        { label: "用能报表", entry: "usage-report", path: `${BASE}/usage-report` },
        { label: "碳排报表", entry: "carbon-emission-report", path: `${BASE}/carbon-emission-report` },
        { label: "综合能耗报表", entry: "comprehensive-report", path: `${BASE}/comprehensive-report` },
      ],
    },
    {
      label: "能耗设置",
      iconKey: "energy-config",
      children: [
        { label: "峰平谷时段设置", entry: "peak-valley-periods", path: `${BASE}/peak-valley-periods` },
        { label: "能耗分类设置", entry: "classify-settings", path: `${BASE}/classify-settings` },
        { label: "能耗分项设置", entry: "sub-item-settings", path: `${BASE}/sub-item-settings` },
        { label: "业务区域设置", entry: "area-configure", path: `${BASE}/area-configure` },
        { label: "用能设置", entry: "energy-usage-setting", path: `${BASE}/energy-usage-setting` },
      ],
    },
    {
      label: "能耗费用",
      iconKey: "energy-fee",
      children: [
        { label: "费用总览", entry: "fee-overview", path: `${BASE}/fee-overview` },
        { label: "费用报表", entry: "fee-report", path: `${BASE}/fee-report` },
        { label: "费用计算规则", entry: "fee-calculation-rules", path: `${BASE}/fee-calculation-rules` },
      ],
    },
  ],
  async install(app, ctx, config) {
    await installEnergyConsumptionPcUi(ctx);
    await ctx.loadPlatform("pcUi", "platform");
    await ctx.loadPlatform("pcChart", "platform");
    // 设备详情关联监控 CubePlayer
    await ctx.loadPlatform("pcPlayer", "platform");
    const client = await ctx.ensureClient<EnergyConsumptionClient>("energyConsumptionClient");
    const applicationCode =
      typeof config?.applicationCode === "string" && config.applicationCode ? config.applicationCode : "energy-consumption";
    installEnergyConsumptionContext(ctx, client, applicationCode);
    app.provide(DOMAIN_CONTEXT_KEY, ctx);
    app.provide(APPLICATION_CODE_KEY, applicationCode);
  },
};

export default domainModule;
