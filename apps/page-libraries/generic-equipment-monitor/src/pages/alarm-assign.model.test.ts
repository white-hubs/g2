import { describe, expect, test } from "bun:test";

import { flattenOrganizations, formatUserGender, formatUserPositions, formatWorkStatus, mapUsersToAssignRows } from "./alarm-assign.model";

describe("alarm-assign.model", () => {
  test("flattenOrganizations flattens tree", () => {
    expect(flattenOrganizations([{ id: "o1", name: "总部", children: [{ id: "o2", name: "工程部" }] }])).toEqual([
      { label: "总部", value: "o1" },
      { label: "工程部", value: "o2" },
    ]);
  });

  test("mapUsersToAssignRows maps department from organizations[0]", () => {
    expect(
      mapUsersToAssignRows([
        {
          id: "u1",
          name: "张三",
          organizations: [{ id: "d1", name: "安保部" }],
        },
      ]),
    ).toEqual([
      {
        userId: "u1",
        userName: "张三",
        departmentId: "d1",
        departmentName: "安保部",
      },
    ]);
  });

  test("display helpers match legacy labels", () => {
    expect(formatUserGender("MALE")).toBe("男");
    expect(formatUserPositions([{ name: "班长" }, { name: "队员" }])).toBe("班长,队员");
    expect(formatWorkStatus("WORKING")).toBe("在岗");
  });
});
