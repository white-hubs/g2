import { describe, expect, test } from "bun:test";

import { buildAppCodeToGroupKeyIndex, firstPathFromLegacyMenus, lookupGroupKeyForAppRef } from "./app-code-group-index";

describe("buildAppCodeToGroupKeyIndex", () => {
  test("从 terminal-application-groups 的 applicationPageVOS 建 code→groupKey", () => {
    const index = buildAppCodeToGroupKeyIndex([
      {
        id: "g-ops",
        name: "运维管理",
        applicationPageVOS: [
          { code: "hazard", name: "隐患排查@" },
          { code: "maintenance", name: "维保作业@" },
        ],
      },
      {
        id: "g-internal",
        applicationPageVOS: [{ code: "hr", name: "人事管理@" }],
      },
    ]);
    expect(index.get("hazard")).toBe("g-ops");
    expect(index.get("maintenance")).toBe("g-ops");
    expect(index.get("hr")).toBe("g-internal");
  });

  test("同时用应用 path 的 /portal/{name} 段建索引，供深链只拉一个分组", () => {
    const index = buildAppCodeToGroupKeyIndex([
      {
        id: "g-a",
        applicationPageVOS: [{ code: "uuid-1", path: "/portal/other-app/list" }],
      },
      {
        id: "g-video",
        applicationPageVOS: [{ code: "uuid-video", path: "/portal/video-monitor-auth/ai-inspection/plans" }],
      },
    ]);
    expect(lookupGroupKeyForAppRef(index, "video-monitor-auth")).toBe("g-video");
    expect(lookupGroupKeyForAppRef(index, "uuid-video")).toBe("g-video");
  });
});

describe("firstPathFromLegacyMenus", () => {
  test("取菜单树第一个带 path 的节点", () => {
    expect(
      firstPathFromLegacyMenus([
        {
          name: "父",
          children: [{ name: "子", path: "/ops/hazard/list" }],
        },
      ]),
    ).toBe("/ops/hazard/list");
  });
});
