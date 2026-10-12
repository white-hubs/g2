import { assertDomainModule, createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import domainModule from "./domain";

describe("@g2-domain/daily-inspection domain module", () => {
  test("exposes the legacy daily-inspection route surface through the g2 domain contract", () => {
    const asserted = assertDomainModule(domainModule);
    expect(asserted.ok).toBe(true);
    if (!asserted.ok) {
      return;
    }
    const paths = asserted.module.routes.map((route) => route.path).filter(Boolean);
    expect(paths).toContain("/d/daily-inspection/inspect-plan");
    expect(paths).toContain("/d/daily-inspection/inspect-plan-edit");
    expect(paths).toContain("/d/daily-inspection/inspect-task");
    expect(paths).toContain("/d/daily-inspection/inspect-records");
    expect(paths).toContain("/d/daily-inspection/inspect-archive");
    expect(paths).toContain("/d/daily-inspection/inspect-standard-ai");
    expect(paths).toContain("/d/daily-inspection/inspect-map-config");
    expect(paths).toContain("/d/daily-inspection/site-configuration");
    expect(paths).toContain("/d/daily-inspection/statistics/result");
    expect(asserted.module.routes).toHaveLength(35);
  });

  test("contributes all user-facing inspection menu entries", () => {
    const children = domainModule.menuContribution?.[0]?.children ?? [];
    expect(domainModule.menuContribution?.[0]?.label).toBe("日常巡检");
    expect(children.map((item) => item.entry)).toContain("inspect-plan");
    expect(children.map((item) => item.label)).toEqual([
      "巡检计划",
      "巡检任务",
      "巡检记录",
      "巡检档案",
      "巡检配置",
      "统计分析",
      "智慧巡检任务",
      "智慧巡检计划",
    ]);
    const config = children.find((item) => item.label === "巡检配置");
    const statistics = children.find((item) => item.label === "统计分析");
    expect(config?.children?.map((item) => item.label)).toEqual([
      "巡检周期",
      "巡检标准",
      "巡检项",
      "巡检结果",
      "巡检类型",
      "巡检通知",
      "现场点管理",
      "巡检提交设置",
    ]);
    expect(statistics?.children?.map((item) => item.label)).toEqual([
      "巡检结果统计",
      "部门巡检统计",
      "人员巡检统计",
      "巡检对象统计",
      "任务标准项异常率统计",
      "巡检分析",
    ]);
  });

  test("loads pcUi Runtime Common before the platform and client", async () => {
    const calls: string[] = [];
    const context = createFakeDomainContext({
      loadRuntimeCommon: async (name, entry) => {
        calls.push(`runtime:${name}:${entry}`);
        return {};
      },
      loadPlatform: async (name, entry) => {
        calls.push(`platform:${name}:${entry}`);
        return {};
      },
      ensureClient: async <T>(name: string): Promise<T> => {
        calls.push(`client:${name}`);
        return {} as T;
      },
    });

    await domainModule.install?.(createFakeApp(), context);

    expect(calls).toEqual(["runtime:pcUi:index", "platform:pcUi:platform", "client:dailyInspectionClient"]);
  });

  test("loads pcUi Runtime Common before the platform and client", async () => {
    const calls: string[] = [];
    const context = createFakeDomainContext({
      loadRuntimeCommon: async (name, entry) => {
        calls.push(`runtime:${name}:${entry}`);
        return {};
      },
      loadPlatform: async (name, entry) => {
        calls.push(`platform:${name}:${entry}`);
        return {};
      },
      ensureClient: async <T>(name: string): Promise<T> => {
        calls.push(`client:${name}`);
        return {} as T;
      },
    });

    await domainModule.install?.(createFakeApp(), context);

    expect(calls).toEqual(["runtime:pcUi:index", "platform:pcUi:platform", "client:dailyInspectionClient"]);
  });

  test("task list page exposes export and batch delete like cube", () => {
    const source = readFileSync(new URL("./views/inspection-page.tsx", import.meta.url), "utf8");
    expect(source).toContain("exportTasks");
    expect(source).toContain("批量删除");
    expect(source).toContain("导出");
    expect(source).toContain('rowSelection: "checkbox"');
  });

  test("list pages keep collapse filters and archive/task filter fields like cube", () => {
    const source = readFileSync(new URL("./views/inspection-page.tsx", import.meta.url), "utf8");
    expect(source).toContain("showCollapseButton: true");
    expect(source).toContain("AreaCascaderSelect");
    expect(source).toContain('label: "对象类型"');
    expect(source).toContain('label: "区域"');
    expect(source).toContain('label: "巡检时间"');
    expect(source).toContain('label: "结果来源"');
    expect(source).toContain('label: "任务时限"');
    expect(source).toContain("exportListAsCsv");
  });

  test("statistics pages keep page-specific cube filters and date range controls", () => {
    const source = readFileSync(new URL("./views/inspection-auxiliary-pages.tsx", import.meta.url), "utf8");
    expect(source).toContain("usePcForm");
    expect(source).toContain("cache: false");
    expect(source).toContain('label: "巡检类型"');
    expect(source).toContain('label: "巡检部门"');
    expect(source).toContain('label: "对象类型"');
    expect(source).toContain('label: "巡检区域"');
    expect(source).toContain('component: "RangePicker"');
    expect(source).toContain('kind === "department" ? { depName: query.keyword }');
    expect(source).toContain('{ depName: query.department ?? "", name: query.keyword }');
    expect(source).toContain('{ objType: query.objectType ?? "", area: query.area.at(-1) ?? "", name: query.keyword }');
  });

  test("inspection analysis page wires real charts and inspection-analysis APIs", () => {
    const aux = readFileSync(new URL("./views/inspection-auxiliary-pages.tsx", import.meta.url), "utf8");
    const page = readFileSync(new URL("./views/statistical-analysis/inspection-analyse.tsx", import.meta.url), "utf8");
    expect(aux).toContain('export { InspectionAnalysis } from "./statistical-analysis/inspection-analyse"');
    expect(page).toContain("export default InspectionAnalysis");
    expect(page).toContain('title="巡检分析"');
    expect(page).toContain("showFooter={false}");
    expect(page).toContain("/inspection-analysis/");
    expect(page).toContain("inspectionTaskAnalysis");
    expect(page).toContain("inspectionPlanAnalysis");
    expect(page).toContain("getTargetCategory");
    expect(page).toContain("PlanTypePieChart");
    expect(page).toContain("HorizontalBarChart");
    expect(page).toContain("StackedColumnChart");
  });

  test("map-config page uses leaflet toolbar layout like cube", () => {
    const source = readFileSync(new URL("./views/inspect-config/inspect-map-config/inspect-map-config.tsx", import.meta.url), "utf8");
    expect(source).toContain("搜索定位");
    expect(source).toContain("有效范围半径(米)");
    expect(source).toContain("旋转角度");
    expect(source).toContain("缩放层级");
    expect(source).toContain("DAILY_INSPECTION_MAP_CONFIG");
    expect(source).toContain("InspectMapRuntime");
    expect(source).not.toContain("中心点经度");
    expect(source).not.toContain("地名名称");
  });

  test("domain routes map-config to InspectMapConfig component", () => {
    const source = readFileSync(new URL("./domain.ts", import.meta.url), "utf8");
    expect(source).toContain('"map-config": () => import("./views/inspect-config/inspect-map-config/inspect-map-config")');
  });

  test("AI standard page aligns cube left-object tree and generate/save flow", () => {
    const source = readFileSync(new URL("./views/inspect-config/inspect-standard-ai/inspect-standard-ai.tsx", import.meta.url), "utf8");
    const page = readFileSync(new URL("./views/inspection-page.tsx", import.meta.url), "utf8");
    expect(page).toContain("InspectStandardAi");
    expect(source).toContain('name: "DailyInspectionStandardAi"');
    expect(source).toContain('<PageLayout title="AI巡检标准生成"');
    expect(source).toContain('"layout-content"');
    expect(source).toContain("生成巡检标准");
    expect(source).toContain("batchCreateStandards");
    expect(source).toContain("InspectItemContentTable");
    expect(source).toContain("getIotProductCategoryTree");
    expect(source).not.toContain("daily-inspection-editor-footer");
  });

  test("site configuration keeps cube toolbar and footer-page capabilities", () => {
    const source = readFileSync(new URL("./views/inspect-config/site-configuration/site-configuration.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("./views/inspect-config/site-configuration/site-configuration.module.css", import.meta.url), "utf8");
    const domainSource = readFileSync(new URL("./domain.ts", import.meta.url), "utf8");
    expect(domainSource).toContain(
      'import("./views/inspect-config/site-configuration/site-configuration").then((m) => m.InspectionSiteConfiguration)',
    );
    expect(source).toContain("usePcForm");
    expect(source).toContain('"layout-header"');
    expect(source).toContain("批量导入");
    expect(source).toContain("下载模板");
    expect(source).toContain("二维码");
    expect(source).toContain("请选择部门");
    expect(source).toContain('"footer-page"');
    expect(source).toContain("/inspect/point/download-template");
    expect(source).toContain("/inspect/point/import-template");
    expect(source).toContain("/api/identity/qrcode/generate/batch/download");
    expect(source).toContain("/inspect/point/delete-batch");
    expect(css).toContain("text-overflow: ellipsis");
    expect(css).toContain(".site-type-item:hover .site-type-actions");
    expect(css).toContain("site-type-item-active");
  });

  test("domain routes standard list to InspectStandard instead of createConfigPage", () => {
    const source = readFileSync(new URL("./domain.ts", import.meta.url), "utf8");
    expect(source).toContain('"config-standard": () => import("./views/inspect-config/inspect-standard/inspect-standard")');
    expect(source).toContain("InspectStandard");
  });

  test("standard list has left tabs 设备/档位 and defaultStandard switch", () => {
    const source = readFileSync(new URL("./views/inspect-config/inspect-standard/inspect-standard.tsx", import.meta.url), "utf8");
    expect(source).toContain('name: "设备"');
    expect(source).toContain('name: "档位"');
    expect(source).toContain('name: "资产"');
    expect(source).toContain('name: "现场点"');
    expect(source).toContain('name: "风险源"');
    expect(source).toContain('name: "小散工程"');
    expect(source).toContain("defaultStandard");
    expect(source).toContain("showCollapseButton: true");
    expect(source).toContain("targetTypeEq");
    expect(source).toContain("AI自动生成");
  });

  test("association-tabs uses DevicePane checkbox tree instead of 类型ID stub", () => {
    const source = readFileSync(
      new URL("./views/inspect-config/inspect-standard-form/components/association-tabs/association-tabs.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toContain("DevicePane");
    expect(source).toContain("checkbox");
    expect(source).toContain("getIotProductCategoryTree");
    expect(source).not.toContain("类型ID");
  });

  test("plan-edit page is wired to InspectPlanEdit instead of the stub editor", () => {
    const source = readFileSync(new URL("./views/inspection-page.tsx", import.meta.url), "utf8");
    expect(source).toContain('from "@/views/inspect-plan/inspect-plan-edit/inspect-plan-edit"');
    expect(source).toContain('if (name === "plan-edit") return InspectPlanEdit');
    expect(source).not.toContain('if (name === "plan-edit") return createEditorPage("plan")');
  });

  test("object select modal uses tabbed area tree instead of single select", () => {
    const source = readFileSync(new URL("./compat/object-select-modal.tsx", import.meta.url), "utf8");
    expect(source).toContain("AreaTreeSelectTable");
    expect(source).toContain("区域名称");
    expect(source).toContain("区域编号");
    expect(source).toContain("<Tabs");
    expect(source).toContain("已选");
    expect(source).toContain("label: OBJECT_SELECT_TAB_LABELS[ObjectType.STALL]");
    expect(source).toMatch(/\[ObjectType\.STALL\]:\s*"档位"/);
    expect(source).not.toMatch(/\[ObjectType\.STALL\]:\s*"点位"/);
    // 禁止退回图1 的下拉切换形态
    expect(source).not.toContain('style={{ width: "180px", marginBottom: "12px" }}');
  });

  test("daily inspection businessType is empty string like cube service", () => {
    const source = readFileSync(new URL("./compat/constants.ts", import.meta.url), "utf8");
    expect(source).toMatch(/DAILY_INSPECTION:\s*""/);
    expect(source).not.toMatch(/DAILY_INSPECTION:\s*"DAILY_INSPECTION"/);
  });

  test("inspect items form uses content table columns like cube", () => {
    const formSource = readFileSync(new URL("./views/inspect-config/inspect-items-form/inspect-items-form.tsx", import.meta.url), "utf8");
    const tableSource = readFileSync(
      new URL("./components/inspect-item-content-table/inspect-item-content-table.tsx", import.meta.url),
      "utf8",
    );
    expect(formSource).toContain("InspectItemContentTable");
    expect(formSource).toContain("resultItemValue");
    expect(formSource).toContain("itemTag");
    expect(tableSource).toContain("内容描述");
    expect(tableSource).toContain("默认结果");
    expect(tableSource).toContain("必须拍照");
    expect(tableSource).toContain("必须备注");
    expect(tableSource).toContain("标签");
  });

  test("inspect items list filters include referType and collapse like cube", () => {
    const source = readFileSync(new URL("./views/inspection-page.tsx", import.meta.url), "utf8");
    expect(source).toContain('label: "适用对象"');
    expect(source).toContain("referType");
    expect(source).toContain("showCollapseButton: true");
    expect(source).toContain('placeholder: "巡检项名称"');
  });

  test("standard form items tab uses InspectItemContentTable like cube", () => {
    const source = readFileSync(new URL("./views/inspect-config/inspect-standard-form/inspect-standard-form.tsx", import.meta.url), "utf8");
    expect(source).toContain("InspectItemContentTable");
    expect(source).toContain("调用巡检项");
    expect(source).toContain('tab="基础信息"');
    expect(source).toContain('tab="巡检项"');
    expect(source).not.toContain("类型ID");
  });
});
