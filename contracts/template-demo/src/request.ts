import type { TemplateDemoStatus } from "./enums";

/**
 * ⚠️ 教学示例：详见 `enums.ts` 开头的声明。
 */

export interface ListTemplateDemoParams {
  pageNumber?: number;
  pageSize?: number;
  keyword?: string;
  status?: TemplateDemoStatus | "";
}

export interface CreateTemplateDemoParams {
  name: string;
  status?: TemplateDemoStatus;
  remark?: string;
}

export interface UpdateTemplateDemoParams extends CreateTemplateDemoParams {
  id: string;
}
