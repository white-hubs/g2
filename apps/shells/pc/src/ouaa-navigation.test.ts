import { describe, expect, test } from "bun:test";

import {
  childrenFromDomainMenuContribution,
  graftDomainMenuChildrenOntoApps,
  mapOuaaApplicationsToGroupMenus,
  mapOuaaApplicationsToMenuNodes,
  mapOuaaGroupsToDisplayGroups,
  unwrapOuaaList,
} from "./ouaa-navigation";

describe("unwrapOuaaList", () => {
  test("兼容直接数组与 { code:200, data:[] }", () => {
    expect(unwrapOuaaList([{ id: "1" }])).toEqual([{ id: "1" }]);
    expect(unwrapOuaaList({ code: 200, data: [{ id: "2" }] })).toEqual([{ id: "2" }]);
    expect(unwrapOuaaList({ data: null })).toEqual([]);
    expect(unwrapOuaaList(null)).toEqual([]);
  });
});

describe("mapOuaaApplicationsToMenuNodes", () => {
  test("应用级 icon 落到一级节点；menuVOS 变二级且不带 icon", () => {
    const nodes = mapOuaaApplicationsToMenuNodes([
      {
        id: "2069035860738265090",
        name: "隐患治理",
        code: "HAZARD_GOVERNANCE",
        icon: "/resource/app-icons/车流量监测/main.png",
        path: "/ops/hazard-gov",
        menuVOS: [
          { id: "m1", name: "隐患单", path: "/ops/hazard/list" },
          {
            id: "m2",
            name: "配置",
            path: "/ops/hazard/config",
            children: [{ id: "m2-1", name: "子项", path: "/ops/hazard/config/child", icon: "/resource/should-ignore.png" }],
          },
        ],
      },
      {
        id: "app-2",
        name: "故障报修",
        icon: "/resource/app-icons/故障报修/main.png",
        menuVOS: [],
      },
    ]);

    expect(nodes).toHaveLength(2);
    expect(nodes[0]).toMatchObject({
      label: "隐患治理",
      icon: "/resource/app-icons/车流量监测/main.png",
      path: "/ops/hazard-gov",
    });
    expect(nodes[0]!.children).toEqual([
      { label: "隐患单", path: "/ops/hazard/list" },
      {
        label: "配置",
        path: "/ops/hazard/config",
        children: [{ label: "子项", path: "/ops/hazard/config/child" }],
      },
    ]);
    expect(nodes[0]!.children?.[0]).not.toHaveProperty("icon");
    expect(nodes[0]!.children?.[1]?.children?.[0]).not.toHaveProperty("icon");
    expect(nodes[1]).toMatchObject({
      label: "故障报修",
      icon: "/resource/app-icons/故障报修/main.png",
    });
    expect(nodes[1]).not.toHaveProperty("path");
    expect(nodes[1]).not.toHaveProperty("children");
  });

  test("空 menuVOS 时可用 resolveAppPath 回落 MF 路径（门禁 DOORMANAGE）", () => {
    const nodes = mapOuaaApplicationsToMenuNodes(
      [
        {
          name: "门禁管理@",
          code: "DOORMANAGE",
          icon: "/resource/app-icons/门禁管理/main.png",
          menuVOS: [],
          alias: '{"name":"门禁管理@","icon":""}',
        },
      ],
      {
        resolveAppPath: (code) => (code === "DOORMANAGE" ? "/d/access-control" : undefined),
      },
    );
    expect(nodes).toEqual([
      {
        label: "门禁管理@",
        icon: "/resource/app-icons/门禁管理/main.png",
        path: "/d/access-control",
      },
    ]);
  });

  test("已迁应用保留 code 并支持入口名称覆盖", () => {
    const mapped = mapOuaaApplicationsToGroupMenus([{ name: "日常巡检DAILY", code: "DAILY_INSPECTION", menuVOS: [] }], {
      resolveAppPath: () => "/d/daily-task",
      resolveAppLabel: (code, label) => (code === "DAILY_INSPECTION" ? "日常巡检新" : label),
    });
    expect(mapped.appCodes).toEqual(["DAILY_INSPECTION"]);
    expect(mapped.nodes).toEqual([{ label: "日常巡检新", path: "/d/daily-task" }]);
  });

  test("已迁应用命中 navigateCodes 时丢弃 OUAA 旧 portal 叶子（改由 Domain menuContribution）", () => {
    const nodes = mapOuaaApplicationsToMenuNodes(
      [
        {
          name: "门禁管理@",
          code: "DOORMANAGE",
          path: "/portal/accessControl/roomHome",
          menuVOS: [
            { id: "1", name: "设备监测", path: "/portal/accessControl/equipmentMonitorList" },
            { id: "2", name: "门禁设备", path: "/portal/accessControl/roomDevicePage" },
          ],
        },
      ],
      {
        resolveAppPath: (code) => (code === "DOORMANAGE" ? "/d/access-control" : undefined),
      },
    );
    expect(nodes[0]?.path).toBe("/d/access-control");
    expect(nodes[0]?.children).toBeUndefined();
  });

  test("已迁应用可通过 resolveDomainMenuChildren 挂回 Domain 菜单子树", () => {
    const nodes = mapOuaaApplicationsToMenuNodes(
      [
        {
          name: "门禁管理@",
          code: "DOORMANAGE",
          path: "/portal/accessControl/roomHome",
          menuVOS: [{ id: "1", name: "旧监测", path: "/portal/accessControl/equipmentMonitorList" }],
        },
      ],
      {
        resolveAppPath: (code) => (code === "DOORMANAGE" ? "/d/access-control" : undefined),
        resolveDomainMenuChildren: (code) =>
          code === "DOORMANAGE"
            ? [
                { label: "门禁监测", path: "/d/access-control/equipmentMonitorList", entry: "equipmentMonitorList" },
                { label: "报警配置", path: "/d/access-control/alarmConfigList", entry: "alarmConfigList" },
              ]
            : undefined,
      },
    );
    expect(nodes[0]?.label).toBe("门禁管理@");
    expect(nodes[0]?.path).toBe("/d/access-control");
    expect(nodes[0]?.children).toEqual([
      { label: "门禁监测", path: "/d/access-control/equipmentMonitorList", entry: "equipmentMonitorList" },
      { label: "报警配置", path: "/d/access-control/alarmConfigList", entry: "alarmConfigList" },
    ]);
  });

  test("未迁业务应用的 GEM portal 保持原样（不做门禁 remap）", () => {
    const nodes = mapOuaaApplicationsToMenuNodes(
      [
        {
          name: "动环监控@",
          code: "ENV_MONITOR",
          path: "/portal/genericEquipmentMonitor/overView",
          menuVOS: [{ id: "1", name: "设备监测", path: "/portal/genericEquipmentMonitor/equipmentMoitorList" }],
        },
      ],
      {
        resolveAppPath: (code) => (code === "DOORMANAGE" ? "/d/access-control" : undefined),
      },
    );
    expect(nodes[0]?.path).toBe("/portal/genericEquipmentMonitor/overView");
    expect(nodes[0]?.children).toEqual([{ label: "设备监测", path: "/portal/genericEquipmentMonitor/equipmentMoitorList" }]);
  });

  test("跳过无 name 的脏数据；空 icon 不写字段", () => {
    const nodes = mapOuaaApplicationsToMenuNodes([
      { name: "", icon: "/resource/x.png" },
      { name: "仅名", icon: "  " },
    ]);
    expect(nodes).toEqual([{ label: "仅名" }]);
  });

  test("侧栏 label 与 legacyMenus 均优先 alias.name（子应用页标题同源）", () => {
    const mapped = mapOuaaApplicationsToGroupMenus([
      {
        id: "app-1",
        name: "维保作业",
        code: "maintenance",
        alias: { name: "维保作业@" },
        menuVOS: [
          {
            id: "m1",
            name: "维保计划",
            path: "/portal/maintenance/maintenancePlan",
            alias: { name: "维保计划@", code: "plan" },
          },
          {
            id: "m2",
            name: "维保项",
            path: "/portal/maintenance/maintenanceItem",
          },
        ],
      },
    ]);

    expect(mapped.nodes[0]?.label).toBe("维保作业@");
    expect(mapped.nodes[0]?.children?.[0]).toMatchObject({
      label: "维保计划@",
      path: "/portal/maintenance/maintenancePlan",
    });
    expect(mapped.nodes[0]?.children?.[1]).toMatchObject({
      label: "维保项",
      path: "/portal/maintenance/maintenanceItem",
    });
    expect(mapped.legacyMenusByAppCode.maintenance).toEqual([
      {
        name: "维保计划",
        path: "/portal/maintenance/maintenancePlan",
        alias: { name: "维保计划@", code: "plan" },
        dataPermissions: [],
      },
      {
        name: "维保项",
        path: "/portal/maintenance/maintenanceItem",
        dataPermissions: [],
      },
    ]);
  });

  test("OUAA code≠qiankun name 时仍按 portal path 段索引；alias JSON 字符串可解析", () => {
    const mapped = mapOuaaApplicationsToGroupMenus([
      {
        id: "app-1",
        name: "维保作业",
        code: "uuid-not-micro-name",
        menuVOS: [
          {
            name: "维保计划",
            path: "/portal/maintenance/maintenancePlan",
            alias: '{"name":"维保计划@"}',
            dataPermissions: [{ id: "dp-1" }],
          },
        ],
      },
    ]);

    expect(mapped.legacyMenusByAppCode["uuid-not-micro-name"]).toEqual([
      {
        name: "维保计划",
        path: "/portal/maintenance/maintenancePlan",
        alias: { name: "维保计划@" },
        dataPermissions: [{ id: "dp-1" }],
      },
    ]);
    expect(mapped.legacyMenusByAppCode.maintenance).toEqual(mapped.legacyMenusByAppCode["uuid-not-micro-name"]);
    expect(mapped.nodes[0]?.children?.[0]?.label).toBe("维保计划@");
  });
});

describe("mapOuaaGroupsToDisplayGroups", () => {
  test("用分组 id 作 key、name 作 label，按数组顺序给 order", () => {
    expect(
      mapOuaaGroupsToDisplayGroups([
        { id: "1554432014394929154", name: "运维管理", code: "OPS" },
        { id: "g2", name: "内部管理" },
      ]),
    ).toEqual([
      { key: "1554432014394929154", label: "运维管理", order: 0 },
      { key: "g2", label: "内部管理", order: 1 },
    ]);
  });
});

describe("childrenFromDomainMenuContribution / graftDomainMenuChildrenOntoApps", () => {
  test("单根带 children 时剥掉域内应用壳", () => {
    expect(
      childrenFromDomainMenuContribution([
        {
          label: "门禁管理",
          children: [
            { label: "门禁监测", path: "/d/access-control/equipmentMonitorList" },
            { label: "报警配置", path: "/d/access-control/alarmConfigList" },
          ],
        },
      ]),
    ).toEqual([
      { label: "门禁监测", path: "/d/access-control/equipmentMonitorList" },
      { label: "报警配置", path: "/d/access-control/alarmConfigList" },
    ]);
  });

  test("按 MF basePath 挂回已迁应用节点", () => {
    const grafted = graftDomainMenuChildrenOntoApps(
      [
        { label: "门禁管理@", path: "/d/access-control" },
        { label: "停车管理@", path: "/portal/parking" },
      ],
      (appPath) =>
        appPath === "/d/access-control"
          ? childrenFromDomainMenuContribution([{ label: "门禁管理", children: [{ label: "门禁总览", path: "/d/access-control" }] }])
          : undefined,
    );
    expect(grafted[0]?.children).toEqual([{ label: "门禁总览", path: "/d/access-control" }]);
    expect(grafted[1]?.children).toBeUndefined();
  });
});
