import { usePcForm } from "@g2-platform/pc-ui";
import { describe, expect, test } from "bun:test";

import { settleChangeRequests } from "./change-page";

describe("消费变更明细请求", () => {
  test("统计失败时仍保留成功的列表结果", async () => {
    const events: string[] = [];
    await settleChangeRequests(Promise.resolve({ records: [{ id: "1" }], total: 1 }), Promise.reject(new Error("统计服务不可用")), {
      listLoaded(result) {
        events.push(`list:${result.total}`);
      },
      listFailed() {
        events.push("list:failed");
      },
      statisticsLoaded() {
        events.push("statistics:loaded");
      },
      statisticsFailed() {
        events.push("statistics:failed");
      },
    });
    expect(events).toContain("list:1");
    expect(events).toContain("statistics:failed");
    expect(events).not.toContain("list:failed");
  });

  test("列表无需等待统计接口即可完成", async () => {
    let finishStatistics: (value: number) => void = () => undefined;
    const statisticsRequest = new Promise<number>((resolve) => {
      finishStatistics = resolve;
    });
    const events: string[] = [];
    await settleChangeRequests(Promise.resolve(3), statisticsRequest, {
      listLoaded(result) {
        events.push(`list:${result}`);
      },
      listFailed() {
        events.push("list:failed");
      },
      statisticsLoaded(result) {
        events.push(`statistics:${result}`);
      },
      statisticsFailed() {
        events.push("statistics:failed");
      },
    });
    expect(events).toEqual(["list:3"]);
    finishStatistics(7);
    await Promise.resolve();
    expect(events).toEqual(["list:3", "statistics:7"]);
  });

  test("日期和交易类型草稿变化不会提前提交查询", () => {
    const applied: { transactionType?: number; dates?: string[] } = {};
    let submits = 0;
    const [, formApi] = usePcForm({
      layout: "horizontal",
      cache: false,
      syncStateRef: applied,
      schema: [
        { component: "Select", fieldName: "transactionType", label: "交易类型", componentProps: { onChange: () => undefined } },
        { component: "RangePicker", fieldName: "dates", label: "交易时间", componentProps: { onChange: () => undefined } },
      ],
      handleSubmit() {
        submits += 1;
      },
    });
    formApi.setFieldValue("transactionType", 1);
    formApi.handleValuesChange(
      { transactionType: 1 },
      { fieldName: "transactionType", component: "Select", trigger: "change", hasCustomOnChange: true },
    );
    formApi.setFieldValue("dates", ["2026-09-01", "2026-09-30"]);
    formApi.handleValuesChange(
      { dates: ["2026-09-01", "2026-09-30"] },
      { fieldName: "dates", component: "RangePicker", trigger: "change", hasCustomOnChange: true },
    );
    expect(submits).toBe(0);
    expect(applied.transactionType).toBeUndefined();
    formApi.handleSubmit();
    expect(submits).toBe(1);
    expect(applied.transactionType).toBe(1);
  });
});
