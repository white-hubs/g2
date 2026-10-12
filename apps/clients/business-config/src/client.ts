import type * as CompositionContract from "@g2-composition/contract";
import type {
  BusinessConfigClient,
  BusinessTagAssociation,
  BusinessTagRefType,
  BusinessTag,
  BusinessArea,
  BusinessAreaImportResult,
  BusinessAreaInput,
  AliasRecord,
  BusinessApplication,
  BusinessOrganization,
  FileCleanupPolicy,
  FileCleanupScene,
  StreamMediaConfig,
  ThirdPartyServiceConfig,
  VideoAnalysisBox,
} from "@g2-contract/business-config";

export interface HttpClient {
  get(url: string, init?: RequestInit): Promise<unknown>;
  post(url: string, body?: unknown, init?: RequestInit): Promise<unknown>;
  put(url: string, body?: unknown, init?: RequestInit): Promise<unknown>;
  delete(url: string, init?: RequestInit): Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform(ctx: CompositionContract.PlatformContext): HttpClient;
}

function withQuery(path: string, params: object): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  }
  return query.size ? `${path}?${query}` : path;
}

function unwrap<T>(response: unknown): T {
  if (!response || typeof response !== "object" || response instanceof Blob) return response as T;
  const value = response as Record<string, unknown>;
  const codeLooksLikeStatus = value.code !== undefined && /^(0|\d{3})$/.test(String(value.code));
  const hasEnvelopeFields = "success" in value || "message" in value || "msg" in value || "errorMessage" in value;
  if (
    value.success === false ||
    ((hasEnvelopeFields || codeLooksLikeStatus) && value.code !== undefined && !["0", "200"].includes(String(value.code)))
  ) {
    throw new Error(String(value.message ?? value.msg ?? value.errorMessage ?? "请求失败"));
  }
  const envelope =
    "data" in value && ("code" in value || "success" in value || "message" in value || "msg" in value || Object.keys(value).length === 1);
  return (envelope ? value.data : response) as T;
}

export function createBusinessConfigClient(http: HttpClient, tenantCode = ""): BusinessConfigClient {
  const tenantHeaders = (): RequestInit => ({ headers: { tenant: tenantCode } });
  const asBlob = (value: unknown, label: string): Blob => {
    if (!(value instanceof Blob)) throw new Error(`${label}响应格式错误`);
    return value;
  };
  return {
    pageStreamMedia: async (params) => {
      const result = unwrap<{ records?: StreamMediaConfig[]; total?: unknown }>(
        await http.get(withQuery("/api/mdata/stream-media-configs", params)),
      );
      if (!Array.isArray(result?.records) || !Number.isFinite(Number(result.total))) throw new Error("流媒体配置分页响应格式错误");
      return { records: result.records, total: Number(result.total) };
    },
    createStreamMedia: async (input) => {
      await http.post("/api/mdata/stream-media-config", input);
    },
    updateStreamMedia: async (input) => {
      if (!input.id) throw new Error("修改流媒体配置缺少记录 ID");
      await http.put(`/api/mdata/stream-media-config/${encodeURIComponent(input.id)}`, input);
    },
    deleteStreamMedia: async (id) => {
      await http.delete(`/api/mdata/stream-media-config/${encodeURIComponent(id)}`);
    },
    pageFileCleanupPolicies: async (params) => {
      const result = unwrap<{ records?: FileCleanupPolicy[]; total?: unknown }>(
        await http.get(withQuery("/api/file//get/expiration/policy/page", params)),
      );
      if (!Array.isArray(result?.records) || !Number.isFinite(Number(result.total))) {
        throw new Error("文件清理策略分页响应格式错误");
      }
      return { records: result.records, total: Number(result.total) };
    },
    getFileCleanupScenes: async () => {
      const scenes = unwrap<FileCleanupScene[]>(await http.get("/api/file/get/scene/info/all"));
      if (!Array.isArray(scenes)) throw new Error("文件场景响应格式错误");
      return scenes;
    },
    createFileCleanupPolicy: async (input) => {
      await http.post("/api/file/add/expiration/policy", input);
    },
    updateFileCleanupPolicy: async (input) => {
      if (!input.id) throw new Error("修改文件清理策略缺少记录 ID");
      await http.put("/api/file/update/expiration/policy", input);
    },
    deleteFileCleanupPolicy: async (id) => {
      await http.delete(`/api/file/delete/expiration/policy/${encodeURIComponent(id)}`);
    },
    listBusinessAreaTree: async (query = {}) => {
      const records = unwrap<BusinessArea[]>(await http.get(withQuery("/api/mdata/area/list", query)));
      if (!Array.isArray(records)) throw new Error("区域列表响应格式错误");
      return records;
    },
    getBusinessArea: async (id) => {
      const record = unwrap<BusinessArea>(await http.get(`/api/mdata/area/${encodeURIComponent(id)}`));
      if (!record || !record.id) throw new Error("区域详情响应格式错误");
      return record;
    },
    createBusinessArea: async (input) => {
      await http.post("/api/mdata/area/extend", input);
    },
    updateBusinessArea: async (input) => {
      if (!input.id) throw new Error("修改区域缺少记录 ID");
      await http.put("/api/mdata/area/extend", input);
    },
    deleteBusinessArea: async (id) => {
      await http.delete(`/api/mdata/area/${encodeURIComponent(id)}`);
    },
    saveBusinessAreaSort: async (rows) => {
      await http.post("/api/mdata/area/sort/edit", rows);
    },
    exportBusinessArea: async (query) => asBlob(await http.get(withQuery("/api/mdata/area/export", { pageNumber: 1, pageSize: 10000, ...query })), "区域导出"),
    exportBusinessAreaTemplate: async () => asBlob(await http.get("/api/mdata/area/import/template"), "区域模板下载"),
    importBusinessArea: async (file) => {
      const form = new FormData();
      form.append("file", file);
      const result = unwrap<BusinessAreaImportResult>(await http.post("/api/mdata/area/import", form));
      if (!result || typeof result !== "object") throw new Error("区域导入结果格式错误");
      result.errorMsg = Array.isArray(result.errorMsg) ? result.errorMsg : [];
      return result;
    },
    uploadBusinessConfigFile: async ({ file, sceneCode, businessKey = "mdata", useTemporary = false }) => {
      const form = new FormData();
      form.append("businessKey", businessKey);
      if (sceneCode) form.append("sceneCode", sceneCode);
      if (useTemporary) form.append("useTemporary", "true");
      form.append("file", file);
      const result = unwrap<{ id?: string; name?: string; path?: string }>(
        await http.post(useTemporary ? "/api/file/upload/temporary" : "/api/file/file", form),
      );
      if (!result?.id) throw new Error("文件上传未返回文件编号");
      return { id: String(result.id), name: result.name, path: result.path };
    },
    getBusinessConfigFile: async (id) => {
      const record = unwrap<{ id?: string; name?: string; path?: string }>(await http.get(`/api/file/file/${encodeURIComponent(id)}`));
      if (!record?.id) throw new Error("文件详情响应格式错误");
      return { id: String(record.id), name: record.name, path: record.path };
    },
    getUserTerminals: async () => {
      const records = unwrap<{ id?: string; code: string; name: string; alias?: string }[]>(
        await http.get("/api/ouaa/context/user/terminals"),
      );
      if (!Array.isArray(records)) throw new Error("访问端列表响应格式错误");
      return records;
    },
    listTerminalAliases: async () => {
      const [terminals, configs] = await Promise.all([
        (async () => {
          const value = unwrap<{ id?: string; code: string; name: string; alias?: string }[]>(await http.get("/api/ouaa/context/user/terminals"));
          if (!Array.isArray(value)) throw new Error("访问端列表响应格式错误");
          return value;
        })(),
        (async () => {
          const value = unwrap<AliasRecord[]>(await http.get("/api/dictionary/getDataDictionaryByItem?itemCode=TERMINAL_ALIAS"));
          if (!Array.isArray(value)) throw new Error("访问端别名响应格式错误");
          return value;
        })(),
      ]);
      const byCode = new Map(configs.map((record) => [record.code, record]));
      const result: AliasRecord[] = terminals
        .filter((terminal) => terminal.code !== "bimops-manage-app")
        .map((terminal) => {
          const config = byCode.get(terminal.code);
          let alias: AliasRecord["alias"] = {};
          try {
            alias = config?.variable ? JSON.parse(config.variable) as AliasRecord["alias"] : {};
          } catch {
            throw new Error(`访问端 ${terminal.name} 的别名配置格式错误`);
          }
          return { ...terminal, id: config?.id, alias };
        });
      result.push(...configs.filter((config) => !terminals.some((terminal) => terminal.code === config.code)).map((config) => {
          let alias: AliasRecord["alias"] = {};
          try { alias = config.variable ? JSON.parse(config.variable) as AliasRecord["alias"] : {}; }
          catch { throw new Error(`访问端 ${config.name} 的别名配置格式错误`); }
          return { id: config.id, code: config.code, name: config.name, alias, canDelete: true } as AliasRecord;
        }));
      return result;
    },
    saveTerminalAlias: async ({ code, name, path }) => {
      const params = { itemCode: "TERMINAL_ALIAS", name: code, code, changeNotice: "REDIS", variable: JSON.stringify({ name, path }) };
      const existing = unwrap<AliasRecord[]>(await http.get(withQuery("/api/dictionary/getDataDictionaryByItem", { itemCode: params.itemCode, name: code, code })));
      if (!Array.isArray(existing)) throw new Error("访问端别名查询响应格式错误");
      if (existing[0]?.id) await http.put("/api/dictionary/updateDataDictionary", { ...params, id: existing[0].id });
      else {
        const item = unwrap<unknown>(await http.get("/api/dictionary/getDictionaryItemByCode/TERMINAL_ALIAS"));
        if (!item) await http.post("/api/dictionary/addDictionaryItem", { code: "TERMINAL_ALIAS", remarks: "系统别名配置" });
        await http.post("/api/dictionary/addDataDictionary", params);
      }
    },
    deleteBusinessAlias: async (id) => {
      await http.delete(`/api/dictionary/deleteDataDictionary/${encodeURIComponent(id)}`);
    },
    listBusinessApplications: async () => {
      const headers = tenantHeaders();
      const tenant = (headers.headers as Record<string, string>).tenant;
      const records = unwrap<BusinessApplication[]>(
        await http.get(`/api/ouaa/tenant-under-tenant/${encodeURIComponent(tenant)}/product-applications?alisaFlag=false`, headers),
      );
      if (!Array.isArray(records)) throw new Error("应用列表响应格式错误");
      return records.map((record) => {
        let alias: BusinessApplication["alias"] = {};
        try {
          alias = record.alias ? JSON.parse(record.alias as unknown as string) : {};
        } catch {
          throw new Error(`应用 ${record.name} 的别名配置格式错误`);
        }
        return { ...record, alias };
      });
    },
    saveApplicationAlias: async ({ code, name, icon }) => {
      const params = { itemCode: "APPLICATION_ALIAS", name: code, code, changeNotice: "REDIS", variable: JSON.stringify({ name, icon }) };
      const existing = unwrap<AliasRecord[]>(await http.get(withQuery("/api/dictionary/getDataDictionaryByItem", { itemCode: params.itemCode, name: code, code })));
      if (!Array.isArray(existing)) throw new Error("应用别名查询响应格式错误");
      if (existing[0]?.id) await http.put("/api/dictionary/updateDataDictionary", { ...params, id: existing[0].id });
      else {
        const item = unwrap<unknown>(await http.get("/api/dictionary/getDictionaryItemByCode/APPLICATION_ALIAS"));
        if (!item) await http.post("/api/dictionary/addDictionaryItem", { code: "APPLICATION_ALIAS", remarks: "系统别名配置" });
        await http.post("/api/dictionary/addDataDictionary", params);
      }
    },
    listAliasApplicationGroups: async (terminal) => {
      const result = unwrap<{ id: string; name: string; applicationPageVOS: BusinessApplication[] }[]>(
        await http.get("/api/ouaa/context/terminal-application-groups", { headers: { terminal } }),
      );
      if (!Array.isArray(result)) throw new Error("访问端应用分组响应格式错误");
      return result;
    },
    listAliasMenus: async (applicationCode, terminal) => {
      const result = unwrap<AliasRecord[]>(
        await http.get(withQuery("/api/ouaa/context/terminal-application-menus", { applicationCode, alisaFlag: false }), { headers: { terminal } }),
      );
      if (!Array.isArray(result)) throw new Error("菜单别名列表响应格式错误");
      const alias = unwrap<AliasRecord[]>(await http.get(withQuery("/api/dictionary/getDataDictionaryByItem", {
        itemCode: "MENU_ALIAS", name: `${terminal}::${applicationCode}`, code: `${terminal}::${applicationCode}`,
      })));
      if (!Array.isArray(alias)) throw new Error("菜单别名字典响应格式错误");
      const aliasByCode = new Map<string, AliasRecord["alias"]>();
      try {
        for (const entry of alias) {
          const config = entry.variable ? JSON.parse(entry.variable as unknown as string) as AliasRecord[] : [];
          for (const item of config) aliasByCode.set(item.code, { name: item.name, icon: item.icon, sort: item.sort });
        }
      } catch {
        throw new Error("菜单别名配置格式错误");
      }
      const merge = (items: AliasRecord[]): AliasRecord[] => items.map((item, index) => ({
        ...item, alias: aliasByCode.get(item.code) ?? {}, sort: aliasByCode.get(item.code)?.sort ?? item.sort ?? index + 1,
        children: item.children ? merge(item.children) : undefined,
      }));
      return merge(result);
    },
    saveMenuAliases: async ({ terminalCode, applicationCode, alias }) => {
      const code = `${terminalCode}::${applicationCode}`;
      const params = { itemCode: "MENU_ALIAS", name: code, code, changeNotice: "REDIS", variable: JSON.stringify(alias) };
      const existing = unwrap<AliasRecord[]>(await http.get(withQuery("/api/dictionary/getDataDictionaryByItem", { itemCode: params.itemCode, name: code, code })));
      if (!Array.isArray(existing)) throw new Error("菜单别名查询响应格式错误");
      if (existing[0]?.id) await http.put("/api/dictionary/updateDataDictionary", { ...params, id: existing[0].id });
      else {
        const item = unwrap<unknown>(await http.get("/api/dictionary/getDictionaryItemByCode/MENU_ALIAS"));
        if (!item) await http.post("/api/dictionary/addDictionaryItem", { code: "MENU_ALIAS", remarks: "系统别名配置" });
        await http.post("/api/dictionary/addDataDictionary", params);
      }
    },
    getBusinessSetting: async (code) => {
      const itemCode = "SERVICE_CONFIGURATION";
      const dictionary = unwrap<unknown>(await http.get(`/api/dictionary/getDictionaryItemByCode/${itemCode}`));
      const exists = Array.isArray(dictionary) ? dictionary.length > 0 : dictionary !== null && dictionary !== undefined && dictionary !== false;
      if (!exists) await http.post("/api/dictionary/addDictionaryItem", { code: itemCode, remarks: "系统通用业务配置" });
      let records = unwrap<ThirdPartyServiceConfig[]>(await http.get(withQuery("/api/dictionary/getDataDictionaryByItem", { itemCode })));
      if (!Array.isArray(records)) throw new Error("业务配置响应格式错误");
      let record = records.find((item) => item.code === code);
      if (!record && code === itemCode) {
        await http.post("/api/dictionary/addDataDictionary", { code, itemCode, name: "通用配置" });
        records = unwrap<ThirdPartyServiceConfig[]>(await http.get(withQuery("/api/dictionary/getDataDictionaryByItem", { itemCode })));
        if (!Array.isArray(records)) throw new Error("业务配置响应格式错误");
        record = records.find((item) => item.code === code);
      }
      return record;
    },
    saveBusinessSetting: async (input) => {
      if (input.id) await http.put("/api/dictionary/updateDataDictionary", input);
      else await http.post("/api/dictionary/addDataDictionary", { ...input, itemCode: "SERVICE_CONFIGURATION" });
    },
    listPhoneEncryptionUsers: async () => {
      const records = unwrap<{ id?: string; userId?: string }[]>(
        await http.get("/api/dictionary/user-dictionary/list?itemCode=SERVICE_CONFIGURATION&queryType=ALL"),
      );
      if (!Array.isArray(records)) throw new Error("手机号加密人员响应格式错误");
      return records.map((record) => ({ id: String(record.id ?? ""), userId: String(record.userId ?? "") }));
    },
    listTenantUsers: async (query) => {
      const result = unwrap<{ records?: import("@g2-contract/business-config").TenantUser[]; total?: number } | import("@g2-contract/business-config").TenantUser[]>(
        await http.get(withQuery("/api/ouaa/tenant/user/list", { enabled: true, ...query })),
      );
      const records = Array.isArray(result) ? result : result?.records;
      if (!Array.isArray(records)) throw new Error("租户人员列表响应格式错误");
      return records;
    },
    listBusinessOrganizations: async () => {
      const records = unwrap<BusinessOrganization[]>(await http.get("/api/ouaa/authenticated/organizations/list?enabled=true"));
      if (!Array.isArray(records)) throw new Error("组织机构响应格式错误");
      return records;
    },
    savePhoneEncryptionUsers: async (userIds, existing) => {
      const existingByUser = new Map(existing.map((record) => [record.userId, record.id]));
      const payload = userIds.map((userId) => ({
        ...(existingByUser.has(userId) ? { id: existingByUser.get(userId) } : {}),
        name: "true", code: "SERVICE_CONFIGURATION", itemCode: "SERVICE_CONFIGURATION", remarks: "指定人员手机号加密", userId,
      }));
      await http.post("/api/dictionary/user-dictionary/add/or/update/batch", payload);
    },
    deleteVideoAnalysisBox: async (id) => {
      await http.delete(`/api/dictionary/deleteDataDictionary/${encodeURIComponent(id)}`);
    },
    listVideoAnalysisBoxes: async () => {
      const records = unwrap<VideoAnalysisBox[]>(
        await http.get(withQuery("/api/dictionary/getDataDictionaryByItem", { itemCode: "VIDEO_ANALYSIS_BOX" })),
      );
      if (!Array.isArray(records)) throw new Error("分析盒子配置响应格式错误");
      return records;
    },
    createVideoAnalysisBox: async (input) => {
      await http.post("/api/dictionary/addDataDictionary", { ...input, itemCode: "VIDEO_ANALYSIS_BOX" });
    },
    updateVideoAnalysisBox: async (input) => {
      if (!input.id) throw new Error("修改分析盒子配置缺少记录 ID");
      await http.put("/api/dictionary/updateDataDictionary", { ...input, itemCode: "VIDEO_ANALYSIS_BOX" });
    },
    getThirdPartyServices: async () => {
      const item = unwrap<unknown>(await http.get("/api/dictionary/getDictionaryItemByCode/THIRD_SERVICE"));
      const itemExists = Array.isArray(item) ? item.length > 0 : item !== null && item !== undefined && item !== false;
      if (!itemExists) {
        await http.post("/api/dictionary/addDictionaryItem", { code: "THIRD_SERVICE", remarks: "第三方服务配置" });
      }
      let records = unwrap<ThirdPartyServiceConfig[]>(
        await http.get(withQuery("/api/dictionary/getDataDictionaryByItem", { itemCode: "THIRD_SERVICE" })),
      );
      if (!Array.isArray(records)) throw new Error("第三方服务配置响应格式错误");
      const definitions = [
        { code: "gdMap", name: "高德地图服务" },
        { code: "TD_MAP", name: "天地图服务" },
        { code: "THIRD_SERVICE::correspond_service", name: "通讯服务" },
        { code: "att_identity_verify", name: "人脸识别" },
        { code: "WX_OFFICIAL_ACCOUNT", name: "微信公众号" },
      ];
      const missing = definitions.filter((definition) => !records.some((record) => record.code === definition.code));
      for (const definition of missing) {
        await http.post("/api/dictionary/addDataDictionary", { ...definition, itemCode: "THIRD_SERVICE" });
      }
      if (missing.length) {
        records = unwrap<ThirdPartyServiceConfig[]>(
          await http.get(withQuery("/api/dictionary/getDataDictionaryByItem", { itemCode: "THIRD_SERVICE" })),
        );
        if (!Array.isArray(records)) throw new Error("第三方服务配置响应格式错误");
      }
      return definitions.flatMap((definition) => {
        const record = records.find((entry) => entry.code === definition.code);
        return record ? [{ ...record, name: definition.name }] : [];
      });
    },
    getThirdPartyService: async (id) => {
      const record = unwrap<ThirdPartyServiceConfig>(await http.get(`/api/dictionary/getDataDictionaryById/${encodeURIComponent(id)}`));
      if (!record || typeof record !== "object" || !record.id) throw new Error("第三方服务配置详情格式错误");
      return record;
    },
    updateThirdPartyService: async (input) => {
      await http.put("/api/dictionary/updateDataDictionary", input);
    },
    listBusinessTags: async (query) => {
      const records = unwrap<BusinessTag[]>(await http.get(withQuery("/api/tag/business-tag/tree", query)));
      if (!Array.isArray(records)) throw new Error("业务标签列表响应格式错误");
      return records;
    },
    createBusinessTag: async (input) => {
      await http.post("/api/tag/business-tag", input);
    },
    updateBusinessTag: async (input) => {
      if (!input.id) throw new Error("修改业务标签缺少记录 ID");
      await http.put(`/api/tag/business-tag/${encodeURIComponent(input.id)}`, input);
    },
    deleteBusinessTag: async (id) => {
      await http.delete(`/api/tag/business-tag/${encodeURIComponent(id)}`);
    },
    getBusinessTagDetails: async (id) => {
      const record = unwrap<BusinessTag>(await http.get(`/api/tag/business-tag/${encodeURIComponent(id)}`));
      if (!record || !record.id) throw new Error("业务标签详情响应格式错误");
      return record;
    },
    getBusinessTagAssociationIds: async (tagId, refType) => {
      const ids = unwrap<string[]>(await http.get(withQuery(`/api/tag/business-tag/${encodeURIComponent(tagId)}/ref-ids`, { refType })));
      if (!Array.isArray(ids)) throw new Error("标签关联 ID 响应格式错误");
      return ids;
    },
    getBusinessTagAssociations: async ({ tagId, refType, name, pageNumber = 1, pageSize = 10 }) => {
      const base = `/api/tag/business-tag/ref`;
      const payload = { tagIds: [tagId], name, pageNumber, pageSize };
      if (refType === "AREA") {
        const records = unwrap<BusinessTagAssociation[]>(await http.post(`${base}/area`, { tagIds: [tagId], name }));
        if (!Array.isArray(records)) throw new Error("区域关联响应格式错误");
        return records;
      }
      const pathByType: Record<Exclude<BusinessTagRefType, "AREA">, string> = {
        DEVICE: "device",
        PROPERTY: "property-detailed",
        STALL: "stall",
        SITE_POINT: "scene-point",
        SMALL_ENGINEERING: "project-schedule",
        PATROL_POINT: "patrol-point",
        RISK_SOURCE: "risk-source",
      };
      const result = unwrap<{ records?: BusinessTagAssociation[]; total?: unknown; pages?: number }>(
        await http.post(`${base}/${pathByType[refType]}`, payload),
      );
      if (!Array.isArray(result?.records) || !Number.isFinite(Number(result.total))) throw new Error("标签关联分页响应格式错误");
      return { records: result.records, total: Number(result.total), pages: result.pages };
    },
    addBusinessTagAssociations: async (input) => {
      await http.post("/api/tag/business-tag/ref", input);
    },
    removeBusinessTagAssociations: async (input) => {
      await http.post("/api/tag/business-tag/ref/remove", input);
    },
  };
}

export async function create(ctx: CompositionContract.PlatformContext): Promise<BusinessConfigClient> {
  const module = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  const auth = ctx.getAuthHeaders();
  return createBusinessConfigClient(module.createHttpClientForPlatform(ctx), auth.tenant ?? auth.Tenant ?? "");
}

export type { BusinessConfigClient };
