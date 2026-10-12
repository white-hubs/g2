import { getDeviceCenterClient } from "@/domain-context";

/** 设备中心 IoT 产品品类树节点（旧页字段映射 categoryName/categoryCode）。 */
export interface ProductCategoryNode {
  categoryCode: string;
  categoryName: string;
  /** 委外范围 TreeSelect 用拼接编码作为值，与旧页 `categoryCodeConcat` 一致。 */
  categoryCodeConcat?: string;
  children?: ProductCategoryNode[];
}

/** Cascader 的 fieldNames：与旧页 `field` 配置一致。 */
export const PRODUCT_CATEGORY_FIELD_NAMES = { label: "categoryName", value: "categoryCode", children: "children" };

/** 委外范围 TreeSelect 的 fieldNames：旧页取 `categoryCodeConcat` 作为值。 */
export const PRODUCT_CATEGORY_TREE_FIELD_NAMES = { label: "categoryName", value: "categoryCodeConcat", children: "children" };

/** 叶子节点若带空 children，Cascader/TreeSelect 会渲染出无意义的展开箭头；这里生成渲染副本剔除空数组。 */
function stripEmptyChildren(nodes: ProductCategoryNode[]): ProductCategoryNode[] {
  return nodes.map((node) => {
    const children = Array.isArray(node.children) && node.children.length > 0 ? stripEmptyChildren(node.children) : undefined;
    const base: ProductCategoryNode = {
      categoryCode: node.categoryCode,
      categoryName: node.categoryName,
      // 后端未下发拼接编码时回退到本级编码，保证 TreeSelect 的值不为空。
      categoryCodeConcat: node.categoryCodeConcat ?? node.categoryCode,
    };
    return children ? { ...base, children } : base;
  });
}

export async function loadProductCategoryTree(): Promise<ProductCategoryNode[]> {
  const client = await getDeviceCenterClient();
  const response = await client.getIotProductCategoryTree();
  const raw = response && typeof response === "object" && "data" in response ? (response as { data: unknown }).data : response;
  return Array.isArray(raw) ? stripEmptyChildren(raw as ProductCategoryNode[]) : [];
}
