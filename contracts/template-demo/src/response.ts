import type { TemplateDemoStatus } from "./enums";

/**
 * ⚠️ 教学示例：详见 `enums.ts` 开头的声明。
 */

export interface TemplateDemoRecord {
  id: string;
  name: string;
  status: TemplateDemoStatus;
  createdAt: number;
  remark?: string;
}
