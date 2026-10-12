import { describe, expect, test } from "bun:test";

import { recordCell, refreshAccountAndRecords } from "./person-record-page";

describe("个人消费记录列表", () => {
  test("悬浮提示保留完整内容，0 不被当作空值", () => {
    expect(recordCell("较长的交易设备名称").props?.content).toBe("较长的交易设备名称");
    expect(recordCell(0).props?.content).toBe("0");
    expect(recordCell(null).props?.content).toBe("--");
  });

  test("刷新账户信息时列表请求不等待账户接口", async () => {
    let finishAccount: () => void = () => undefined;
    const accountRequest = new Promise<void>((resolve) => {
      finishAccount = resolve;
    });
    const events: string[] = [];
    refreshAccountAndRecords(
      async () => {
        events.push("账户请求");
        await accountRequest;
        events.push("账户完成");
      },
      async () => {
        events.push("列表请求");
      },
    );
    expect(events).toEqual(["账户请求", "列表请求"]);
    finishAccount();
    await Promise.resolve();
    expect(events).toEqual(["账户请求", "列表请求", "账户完成"]);
  });
});
