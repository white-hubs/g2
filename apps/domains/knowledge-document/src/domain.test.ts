import { assertDomainModule, createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domainModule from "./domain";

describe("@g2-domain/knowledge-document", () => {
  test("菜单严格保留用户提供顺序、编码与路径", () => {
    const result = assertDomainModule(domainModule);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const items = result.module.menuContribution?.[0]?.children ?? [];
    expect(items.map((item) => item.label)).toEqual(["知识文档", "文档类型"]);
    expect(items.map((item) => item.entry)).toEqual(["knowledge-document", "knowledge-document-type"]);
    expect(items.map((item) => item.path)).toEqual([
      "/d/knowledge-document/knowledge-document",
      "/d/knowledge-document/knowledge-document-type",
    ]);
  });

  test("在安装 pcUi 平台前加载 Runtime Common pcUi", async () => {
    const calls: string[] = [];
    const context = createFakeDomainContext({
      loadRuntimeCommon: async () => {
        calls.push("runtime:pcUi:index");
        return {};
      },
      loadPlatform: async (name) => {
        calls.push(`platform:${name}`);
        return {};
      },
      ensureClient: async (name) => {
        calls.push(`client:${name}`);
        return {};
      },
    });

    await domainModule.install?.(createFakeApp(), context);

    expect(calls.slice(0, 3)).toEqual(["runtime:pcUi:index", "platform:pcUi", "client:knowledgeDocumentClient"]);
  });
});
