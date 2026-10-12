import { type MenuContributionNode, assertDomainModule, createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domain from "./domain";
import { getSecureEduClient } from "./domain-context";

const leaves = (nodes: MenuContributionNode[]): string[] =>
  nodes.flatMap((node) => (node.children ? leaves(node.children) : [node.path ?? ""]));

describe("secure education domain", () => {
  test("owns every legacy menu page in the supplied order", () => {
    expect(assertDomainModule(domain).ok).toBe(true);
    const root = domain.menuContribution?.[0];
    expect(root?.label).toBe("安全教育");
    expect(root?.children?.map((node) => node.label)).toEqual(["数据总览", "安全培训", "安全考试", "系统配置"]);
    expect(root?.children?.[1]?.children?.map((node) => node.label)).toEqual(["培训任务", "培训记录"]);
    expect(root?.children?.[2]?.children?.map((node) => node.label)).toEqual(["考试任务", "试卷管理", "考试记录"]);
    expect(root?.children?.[3]?.children?.map((node) => node.label)).toEqual(["课件库", "考题库", "培训链接", "考试链接"]);
    const paths = leaves(domain.menuContribution ?? []);
    expect(paths).toEqual([
      "/d/secure-edu-head/over-view",
      "/d/secure-edu-head/training-task",
      "/d/secure-edu-head/training-records",
      "/d/secure-edu-head/exam-task",
      "/d/secure-edu-head/test-paper-manage",
      "/d/secure-edu-head/exam-records",
      "/d/secure-edu-head/courseware",
      "/d/secure-edu-head/question",
      "/d/secure-edu-head/train-link",
      "/d/secure-edu-head/exam-link",
    ]);
    expect(paths.every((path) => domain.routes.some((route) => route.path === path && typeof route.component === "function"))).toBe(true);
    expect(domain.routes.find((route) => route.path === "/d/secure-edu-head")?.redirect).toBe(paths[0]);
  });

  test("loads Runtime Common UI before its platform and client before any page renders", async () => {
    const calls: string[] = [];
    const client = {
      get: async () => ({}),
      post: async () => ({}),
      put: async () => ({}),
      delete: async () => ({}),
      download: async () => new Blob(),
      downloadUrl: () => "",
    };
    const ctx = createFakeDomainContext({
      loadRuntimeCommon: async (name, entry) => {
        calls.push(`runtime:${name}:${entry}`);
        return {};
      },
      loadPlatform: async (name, entry) => {
        calls.push(`${name}:${entry}`);
        return {};
      },
      ensureClient: async <T>(name: string): Promise<T> => {
        calls.push(name);
        return client as T;
      },
      loadPageLibrary: async <T>(name: string, expose: string): Promise<T> => {
        calls.push(`${name}:${expose}`);
        return { create: async () => ({ getPage: () => ({}), createEditor: () => ({}) }) } as T;
      },
    });
    await domain.install?.(createFakeApp(), ctx, { applicationCode: "SECURE_EDU_HEAD" });
    expect(getSecureEduClient()).toBe(client);
    expect(calls).toEqual([
      "runtime:pcChart:index",
      "runtime:pcUi:index",
      "pcUi:platform",
      "pcChart:platform",
      "secureEduClient",
      "secureEduPages:pages",
    ]);
  });

  test("keeps every hidden form and detail route attached to a visible menu", () => {
    const visibleMenuPaths = new Set(leaves(domain.menuContribution ?? []));
    const hiddenRoutes = domain.routes.filter((route) => route.meta?.hideInMenu === true);

    expect(hiddenRoutes.length).toBeGreaterThan(0);
    for (const route of hiddenRoutes) {
      expect(typeof route.meta?.activeMenuPath).toBe("string");
      expect(visibleMenuPaths.has(String(route.meta?.activeMenuPath))).toBe(true);
    }
  });
});
