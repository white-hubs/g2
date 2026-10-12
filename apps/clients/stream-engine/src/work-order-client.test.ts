import { expect, test } from "bun:test";

import { createStreamEngineClient } from "./client";

test("工单详情、分组和发布使用旧 custom-form-flow 接口，角色范围使用分页 OUAA 接口", async () => {
  const calls: Array<{ method: string; url: string; payload?: unknown }> = [];
  const client = createStreamEngineClient({
    get: async (url) => {
      calls.push({ method: "GET", url });
      return {
        data: url.includes("form-flow-group")
          ? [{ id: 7, name: "作业申请" }]
          : url.includes("/roles")
            ? { records: [{ id: "role1", name: "安全员" }], total: 12 }
            : { id: "custom1", name: "作业工单", shortName: "作业", permissionType: "ROLE", permissionIds: ["role1"] },
      };
    },
    post: async (url, payload) => {
      calls.push({ method: "POST", url, payload });
      return { data: { id: "created" } };
    },
    put: async () => ({}),
    delete: async () => ({}),
  });
  expect((await client.getCustomFormFlow("custom/1")).shortName).toBe("作业");
  expect(await client.listFormFlowGroups({ application: "WORK_PERMIT_MANAGE" })).toEqual([{ id: 7, name: "作业申请" }]);
  expect((await client.pageProcessRoles({ pageNumber: 2, pageSize: 10, name: "安全" })).total).toBe(12);
  const payload = { id: null, shortName: "作业", formGroupId: 7, permissionType: "ROLE", permissionIds: ["role1"], enable: false };
  expect(await client.saveCustomFormFlow(payload)).toEqual({ id: "created" });
  expect(calls).toEqual([
    { method: "GET", url: "/api/flow/custom-form-flow/custom%2F1" },
    { method: "GET", url: "/api/flow/form-flow-group/list?application=WORK_PERMIT_MANAGE" },
    { method: "GET", url: "/api/ouaa/roles?pageNumber=2&pageSize=10&name=%E5%AE%89%E5%85%A8&enabled=true" },
    { method: "POST", url: "/api/flow/custom-form-flow/save-or-update", payload },
  ]);
});
