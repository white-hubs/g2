import { describe, expect, test } from "bun:test";

import { createFormAuditClient } from "./client";

function recorder() {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  const http = {
    get: async (url: string) => {
      calls.push({ method: "GET", url });
      return { records: [], total: 0, pages: 0 };
    },
    post: async (url: string, body?: unknown) => {
      calls.push({ method: "POST", url, body });
      return {};
    },
    put: async (url: string, body?: unknown) => {
      calls.push({ method: "PUT", url, body });
      return {};
    },
    delete: async (url: string) => {
      calls.push({ method: "DELETE", url });
      return {};
    },
  };
  return { calls, client: createFormAuditClient(http) };
}

describe("@g2-client/form-audit", () => {
  test("业务表单与全部记录保留旧服务真实路径", async () => {
    const { calls, client } = recorder();
    await client.pageFlowProcesses({ pageNumber: 1, pageSize: 10, applicationCode: "FORM_ASSESSMENT", type: "ALL" });
    await client.pageAllAppraisalProcesses({ pageNumber: 2, pageSize: 20, status: "ACTIVE" });
    expect(calls.map((item) => item.url)).toEqual([
      "/api/flow/process/instance/historical/page?pageNumber=1&pageSize=10&applicationCode=FORM_ASSESSMENT&type=ALL",
      "/api/form-appraisals/appraisal/process/allPage?pageNumber=2&pageSize=20&status=ACTIVE",
    ]);
  });

  test("考核规则启用接口使用 POST 且编码路径参数", async () => {
    const { calls, client } = recorder();
    await client.updateAppraisalRuleEnabled("rule/1", true);
    expect(calls).toEqual([
      { method: "POST", url: "/api/form-appraisals/form-appraisal-rule/rule%2F1/enabled?enable=true", body: undefined },
    ]);
  });

  test("表单配置启用接口保留 PUT 查询参数", async () => {
    const { calls, client } = recorder();
    await client.updateFormFlowEnabled("form 1", false);
    expect(calls).toEqual([{ method: "PUT", url: "/api/flow/custom-form-flow/enable?id=form+1&enable=false", body: undefined }]);
  });

  test("三类表单分组分别使用旧项目的真实接口", async () => {
    const { calls, client } = recorder();
    await client.listFormGroupCounts({ application: "FORM_ASSESSMENT" });
    await client.listPermissionFormGroups({ application: "FORM_ASSESSMENT", filterEmpty: true });
    await client.listConfigFormGroupTree({ application: "FORM_ASSESSMENT" });
    expect(calls.map((item) => item.url)).toEqual([
      "/api/flow/custom-form-flow/group/count?application=FORM_ASSESSMENT",
      "/api/flow/custom-form-flow/group/permission/count?application=FORM_ASSESSMENT&filterEmpty=true",
      "/api/flow/custom-form-flow/group/tree/permission/count?application=FORM_ASSESSMENT",
    ]);
  });

  test("表单统计保留完整时间范围参数", async () => {
    const { calls, client } = recorder();
    await client.pageWorkOrderStatistics({
      pageNumber: 1,
      pageSize: 10,
      applicationCode: "FORM_ASSESSMENT",
      period: "2026-09-01 00:00:00,2026-09-29 23:59:59",
    });
    expect(calls[0]?.url).toBe(
      "/api/flow/statistics/group/businessType?pageNumber=1&pageSize=10&applicationCode=FORM_ASSESSMENT&period=2026-09-01+00%3A00%3A00%2C2026-09-29+23%3A59%3A59",
    );
  });

  test("考核规则底稿保留巡检与维保真实接口", async () => {
    const { client, calls } = recorder();
    await client.pageInspectPlanDrafts({ pageNumber: 1, pageSize: 20, keyword: "巡检" });
    await client.pageMaintenancePlanDrafts({ pageNumber: 2, pageSize: 20, keyword: "维保" });
    expect(calls[0]?.url).toBe("/api/maintain/inspect-plan/pageV2?pageNumber=1&pageSize=20&keywords=%E5%B7%A1%E6%A3%80");
    expect(calls[1]?.url).toBe("/api/maintain/select-maintenance-plan?pageNumber=2&pageSize=20&maintenancePlanName=%E7%BB%B4%E4%BF%9D");
  });
});
