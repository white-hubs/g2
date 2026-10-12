import { describe, expect, test } from "bun:test";

import {
  type LegacyQiankunMenu,
  buildPermissionConfigFromMenus,
  findLegacyMenusForMicroApp,
  resolveMenuDisplayName,
  resolvePageTitleFromLegacyMenus,
} from "./legacy-menu-permission";

describe("resolveMenuDisplayName", () => {
  test("别名优先于原始 name", () => {
    expect(resolveMenuDisplayName({ name: "维保计划", alias: { name: "维保计划@" } })).toBe("维保计划@");
    expect(resolveMenuDisplayName({ name: "维保项" })).toBe("维保项");
  });
});

describe("findLegacyMenusForMicroApp + resolvePageTitleFromLegacyMenus", () => {
  const menus: LegacyQiankunMenu[] = [
    {
      name: "维保计划",
      path: "/portal/maintenance/maintenancePlan",
      alias: { name: "维保计划@" },
    },
  ];

  test("OUAA code 与 microApp name 不一致时，仍能按 portal path 取到菜单", () => {
    const byCode = new Map<string, LegacyQiankunMenu[]>([["uuid-app-1", menus]]);
    expect(findLegacyMenusForMicroApp(byCode, "maintenance")).toEqual(menus);
  });

  test("大小写不敏感命中 code", () => {
    const byCode = { MAINTENANCE: menus };
    expect(findLegacyMenusForMicroApp(byCode, "maintenance")).toEqual(menus);
  });

  test("对齐 usePageName：pathname 命中后标题取 alias.name，否则回退 meta.title", () => {
    expect(
      resolvePageTitleFromLegacyMenus(menus, { pathname: "/portal/maintenance/maintenancePlan", search: "?pageSize=10" }, "维保计划"),
    ).toBe("维保计划@");
    expect(resolvePageTitleFromLegacyMenus([], { pathname: "/portal/maintenance/maintenancePlan" }, "维保计划")).toBe("维保计划");
  });
});

describe("buildPermissionConfigFromMenus", () => {
  test("摊平菜单并保留 alias，供子应用页标题使用", () => {
    const menus: LegacyQiankunMenu[] = [
      {
        name: "维保作业",
        children: [
          {
            name: "维保计划",
            path: "/portal/maintenance/maintenancePlan",
            alias: { name: "维保计划@" },
            functions: [{ functionCode: "plan:view" }],
          },
        ],
      },
    ];
    const permission = buildPermissionConfigFromMenus(menus);
    const plan = permission.routes.find((m) => m.path === "/portal/maintenance/maintenancePlan");
    expect(plan).toEqual({
      name: "维保计划",
      path: "/portal/maintenance/maintenancePlan",
      alias: { name: "维保计划@" },
      functions: [{ functionCode: "plan:view" }],
    });
    expect(permission.menuConfig.some((m) => m.path === "/portal/maintenance/maintenancePlan")).toBe(true);
    expect(permission.functionCodes).toEqual(["plan:view"]);
  });

  test("menuConfig 只含带 path 的叶子（对齐旧仓 flattenTree+!children.length；避免子应用 path.replace 崩溃）", () => {
    const menus: LegacyQiankunMenu[] = [
      {
        name: "维保作业",
        // 父级无 path——真实 OUAA 常见
        children: [
          {
            name: "维保计划",
            path: "/portal/maintenance/maintenancePlan",
            alias: { name: "维保计划@" },
            children: [],
          },
          {
            name: "空壳目录",
            children: [],
          },
        ],
      },
    ];
    const permission = buildPermissionConfigFromMenus(menus);
    expect(permission.menuConfig).toEqual([
      {
        name: "维保计划",
        path: "/portal/maintenance/maintenancePlan",
        alias: { name: "维保计划@" },
        children: [],
        dataPermissions: [],
      },
    ]);
    // 模拟子应用 handleRouter：每个 menuConfig 项必须能 path.replace
    const microBase = "/portal/maintenance";
    expect(() => permission.menuConfig.map((item) => item.path!.replace(microBase, ""))).not.toThrow();
  });

  test("menuConfig 项始终带 dataPermissions 数组（子应用读 dataPermissions[0] 无空值保护）", () => {
    const menus: LegacyQiankunMenu[] = [
      {
        name: "维保计划",
        path: "/portal/maintenance/maintenancePlan",
        children: [],
        // 故意不带 dataPermissions，模拟映射遗漏
      },
    ];
    const permission = buildPermissionConfigFromMenus(menus);
    const microBase = "/portal/maintenance";
    expect(() => {
      const menusPath = permission.menuConfig.map((item) => item.path!.replace(microBase, ""));
      const routes = [{ path: "/maintenancePlan" }];
      routes.forEach((item) => {
        if (!menusPath.includes(item.path)) {
          return;
        }
        const pathIndex = menusPath.indexOf(item.path);
        const menuConfig = permission.menuConfig[pathIndex]!;
        const menuPermissions = menuConfig.dataPermissions![0];
        void (menuPermissions ? (menuPermissions as { id: string }).id : "");
      });
    }).not.toThrow();
    expect(permission.menuConfig[0]?.dataPermissions).toEqual([]);
  });
});
