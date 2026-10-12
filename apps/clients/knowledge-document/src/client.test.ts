import { describe, expect, test } from "bun:test";

import { createKnowledgeDocumentClient } from "./client";

function recorder() {
  const calls: { body?: unknown; method: string; url: string }[] = [];
  const http = {
    get: async (url: string) => {
      calls.push({ method: "GET", url });
      return url.includes("/knowledge/page") ? { records: [], total: 0, pages: 0 } : [];
    },
    post: async (url: string, body?: unknown) => {
      calls.push({ body, method: "POST", url });
      return true;
    },
    put: async (url: string, body?: unknown) => {
      calls.push({ body, method: "PUT", url });
      return true;
    },
    delete: async (url: string) => {
      calls.push({ method: "DELETE", url });
      return true;
    },
  };
  return { calls, client: createKnowledgeDocumentClient(http) };
}

describe("@g2-client/knowledge-document", () => {
  test("知识文档列表保留旧服务 GET 分页路径和参数名", async () => {
    const { calls, client } = recorder();
    await client.pageDocuments({
      pageNumber: 2,
      pageSize: 20,
      name: "安全制度",
      typeId: "type/1",
      deptId: "dept-1",
      productId: "prod-1",
    });
    expect(calls).toEqual([
      {
        method: "GET",
        url: "/api/management/knowledge/page?pageNumber=2&pageSize=20&name=%E5%AE%89%E5%85%A8%E5%88%B6%E5%BA%A6&typeId=type%2F1&deptId=dept-1&productId=prod-1",
      },
    ]);
  });

  test("知识文档新增、批量新增、编辑和删除沿用旧接口", async () => {
    const { calls, client } = recorder();
    const payload = { name: "制度", typeId: "type-1", deptId: null, productId: null, entryCount: 2, fileIds: ["file-1"] };
    await client.createDocument(payload);
    await client.createDocuments([payload]);
    await client.updateDocument({ ...payload, id: "doc-1" });
    await client.deleteDocuments(["doc-1", "doc-2"]);
    expect(calls.map((item) => `${item.method} ${item.url}`)).toEqual([
      "POST /api/management/knowledge/add",
      "POST /api/management/knowledge/add/batch",
      "PUT /api/management/knowledge/edit",
      "POST /api/management/knowledge/removes",
    ]);
  });

  test("文档类型、产品和部门接口保持旧项目真实路径", async () => {
    const { calls, client } = recorder();
    await client.listTypeTree({ name: "制度" });
    await client.createType({ name: "制度", description: null, parentId: null, icon: null });
    await client.updateType({ id: "type/1", name: "规范", description: null, parentId: null, icon: null });
    await client.deleteType("type/1");
    await client.listProducts();
    await client.listDepartments({ enabled: true });
    expect(calls.map((item) => `${item.method} ${item.url}`)).toEqual([
      "GET /api/management/knowledgeType/treeList?name=%E5%88%B6%E5%BA%A6",
      "POST /api/management/knowledgeType/add",
      "PUT /api/management/knowledgeType/edit",
      "DELETE /api/management/knowledgeType/remove?id=type%2F1",
      "GET /api/device-center/things/product/list/all",
      "GET /api/ouaa/authenticated/organizations?enabled=true",
    ]);
  });
});
