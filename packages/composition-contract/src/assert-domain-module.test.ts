import { describe, expect, test } from "bun:test";

import { assertDomainModule } from "./assert-domain-module";

describe("assertDomainModule", () => {
  test("accepts a module that exposes routes", () => {
    const mod = {
      routes: [{ path: "/poc", name: "poc", component: {} }],
    };
    expect(assertDomainModule(mod).ok).toBe(true);
  });

  test("rejects a module without routes", () => {
    const result = assertDomainModule({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("routes");
    }
  });

  test("接受带 menuContribution 的域模块", () => {
    const result = assertDomainModule({
      routes: [],
      menuContribution: [
        {
          label: "示例菜单",
          iconKey: "demo",
          path: "/poc-inline",
          functionCode: "demo:view",
          children: [],
        },
      ],
    });
    expect(result.ok).toBe(true);
  });

  test("拒绝 menuContribution 非数组", () => {
    const result = assertDomainModule({ routes: [], menuContribution: "nope" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain("menuContribution");
    }
  });

  test("拒绝 menuContribution 节点缺 label", () => {
    const result = assertDomainModule({ routes: [], menuContribution: [{ path: "/x" }] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain("label");
    }
  });

  test("拒绝未声明所属菜单的隐藏路由", () => {
    const result = assertDomainModule({
      routes: [{ path: "/orders/:id", meta: { hideInMenu: true }, component: {} }],
      menuContribution: [{ label: "订单", path: "/orders" }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain("activeMenuPath");
    }
  });

  test("拒绝隐藏路由指向不存在的菜单", () => {
    const result = assertDomainModule({
      routes: [
        {
          path: "/orders/:id",
          meta: { hideInMenu: true, activeMenuPath: "/missing" },
          component: {},
        },
      ],
      menuContribution: [{ label: "订单", path: "/orders" }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain("unknown menu path");
    }
  });

  test("接受映射到可见菜单的隐藏路由", () => {
    const result = assertDomainModule({
      routes: [
        {
          path: "/orders/:id",
          meta: { hideInMenu: true, activeMenuPath: "/orders" },
          component: {},
        },
      ],
      menuContribution: [{ label: "订单", path: "/orders" }],
    });
    expect(result.ok).toBe(true);
  });
});
