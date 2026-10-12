import type { Pagination } from "@g2-contract/base";

import type { CreateTemplateDemoParams, ListTemplateDemoParams, UpdateTemplateDemoParams } from "./request";
import type { TemplateDemoRecord } from "./response";

/**
 * ⚠️ 教学示例：详见 `enums.ts` 开头的声明。
 *
 * 本接口用于展示 cube-services 三层架构（interface / gateway / client）
 * 在前端应用中的装配方式，以及 `/template/demo/*` 这种**尚未接入 BFF**
 * 的接口直连原服务的写法。
 */
export interface TemplateDemoGateway {
  /** 列表查询（演示分页 + 过滤） */
  listTemplateDemo: (params: ListTemplateDemoParams) => Promise<Pagination<TemplateDemoRecord>>;

  /** 详情查询（演示路径参数） */
  getTemplateDemoDetail: (id: string) => Promise<TemplateDemoRecord | null>;

  /** 新增 */
  createTemplateDemo: (params: CreateTemplateDemoParams) => Promise<TemplateDemoRecord>;

  /** 更新 */
  updateTemplateDemo: (params: UpdateTemplateDemoParams) => Promise<TemplateDemoRecord>;

  /** 删除 */
  deleteTemplateDemo: (id: string) => Promise<void>;
}
