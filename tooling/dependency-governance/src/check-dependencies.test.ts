import { describe, expect, test } from "bun:test";

import { checkPackageDependencies } from "./check-dependencies";

describe("checkPackageDependencies", () => {
  test("基线依赖直接放行", () => {
    const violations = checkPackageDependencies(
      { name: "@g2-shell/pc", dependencies: { vue: "*" } },
      { baseline: ["vue"], encapsulatedBy: {} },
    );
    expect(violations).toEqual([]);
  });

  test("非基线依赖若该包本身就是白名单里登记的封装方，放行", () => {
    const violations = checkPackageDependencies(
      { name: "@g2-platform/date", dependencies: { dayjs: "*" } },
      { baseline: ["vue"], encapsulatedBy: { dayjs: ["@g2-platform/date"] } },
    );
    expect(violations).toEqual([]);
  });

  test("非基线依赖，且当前包不在该库的封装方列表里，报违规", () => {
    const violations = checkPackageDependencies(
      { name: "@g2-platform/pc-auth", dependencies: { dayjs: "*" } },
      { baseline: ["vue"], encapsulatedBy: { dayjs: ["@g2-platform/date"] } },
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("dayjs");
    expect(violations[0]).toContain("@g2-platform/pc-auth");
  });

  test("库完全不在白名单任何地方出现，报违规并提示需要质询", () => {
    const violations = checkPackageDependencies(
      { name: "@g2-platform/pc-rtc", dependencies: { lodash: "*" } },
      { baseline: ["vue"], encapsulatedBy: {} },
    );
    expect(violations[0]).toContain("lodash");
    expect(violations[0]).toContain("not in baseline or any encapsulation whitelist");
  });

  test("经 platform 暴露的依赖，若声明方就是登记在 exposedBy 里的 platform 包，放行", () => {
    const violations = checkPackageDependencies(
      { name: "@g2-platform/pc-ui", dependencies: { "ant-design-vue": "*" } },
      { baseline: ["vue"], encapsulatedBy: {}, exposedBy: { "ant-design-vue": ["@g2-platform/pc-ui"] } },
    );
    expect(violations).toEqual([]);
  });

  test("经 platform 暴露的依赖，若声明方不在 exposedBy 登记列表里，报违规", () => {
    const violations = checkPackageDependencies(
      { name: "@g2-platform/pc-auth", dependencies: { "ant-design-vue": "*" } },
      { baseline: ["vue"], encapsulatedBy: {}, exposedBy: { "ant-design-vue": ["@g2-platform/pc-ui"] } },
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("ant-design-vue");
    expect(violations[0]).toContain("@g2-platform/pc-auth");
  });

  test("exposedBy 字段可省略（旧白名单文件不受影响）", () => {
    const violations = checkPackageDependencies(
      { name: "@g2-shell/pc", dependencies: { vue: "*" } },
      { baseline: ["vue"], encapsulatedBy: {} },
    );
    expect(violations).toEqual([]);
  });
});
