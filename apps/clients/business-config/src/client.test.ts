import { describe, expect, test } from "bun:test";

import { createBusinessConfigClient, type HttpClient } from "./client";

describe("BusinessConfigClient 区域管理与业务配置接口", () => {
  test("区域增删改查、排序、导入导出及附件遵循旧服务路径", async () => {
    const calls: { method: string; url: string; body?: unknown }[] = [];
    const http: HttpClient = {
      get: async (url) => { calls.push({ method: "GET", url }); if (url.includes("export") || url.includes("template")) return new Blob(["file"]); if (url.endsWith("/a1")) return { id: "a1", name: "一区", code: "A1", parentId: null, level: 1 }; return [{ id: "a1", name: "一区", code: "A1", parentId: null, level: 1 }]; },
      post: async (url, body) => { calls.push({ method: "POST", url, body }); return url.endsWith("/import") ? { success: 1 } : { id: "f1", name: "floor.png", path: "/files/floor.png" }; },
      put: async (url, body) => { calls.push({ method: "PUT", url, body }); },
      delete: async (url) => { calls.push({ method: "DELETE", url }); },
    };
    const client = createBusinessConfigClient(http);
    expect((await client.listBusinessAreaTree({ keyword: "一区" }))[0]?.id).toBe("a1");
    await client.getBusinessArea("a1");
    const input = { name: "一区", code: "A1", parentId: null, level: 1, areaExtend: { pictureFiles: [], videoFiles: [], floorPlanFileId: null, coordinateAxis: null } };
    await client.createBusinessArea(input);
    await client.updateBusinessArea({ ...input, id: "a1" });
    await client.deleteBusinessArea("a1");
    await client.saveBusinessAreaSort([{ id: "a1", name: "一区", code: "A1", parentId: null, level: 1 }]);
    await client.exportBusinessArea({});
    await client.exportBusinessAreaTemplate();
    const file = new File(["x"], "area.xlsx");
    expect((await client.importBusinessArea(file)).success).toBe(1);
    expect((await client.uploadBusinessConfigFile({ file, sceneCode: "MDATA::SPACE_LIST", useTemporary: true })).id).toBe("f1");
    expect(calls.map(({ method, url }) => `${method} ${url}`)).toEqual([
      "GET /api/mdata/area/list?keyword=%E4%B8%80%E5%8C%BA", "GET /api/mdata/area/a1", "POST /api/mdata/area/extend",
      "PUT /api/mdata/area/extend", "DELETE /api/mdata/area/a1", "POST /api/mdata/area/sort/edit",
      "GET /api/mdata/area/export?pageNumber=1&pageSize=10000", "GET /api/mdata/area/import/template",
      "POST /api/mdata/area/import", "POST /api/file/upload/temporary",
    ]);
  });

  test("业务配置初始化字典，人员选择按旧批量 upsert 契约保存", async () => {
    const calls: { method: string; url: string; body?: unknown }[] = [];
    const http: HttpClient = {
      get: async (url) => { calls.push({ method: "GET", url }); if (url.includes("getDictionaryItemByCode")) return [{}]; if (url.includes("user-dictionary/list")) return []; return []; },
      post: async (url, body) => { calls.push({ method: "POST", url, body }); return url.endsWith("getDataDictionaryByItem") ? [] : undefined; },
      put: async (url, body) => { calls.push({ method: "PUT", url, body }); },
      delete: async (url) => { calls.push({ method: "DELETE", url }); },
    };
    const client = createBusinessConfigClient(http);
    await client.getBusinessSetting("SERVICE_CONFIGURATION");
    await client.savePhoneEncryptionUsers(["u1"], []);
    expect(calls).toContainEqual({ method: "GET", url: "/api/dictionary/getDataDictionaryByItem?itemCode=SERVICE_CONFIGURATION" });
    expect(calls.at(-1)).toEqual({ method: "POST", url: "/api/dictionary/user-dictionary/add/or/update/batch", body: [{ name: "true", code: "SERVICE_CONFIGURATION", itemCode: "SERVICE_CONFIGURATION", remarks: "指定人员手机号加密", userId: "u1" }] });
  });
});

describe("BusinessConfigClient 流媒体配置接口", () => {
  test("分页查询沿用旧接口 URL 和查询字段", async () => {
    const calls: { method: string; url: string; body?: unknown }[] = [];
    const http: HttpClient = {
      get: async (url) => {
        calls.push({ method: "GET", url });
        return {
          records: [{ id: "m1", name: "H5S", username: "user", intranetAddress: "10.0.0.1", ipAddress: "https://vs.guhecloud.com/" }],
          total: 1,
        };
      },
      post: async (url, body) => {
        calls.push({ method: "POST", url, body });
      },
      put: async (url, body) => {
        calls.push({ method: "PUT", url, body });
      },
      delete: async (url) => {
        calls.push({ method: "DELETE", url });
      },
    };
    const client = createBusinessConfigClient(http);
    const page = await client.pageStreamMedia({ keyword: "H5S", pageNumber: 1, pageSize: 10 });

    expect(calls[0]).toEqual({ method: "GET", url: "/api/mdata/stream-media-configs?keyword=H5S&pageNumber=1&pageSize=10" });
    expect(page.total).toBe(1);
    expect(page.records[0]?.name).toBe("H5S");
  });

  test("新增、修改、删除沿用旧 CRUD 路径和 HTTP 方法", async () => {
    const calls: { method: string; url: string; body?: unknown }[] = [];
    const http: HttpClient = {
      get: async (url) => {
        calls.push({ method: "GET", url });
        return {};
      },
      post: async (url, body) => {
        calls.push({ method: "POST", url, body });
      },
      put: async (url, body) => {
        calls.push({ method: "PUT", url, body });
      },
      delete: async (url) => {
        calls.push({ method: "DELETE", url });
      },
    };
    const client = createBusinessConfigClient(http);
    const input = {
      name: "H5S",
      username: "admin",
      password: "secret",
      intranetAddress: "10.0.0.1",
      ipAddress: "https://vs.guhecloud.com/",
    };
    await client.createStreamMedia(input);
    await client.updateStreamMedia({ ...input, id: "media/1", password: undefined });
    await client.deleteStreamMedia("media/1");

    expect(calls).toEqual([
      { method: "POST", url: "/api/mdata/stream-media-config", body: input },
      { method: "PUT", url: "/api/mdata/stream-media-config/media%2F1", body: { ...input, id: "media/1", password: undefined } },
      { method: "DELETE", url: "/api/mdata/stream-media-config/media%2F1" },
    ]);
  });

  test("拒绝非分页格式响应和缺少 ID 的修改请求", async () => {
    const client = createBusinessConfigClient({
      get: async () => ({ records: "bad", total: 0 }),
      post: async () => undefined,
      put: async () => undefined,
      delete: async () => undefined,
    });
    await expect(client.pageStreamMedia({ pageNumber: 1, pageSize: 10 })).rejects.toThrow("流媒体配置分页响应格式错误");
    await expect(client.updateStreamMedia({ name: "x", username: "x", intranetAddress: "x", ipAddress: "" })).rejects.toThrow(
      "缺少记录 ID",
    );
  });

  test("文件清理策略保留旧分页、场景、保存与删除接口契约", async () => {
    const calls: { method: string; url: string; body?: unknown }[] = [];
    const client = createBusinessConfigClient({
      get: async (url) => {
        calls.push({ method: "GET", url });
        return url.includes("expiration/policy/page") ? { records: [], total: 0 } : [{ sceneCode: "M_DATA", sceneName: "基础数据" }];
      },
      post: async (url, body) => {
        calls.push({ method: "POST", url, body });
      },
      put: async (url, body) => {
        calls.push({ method: "PUT", url, body });
      },
      delete: async (url) => {
        calls.push({ method: "DELETE", url });
      },
    });
    const input = { sceneCode: "M_DATA", expirationPolicy: "BASED_ON_TIME_EXPIRATION", configInfo: "{}" };
    await client.pageFileCleanupPolicies({ pageNumber: 1, pageSize: 20, sceneCode: "M_DATA" });
    await client.getFileCleanupScenes();
    await client.createFileCleanupPolicy(input);
    await client.updateFileCleanupPolicy({ ...input, id: "p1" });
    await client.deleteFileCleanupPolicy("p1");

    expect(calls).toEqual([
      { method: "GET", url: "/api/file//get/expiration/policy/page?pageNumber=1&pageSize=20&sceneCode=M_DATA" },
      { method: "GET", url: "/api/file/get/scene/info/all" },
      { method: "POST", url: "/api/file/add/expiration/policy", body: input },
      { method: "PUT", url: "/api/file/update/expiration/policy", body: { ...input, id: "p1" } },
      { method: "DELETE", url: "/api/file/delete/expiration/policy/p1" },
    ]);
  });

  test("分析盒子配置沿用字典列表、新增、修改和删除接口", async () => {
    const calls: { method: string; url: string; body?: unknown }[] = [];
    const client = createBusinessConfigClient({
      get: async (url) => {
        calls.push({ method: "GET", url });
        return [{ id: "box1", itemCode: "VIDEO_ANALYSIS_BOX", name: "分析盒子", code: "", variable: "https://example.test" }];
      },
      post: async (url, body) => {
        calls.push({ method: "POST", url, body });
      },
      put: async (url, body) => {
        calls.push({ method: "PUT", url, body });
      },
      delete: async (url) => {
        calls.push({ method: "DELETE", url });
      },
    });
    const input = { name: "分析盒子", variable: "https://example.test" };
    expect(await client.listVideoAnalysisBoxes()).toHaveLength(1);
    await client.createVideoAnalysisBox(input);
    await client.updateVideoAnalysisBox({ ...input, id: "box1" });
    await client.deleteVideoAnalysisBox("box1");

    expect(calls).toEqual([
      { method: "GET", url: "/api/dictionary/getDataDictionaryByItem?itemCode=VIDEO_ANALYSIS_BOX" },
      { method: "POST", url: "/api/dictionary/addDataDictionary", body: { ...input, itemCode: "VIDEO_ANALYSIS_BOX" } },
      { method: "PUT", url: "/api/dictionary/updateDataDictionary", body: { ...input, id: "box1", itemCode: "VIDEO_ANALYSIS_BOX" } },
      { method: "DELETE", url: "/api/dictionary/deleteDataDictionary/box1" },
    ]);
  });

  test("第三方服务配置详情和保存沿用旧字典接口", async () => {
    const calls: { method: string; url: string; body?: unknown }[] = [];
    const records = [
      { id: "gd", itemCode: "THIRD_SERVICE", name: "高德地图服务", code: "gdMap" },
      { id: "td", itemCode: "THIRD_SERVICE", name: "天地图服务", code: "TD_MAP" },
      { id: "comm", itemCode: "THIRD_SERVICE", name: "通讯服务", code: "THIRD_SERVICE::correspond_service" },
      { id: "face", itemCode: "THIRD_SERVICE", name: "人脸识别", code: "att_identity_verify" },
      { id: "wx", itemCode: "THIRD_SERVICE", name: "微信公众号", code: "WX_OFFICIAL_ACCOUNT" },
    ];
    const client = createBusinessConfigClient({
      get: async (url) => {
        calls.push({ method: "GET", url });
        if (url.includes("getDictionaryItemByCode")) return { id: "item", code: "THIRD_SERVICE" };
        if (url.includes("getDataDictionaryById")) return { ...records[0], variable: '{"webKey":"saved"}' };
        return records;
      },
      post: async (url, body) => {
        calls.push({ method: "POST", url, body });
      },
      put: async (url, body) => {
        calls.push({ method: "PUT", url, body });
      },
      delete: async (url) => {
        calls.push({ method: "DELETE", url });
      },
    });
    expect(await client.getThirdPartyServices()).toHaveLength(5);
    expect((await client.getThirdPartyService("gd")).variable).toBe('{"webKey":"saved"}');
    await client.updateThirdPartyService({ ...records[0]!, variable: '{"webKey":"updated"}' });
    expect(calls).toEqual([
      { method: "GET", url: "/api/dictionary/getDictionaryItemByCode/THIRD_SERVICE" },
      { method: "GET", url: "/api/dictionary/getDataDictionaryByItem?itemCode=THIRD_SERVICE" },
      { method: "GET", url: "/api/dictionary/getDataDictionaryById/gd" },
      { method: "PUT", url: "/api/dictionary/updateDataDictionary", body: { ...records[0], variable: '{"webKey":"updated"}' } },
    ]);
  });

  test("第三方配置字典不存在时按旧初始化规则创建字典项和五类服务项", async () => {
    const calls: { method: string; url: string; body?: unknown }[] = [];
    const records: { id: string; itemCode: string; name: string; code: string }[] = [];
    const client = createBusinessConfigClient({
      get: async (url) => {
        calls.push({ method: "GET", url });
        if (url.includes("getDictionaryItemByCode")) return [];
        return records;
      },
      post: async (url, body) => {
        calls.push({ method: "POST", url, body });
        if (url.endsWith("addDataDictionary")) records.push({ ...(body as (typeof records)[number]), id: `id-${records.length}` });
      },
      put: async () => undefined,
      delete: async () => undefined,
    });
    expect(await client.getThirdPartyServices()).toHaveLength(5);
    expect(calls.filter((call) => call.method === "POST")).toHaveLength(6);
    expect(calls[0]).toEqual({ method: "GET", url: "/api/dictionary/getDictionaryItemByCode/THIRD_SERVICE" });
    expect(calls[1]).toEqual({
      method: "POST",
      url: "/api/dictionary/addDictionaryItem",
      body: { code: "THIRD_SERVICE", remarks: "第三方服务配置" },
    });
  });

  test("业务标签树、新增、修改、删除沿用标签服务接口", async () => {
    const calls: { method: string; url: string; body?: unknown }[] = [];
    const client = createBusinessConfigClient({
      get: async (url) => {
        calls.push({ method: "GET", url });
        return [{ id: "tag1", name: "重点区域", description: "", level: 1, childList: [] }];
      },
      post: async (url, body) => {
        calls.push({ method: "POST", url, body });
      },
      put: async (url, body) => {
        calls.push({ method: "PUT", url, body });
      },
      delete: async (url) => {
        calls.push({ method: "DELETE", url });
      },
    });
    const input = { name: "重点区域", description: "测试", parentId: "parent1" };
    expect(await client.listBusinessTags({ name: "重点", period: "2026-10-01 00:00:00,2026-10-09 23:59:59" })).toHaveLength(1);
    await client.createBusinessTag(input);
    await client.updateBusinessTag({ ...input, id: "tag1" });
    await client.deleteBusinessTag("tag1");
    expect(calls).toEqual([
      {
        method: "GET",
        url: "/api/tag/business-tag/tree?name=%E9%87%8D%E7%82%B9&period=2026-10-01+00%3A00%3A00%2C2026-10-09+23%3A59%3A59",
      },
      { method: "POST", url: "/api/tag/business-tag", body: input },
      { method: "PUT", url: "/api/tag/business-tag/tag1", body: { ...input, id: "tag1" } },
      { method: "DELETE", url: "/api/tag/business-tag/tag1" },
    ]);
  });

  test("业务标签详情和关联对象使用原标签服务路径与请求体", async () => {
    const calls: { method: string; url: string; body?: unknown }[] = [];
    const client = createBusinessConfigClient({
      get: async (url) => {
        calls.push({ method: "GET", url });
        if (url.includes("ref-ids")) return ["a1"];
        if (url.includes("business-tag/tag1")) return { id: "tag1", name: "重点区域", childList: [] };
        return { records: [{ id: "d1", name: "设备一" }], total: 1, pages: 1 };
      },
      post: async (url, body) => {
        calls.push({ method: "POST", url, body });
        return url.endsWith("/area") ? [{ id: "a1", name: "一区" }] : { records: [{ id: "d1", name: "设备一" }], total: 1, pages: 1 };
      },
      put: async () => undefined,
      delete: async () => undefined,
    });
    expect((await client.getBusinessTagDetails("tag1")).name).toBe("重点区域");
    expect(await client.getBusinessTagAssociationIds("tag1", "AREA")).toEqual(["a1"]);
    expect(await client.getBusinessTagAssociations({ tagId: "tag1", refType: "DEVICE", pageNumber: 1, pageSize: 10 })).toMatchObject({
      total: 1,
    });
    expect(await client.getBusinessTagAssociations({ tagId: "tag1", refType: "AREA" })).toEqual([{ id: "a1", name: "一区" }]);
    await client.addBusinessTagAssociations({ tagId: "tag1", refRequests: [{ tagRefType: "DEVICE", refId: "d1" }] });
    await client.removeBusinessTagAssociations({ tagId: "tag1", refIds: ["d1"] });
    expect(calls).toEqual([
      { method: "GET", url: "/api/tag/business-tag/tag1" },
      { method: "GET", url: "/api/tag/business-tag/tag1/ref-ids?refType=AREA" },
      { method: "POST", url: "/api/tag/business-tag/ref/device", body: { tagIds: ["tag1"], name: undefined, pageNumber: 1, pageSize: 10 } },
      { method: "POST", url: "/api/tag/business-tag/ref/area", body: { tagIds: ["tag1"], name: undefined } },
      { method: "POST", url: "/api/tag/business-tag/ref", body: { tagId: "tag1", refRequests: [{ tagRefType: "DEVICE", refId: "d1" }] } },
      { method: "POST", url: "/api/tag/business-tag/ref/remove", body: { tagId: "tag1", refIds: ["d1"] } },
    ]);
  });
});
