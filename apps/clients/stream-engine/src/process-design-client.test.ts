import { expect, test } from "bun:test";

import { createStreamEngineClient } from "./client";

test("流程部门和部门岗位职位使用旧配置端OUAA接口", async () => {
  const urls: string[] = [];
  const client = createStreamEngineClient({
    get: async (url) => {
      urls.push(url);
      return {
        data: url.includes("postAndPosition")
          ? { postList: [{ id: "p1", name: "岗位" }], positionList: [{ id: "position1", name: "职位" }] }
          : [{ id: "d1", name: "部门" }],
      };
    },
    post: async () => ({}),
    put: async () => ({}),
    delete: async () => ({}),
  });
  expect(await client.listProcessDepartments()).toEqual([{ id: "d1", name: "部门" }]);
  expect((await client.getDepartmentAssignments("department/1")).postList).toEqual([{ id: "p1", name: "岗位" }]);
  expect(urls).toEqual([
    "/api/ouaa/authenticated/organizations/list?enabled=true",
    "/api/ouaa/organizations/postAndPosition/department%2F1",
  ]);
});
