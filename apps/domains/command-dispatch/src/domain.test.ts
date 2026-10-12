import { assertDomainModule, createFakeApp, createFakeDomainContext, type MenuContributionNode } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domain from "./domain";
import * as domainContext from "./domain-context";

const { getCommandDispatchClient, getDictionaryClient, getFileClient, getOuaaClient, resolveCommandDispatchResourceUrl } = domainContext;

const leafPaths = (nodes: MenuContributionNode[]): string[] =>
  nodes.flatMap((node) => (node.children ? leafPaths(node.children) : [node.path ?? ""]));

describe("command dispatch domain", () => {
  test("owns every ordered legacy menu leaf and uses the first recording page as home", () => {
    expect(assertDomainModule(domain).ok).toBe(true);
    const root = domain.menuContribution?.[0];
    expect(root?.label).toBe("指挥调度");
    expect(root?.children?.map((node) => node.label)).toEqual(["历史记录", "系统配置", "地图配置", "背景配置"]);
    expect(root?.children?.[0]?.children?.map((node) => node.label)).toEqual(["录音记录"]);
    expect(root?.children?.[1]?.children?.map((node) => node.label)).toEqual(["对讲组配置", "账号配置", "优先排序部门"]);
    const paths = leafPaths(domain.menuContribution ?? []);
    expect(paths).toEqual([
      "/d/command-dispatch/radio-record",
      "/d/command-dispatch/intercom-group-config",
      "/d/command-dispatch/account-config",
      "/d/command-dispatch/priority-department-config",
      "/d/command-dispatch/dispatch-map-config",
      "/d/command-dispatch/background-config",
    ]);
    expect(paths.every((path) => domain.routes.some((route) => route.path === path && typeof route.component === "function"))).toBe(true);
    expect(domain.routes.find((route) => route.path === "/d/command-dispatch")?.redirect).toBe(paths[0]);
  });

  test("installs service context before pages load and resolves shared clients through the host", async () => {
    const calls: string[] = [];
    const commandClient = { pageGroups: () => Promise.resolve({ records: [], total: 0 }) };
    const ctx = createFakeDomainContext({
      loadPlatform: async (name, entry) => {
        calls.push(`${name}:${entry}`);
        return name === "resourcePlatform"
          ? { resolveStaticResourceUrl: (path: string) => `https://cdn.example.com${path.replace(/^\/resource/u, "")}` }
          : {};
      },
      loadRuntimeCommon: async (name, entry) => {
        calls.push(`runtime:${name}:${entry}`);
        return {} as never;
      },
      ensureClient: async <T>(name: string): Promise<T> => {
        calls.push(name);
        return (name === "commandDispatchClient" ? commandClient : { name }) as T;
      },
    });
    await domain.install?.(createFakeApp(), ctx, { applicationCode: "COMMAND_DISPATCH" });
    expect(getCommandDispatchClient()).toBe(commandClient);
    await getDictionaryClient();
    await getFileClient();
    await getOuaaClient();
    expect(resolveCommandDispatchResourceUrl("/resource/v1/background.png")).toBe("https://cdn.example.com/v1/background.png");
    expect(calls).toEqual([
      "runtime:pcUi:index",
      "pcUi:platform",
      "pcMap:platform",
      "resourcePlatform:api",
      "commandDispatchClient",
      "dictionaryClient",
      "fileClient",
      "ouaaClient",
    ]);
  });
});
