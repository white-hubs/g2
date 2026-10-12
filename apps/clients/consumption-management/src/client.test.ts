import { describe, expect, test } from "bun:test";

import { createConsumptionManagementClient } from "./client";

function recorder(response?: unknown) {
  const calls: string[] = [];
  const http = {
    get: async (url: string) => {
      calls.push(url);
      if (response !== undefined) {
        return response;
      }
      if (url.includes("/account-status") || url.includes("/transaction-type") || url.includes("/record-type")) {
        return { code: 200, data: [] };
      }
      if (url.includes("/classification") || url.includes("/statistics")) {
        return { code: 200, data: { map: {} } };
      }
      if (url.includes("/account-details/") || url.includes("/account-info/")) {
        return { code: 200, data: {} };
      }
      return { code: 200, data: { records: [], total: 0, pages: 0 } };
    },
  };
  return { calls, client: createConsumptionManagementClient(http) };
}

describe("consumption-management client", () => {
  test("账户列表、详情和账户类型沿用旧 onecard 接口", async () => {
    const { calls, client } = recorder();
    await client.pageAccounts({ pageNumber: 2, pageSize: 20, enterParam: "张三/1", accountName: "现金账户" });
    await client.getAccountDetail("a/b");
    await client.listAccountStatuses();
    expect(calls).toEqual([
      "/api/onecard/accountInfo?pageNumber=2&pageSize=20&enterParam=%E5%BC%A0%E4%B8%89%2F1&accountName=%E7%8E%B0%E9%87%91%E8%B4%A6%E6%88%B7",
      "/api/onecard/account-details/a%2Fb",
      "/api/onecard/account-status",
    ]);
  });

  test("金额与份变更保留分页、交易类型、时间段和统计参数", async () => {
    const { calls, client } = recorder();
    const period = "2026-09-01 00:00:00,2026-09-30 23:59:59";
    const query = { pageNumber: 1, pageSize: 10, enterParam: "张三", transactionType: 7, period };
    await client.pageAmountChanges(query);
    await client.pageCopiesChanges(query);
    await client.getAmountChangeClassification({ enterParam: "张三", period });
    await client.getShareStatistics({ enterParam: "张三", period });
    await client.listTransactionTypes();
    expect(calls).toEqual([
      "/api/onecard/amount-change-record?pageNumber=1&pageSize=10&enterParam=%E5%BC%A0%E4%B8%89&transactionType=7&period=2026-09-01+00%3A00%3A00%2C2026-09-30+23%3A59%3A59",
      "/api/onecard/copies-change-record?pageNumber=1&pageSize=10&enterParam=%E5%BC%A0%E4%B8%89&transactionType=7&period=2026-09-01+00%3A00%3A00%2C2026-09-30+23%3A59%3A59",
      "/api/onecard/amount-change-classification?enterParam=%E5%BC%A0%E4%B8%89&period=2026-09-01+00%3A00%3A00%2C2026-09-30+23%3A59%3A59",
      "/api/onecard/share-statistics?enterParam=%E5%BC%A0%E4%B8%89&period=2026-09-01+00%3A00%3A00%2C2026-09-30+23%3A59%3A59",
      "/api/onecard/transaction-type",
    ]);
  });

  test("金额与份导出均请求正确路径并返回 Blob", async () => {
    const file = new Blob(["xlsx"], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const { calls, client } = recorder(file);
    const query = { transactionType: 1, enterParam: "", period: "2026-09-01 00:00:00,2026-09-30 23:59:59" };
    expect(await client.exportAmountChanges(query)).toBe(file);
    expect(await client.exportCopiesChanges(query)).toBe(file);
    expect(calls).toEqual([
      "/api/onecard/amount-record-excel?transactionType=1&period=2026-09-01+00%3A00%3A00%2C2026-09-30+23%3A59%3A59",
      "/api/onecard/copies-record-excel?transactionType=1&period=2026-09-01+00%3A00%3A00%2C2026-09-30+23%3A59%3A59",
    ]);
  });

  test("个人消费记录保留当前账户 ID、交易类型、分页和旧账户详情查询参数", async () => {
    const { calls, client } = recorder();
    await client.pageConsumeRecords({
      pageNumber: 3,
      pageSize: 15,
      accountId: "user/1",
      interfaceEnum: 2,
      period: "2026-09-01,2026-09-30",
    });
    await client.getConsumeAccountInfo("user/1");
    await client.listConsumeRecordTypes();
    expect(calls).toEqual([
      "/api/onecard/consume-record-out/page?pageNumber=3&pageSize=15&accountId=user%2F1&interfaceEnum=2&period=2026-09-01%2C2026-09-30&enterParam=",
      "/api/onecard/account-info/user%2F1?id=user%2F1",
      "/api/onecard/consume-record-out/record-type",
    ]);
  });

  test("返回值解包并保留服务错误，不把异常当空列表", async () => {
    const row = { id: "account-1", userName: "张三" };
    const { client } = recorder({ code: 200, data: { records: [row], total: 1, pages: 1 } });
    expect(await client.pageAccounts({ pageNumber: 1, pageSize: 10 })).toEqual({ records: [row], total: 1, pages: 1 });
    const failed = recorder({ code: 500, data: null, message: "服务不可用" });
    expect(failed.client.pageAccounts({ pageNumber: 1, pageSize: 10 })).rejects.toThrow("服务不可用");
  });
});
