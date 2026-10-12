import { expect, test } from "bun:test";

import { departmentName, priorityRecord } from "./config";

test("nested departments resolve by stable ID and saves retain existing version", () => {
  expect(departmentName([{ id: "parent", name: "父部门", children: [{ id: "child", name: "子部门" }] }], "child")).toBe("子部门");
  expect(departmentName([], "deleted")).toBe("deleted");
  expect(
    priorityRecord(
      [
        {
          id: "priority",
          code: "departmentId",
          name: "优先部门",
          itemCode: "COMMAND_DISPATCH_PRIORITY_DEPARTMENT",
          variable: "old",
          version: "4",
        },
      ],
      "child",
    ),
  ).toMatchObject({
    id: "priority",
    code: "departmentId",
    itemCode: "COMMAND_DISPATCH_PRIORITY_DEPARTMENT",
    variable: "child",
    version: "4",
  });
  expect(() => priorityRecord([], "")).toThrow("请选择优先部门");
});
