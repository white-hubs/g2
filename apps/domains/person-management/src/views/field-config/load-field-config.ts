import type { DictionaryRecord, PersonnelManagementClient } from "@g2-contract/person-management";

import { ITEM_CODE, ROSTER_CONFIG, type RosterFieldVariable, rosterFieldVariable } from "./fields";

type FieldDictionaryClient = Pick<
  PersonnelManagementClient,
  "getDictionaryItemByCode" | "createDictionaryItem" | "getDictionaryByItem" | "createDataDictionary" | "updateDataDictionary"
>;

export interface LoadedFieldConfig {
  dictionary: DictionaryRecord;
  variable: RosterFieldVariable;
}

export async function loadFieldConfig(client: FieldDictionaryClient): Promise<LoadedFieldConfig> {
  const dictionaryItem = await client.getDictionaryItemByCode({ code: ITEM_CODE });
  if (!dictionaryItem) {
    await client.createDictionaryItem({ code: ITEM_CODE, remarks: "字段配置" });
  }

  let dictionaries = await client.getDictionaryByItem({ itemCode: ITEM_CODE });
  let roster = dictionaries.find((item) => item.code === ROSTER_CONFIG.code);
  if (!roster) {
    await client.createDataDictionary({
      code: ROSTER_CONFIG.code,
      itemCode: ITEM_CODE,
      name: ROSTER_CONFIG.name,
      variable: JSON.stringify(ROSTER_CONFIG.variable),
    });
    dictionaries = await client.getDictionaryByItem({ itemCode: ITEM_CODE });
    roster = dictionaries.find((item) => item.code === ROSTER_CONFIG.code);
  }
  if (!roster) {
    throw new Error("员工字段配置不存在");
  }

  const merged = rosterFieldVariable(roster.variable);
  // 旧字典的既有设置优先，仅在需要补齐字段或关键字时回写。
  if (roster.variable !== JSON.stringify(merged)) {
    await client.updateDataDictionary({
      id: roster.id,
      itemCode: roster.itemCode || ITEM_CODE,
      name: roster.name || ROSTER_CONFIG.name,
      code: roster.code || ROSTER_CONFIG.code,
      remarks: roster.remarks,
      version: roster.version,
      variable: JSON.stringify(merged),
    });
  }
  return { dictionary: roster, variable: merged };
}
