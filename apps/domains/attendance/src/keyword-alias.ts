import type { DictionaryClient } from "@g2-client/dictionary/client";
import { reactive } from "vue";

import { getDomainContext } from "./domain-context";
export const KEYWORD_ALIAS = reactive<Record<string, string>>({ staff: "员工", company: "公司" });
export async function initializeKeywordAlias(): Promise<void> {
  const client = await getDomainContext().ensureClient<DictionaryClient>("dictionaryClient");
  const field = await client.getDictionaryItemByCode("FIELD_CONFIG");
  if (!field) {
    return;
  }
  const rows = await client.getDictionaryByItem({ itemCode: "FIELD_CONFIG" });
  for (const row of rows) {
    if (!row.variable) {
      continue;
    }
    const value: unknown = JSON.parse(row.variable);
    if (!value || typeof value !== "object" || !("keywords" in value) || !Array.isArray(value.keywords)) {
      continue;
    }
    for (const item of value.keywords as { key: string; fieldName: string; alias?: string }[]) {
      KEYWORD_ALIAS[item.key] = item.alias || item.fieldName;
    }
  }
}
