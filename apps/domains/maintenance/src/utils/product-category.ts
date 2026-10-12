import { getDeviceCenterClient } from "@/domain-context";

/** 设备中心 IoT 产品品类树节点（旧页 Cascader 字段映射 categoryName/categoryCode）。 */
export interface ProductCategoryNode {
  categoryCode: string;
  categoryName: string;
  children?: ProductCategoryNode[];
}

/** Cascader 的 fieldNames：与旧页 `field` 配置一致。 */
export const PRODUCT_CATEGORY_FIELD_NAMES = { label: "categoryName", value: "categoryCode", children: "children" };

/** 叶子节点若带空 children，Cascader 会渲染出无意义的展开箭头；这里生成渲染副本剔除空数组。 */
function stripEmptyChildren(nodes: ProductCategoryNode[]): ProductCategoryNode[] {
  return nodes.map((node) => {
    const children = Array.isArray(node.children) && node.children.length > 0 ? stripEmptyChildren(node.children) : undefined;
    return children ? { ...node, children } : { categoryCode: node.categoryCode, categoryName: node.categoryName };
  });
}

export async function loadProductCategoryTree(): Promise<ProductCategoryNode[]> {
  const client = await getDeviceCenterClient();
  const response = await client.getIotProductCategoryTree();
  const raw = response && typeof response === "object" && "data" in response ? (response as { data: unknown }).data : response;
  return Array.isArray(raw) ? stripEmptyChildren(raw as ProductCategoryNode[]) : [];
}

/** 旧页提交时只取 Cascader 的末级品类编码。 */
export function lastCategoryCode(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const last = value[value.length - 1];
    return last === undefined || last === null || last === "" ? undefined : String(last);
  }
  return value === undefined || value === null || value === "" ? undefined : String(value);
}
