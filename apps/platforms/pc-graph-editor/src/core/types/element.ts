/**
 * 元素定义（用于元素库）
 */
export interface ElementDefinition {
  id: string;
  name: string;
  type: "node" | "edge";
  category?: string;
  icon?: string;
  shape: string;
  defaultConfig?: Record<string, any>;
  preview?: string;
  [key: string]: any;
}

/**
 * 元素分类
 */
export interface ElementCategory {
  id: string;
  name: string;
  icon?: string;
  elements: ElementDefinition[];
}
