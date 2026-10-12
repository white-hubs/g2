import { assertDomainModule, createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import domainModule from "./domain";

describe("@g2-domain/daily-task", () => {
  test("列表页只保留 PageLayout 的底部横向滚动条", () => {
    const source = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
    expect(source).toContain("overflow-x: hidden !important");
    expect(source).toContain("scrollbar-width: none");
  });
  test("声明完整旧应用路由与菜单", () => {
    const result = assertDomainModule(domainModule);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const paths = result.module.routes.map((route) => route.path);
    expect(paths).toContain("/d/daily-task/task-plan");
    expect(paths).toContain("/d/daily-task/task-list");
    expect(paths).toContain("/d/daily-task/task-record");
    expect(paths).toContain("/d/daily-task/message-config");
    expect(paths).toHaveLength(18);
  });

  test("在初始化 pcUi 平台前加载 pcUi Runtime Common", async () => {
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

    expect(calls).toEqual(["runtime:pcUi:index", "platform:pcUi:platform", "client:dailyTaskClient"]);
  });

  test("菜单层级与线上日常任务一致", () => {
    const menu = domainModule.menuContribution?.[0];
    expect(menu?.label).toBe("日常任务");
    expect(menu?.children?.map((item) => item.label)).toEqual(["任务计划", "日常任务", "业务配置", "草稿箱", "消息配置"]);
    expect(menu?.children?.find((item) => item.label === "业务配置")?.children?.map((item) => item.label)).toEqual([
      "任务类型",
      "紧急等级",
      "任务周期",
      "任务标准",
      "标准项",
      "任务结果",
    ]);
    expect(menu?.children?.some((item) => item.label === "任务记录")).toBe(false);
  });

  test("日常巡检新使用独立业务类型并保持线上菜单层级", () => {
    const menu = domainModule.menuContribution?.[1];
    expect(menu?.label).toBe("日常巡检新");
    expect(menu?.children?.map((item) => item.label)).toEqual(["任务计划", "日常任务", "业务设置", "草稿箱", "消息配置"]);
    expect(menu?.children?.find((item) => item.label === "业务设置")?.children?.map((item) => item.label)).toEqual([
      "任务类型",
      "紧急等级",
      "任务周期",
      "任务标准",
      "标准项",
      "任务结果",
    ]);
    expect(menu?.children?.[0]?.path).toBe("/d/daily-task/task-plan?dailyType=DAILY_INSPECTION");
    expect(menu?.children?.[1]?.path).toBe("/d/daily-task/task-list?dailyType=DAILY_INSPECTION");
  });
});
