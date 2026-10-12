import type { AssetRow, OptionItem } from "@g2-contract/asset-management";
import { reactive } from "vue";

import { getClient } from "./domain-context";
import { ASSET_STATUS, BUSINESS_STATUS, options } from "./model";
export function optionTree(items: OptionItem[]): OptionItem[] {
  if (items.some((item) => item.children?.length)) {
    return items;
  }
  const ids = new Set(items.map((item) => item.id));
  const build = (item: OptionItem): OptionItem => ({
    ...item,
    children: items.filter((row) => row.parentId === item.id).map((row) => build(row)),
  });
  return items.filter((item) => !item.parentId || !ids.has(item.parentId)).map((item) => build(item));
}
export function useOptions() {
  const data = reactive<{
    departments: OptionItem[];
    assetType: OptionItem[];
    assetSource: OptionItem[];
    scrapReason: OptionItem[];
    warehouses: OptionItem[];
    categories: OptionItem[];
    areas: OptionItem[];
  }>({ departments: [], assetType: [], assetSource: [], scrapReason: [], warehouses: [], categories: [], areas: [] });
  const load = async (sources: string[]) => {
    await Promise.all(
      [...new Set(sources)].map(async (source) => {
        const client = getClient();
        if (source === "departments") {
          data.departments = optionTree(await client.organizations());
        }
        if (source === "assetType") {
          const map = (rows: AssetRow[]): OptionItem[] =>
            rows.map((row) => ({
              id: row.id,
              name: String(row.name ?? ""),
              children: row.children?.length ? map(row.children) : undefined,
            }));
          data.assetType = map(await client.classificationTree());
        }
        if (source === "assetSource") {
          data.assetSource = await client.classifications("assetSource");
        }
        if (source === "scrapReason") {
          data.scrapReason = await client.classifications("reasonForScrapping");
        }
        if (source === "warehouses") {
          data.warehouses = (await client.page("warehouse", { pageNumber: 1, pageSize: 1000 })).records.map((item) => ({
            id: item.id,
            name: String(item.name),
          }));
        }
        if (source === "categories") {
          data.categories = await client.categories();
        }
        if (source === "areas") {
          data.areas = optionTree(await client.areas());
        }
      }),
    );
  };
  const select = (source: string) =>
    source === "business"
      ? BUSINESS_STATUS
      : source === "asset"
        ? ASSET_STATUS
        : source === "check"
          ? [
              { label: "未完成", value: "UNDONE" },
              { label: "已完成", value: "FINISH" },
            ]
          : options(data[source as keyof typeof data] ?? []);
  return { data, load, select };
}
