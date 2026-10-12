import { describe, expect, test } from "bun:test";

import { loadOuaaDisplayGroups, loadOuaaGroupMenus } from "./ouaa-navigation-loader";

describe("loadOuaaDisplayGroups", () => {
  test("经 getTerminalApplicationGroups 映射为顶栏分组", async () => {
    const calls: string[] = [];
    const loaded = await loadOuaaDisplayGroups({
      getTerminalApplicationGroups: async () => {
        calls.push("groups");
        return {
          code: 200,
          data: [
            {
              id: "g-ops",
              name: "运维管理",
              code: "OPS",
              applicationPageVOS: [{ code: "hazard", name: "隐患" }],
            },
            { id: "g-internal", name: "内部管理" },
          ],
        };
      },
    });
    expect(calls).toEqual(["groups"]);
    expect(loaded.groups).toEqual([
      { key: "workbench", label: "工作台", order: 0 },
      { key: "g-ops", label: "运维管理", order: 1 },
      { key: "g-internal", label: "内部管理", order: 2 },
    ]);
    expect(loaded.codeToGroupKey.get("hazard")).toBe("g-ops");
  });

  test("OUAA 空列表时仍保留工作台", async () => {
    const loaded = await loadOuaaDisplayGroups({
      getTerminalApplicationGroups: async () => ({ code: 200, data: [] }),
    });
    expect(loaded.groups).toEqual([{ key: "workbench", label: "工作台", order: 0 }]);
    expect(loaded.codeToGroupKey.size).toBe(0);
  });
});

describe("loadOuaaGroupMenus", () => {
  test("按 groupKey 请求 menus，映射应用 icon 到一级节点，并按 code 索引 legacy 菜单", async () => {
    const groupIds: string[] = [];
    const mapped = await loadOuaaGroupMenus(
      {
        getApplicationGroupMenus: async (groupId) => {
          groupIds.push(groupId);
          return {
            code: 200,
            data: [
              {
                id: "app-1",
                name: "隐患治理",
                code: "hazard",
                icon: "/resource/app-icons/车流量监测/main.png",
                menuVOS: [{ id: "m1", name: "隐患单", path: "/ops/hazard/list" }],
              },
            ],
          };
        },
      },
      "g-ops",
    );
    expect(groupIds).toEqual(["g-ops"]);
    expect(mapped.nodes).toEqual([
      {
        label: "隐患治理",
        icon: "/resource/app-icons/车流量监测/main.png",
        path: "/ops/hazard/list",
        children: [{ label: "隐患单", path: "/ops/hazard/list" }],
      },
    ]);
    expect(mapped.legacyMenusByAppCode.hazard).toEqual([{ name: "隐患单", path: "/ops/hazard/list", dataPermissions: [] }]);
  });
});
