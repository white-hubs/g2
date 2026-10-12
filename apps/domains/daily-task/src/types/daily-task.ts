export interface SceneConfigDTO {
  code?: string;
  businessType?: string;
  label?: string;
  notifyChannel?: string[];
  noticeItems?: unknown[];
  [key: string]: unknown;
}

export interface AreaTree {
  id: string;
  name: string;
  code?: string;
  children?: AreaTree[];
  [key: string]: unknown;
}

export interface AreaModel extends AreaTree {}
