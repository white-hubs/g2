import { unwrapList } from "./unwrap";
import { getMdataClient } from "@/domain-context";

export type AreaTreeNode = {
  id: string | number;
  name: string;
  children?: AreaTreeNode[];
};

/** mdata 区域树，供疏散配置 / 指挥页使用 */
export async function fetchMdataAreaTree(): Promise<AreaTreeNode[]> {
  const client = await getMdataClient();
  return unwrapList<AreaTreeNode>(await client.getAreaTree());
}
