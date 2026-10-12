import { describe, expect, it, mock } from "bun:test";

import { ITEM_CODE, ROSTER_CONFIG } from "./fields";
import { loadFieldConfig } from "./load-field-config";

function makeClient(variable = JSON.stringify(ROSTER_CONFIG.variable)) {
  return {
    getDictionaryItemByCode: mock(async () => ({ code: ITEM_CODE })),
    createDictionaryItem: mock(async () => undefined),
    getDictionaryByItem: mock(async () => [
      { id: "roster-1", itemCode: ITEM_CODE, name: ROSTER_CONFIG.name, code: ROSTER_CONFIG.code, variable },
    ]),
    createDataDictionary: mock(async () => undefined),
    updateDataDictionary: mock(async () => undefined),
  };
}

describe("字段配置页面加载", () => {
  it("已有完整字典时只读取，不写回", async () => {
    const client = makeClient();
    const result = await loadFieldConfig(client);

    expect(client.getDictionaryItemByCode).toHaveBeenCalledWith({ code: ITEM_CODE });
    expect(client.getDictionaryByItem).toHaveBeenCalledWith({ itemCode: ITEM_CODE });
    expect(result.variable.fields).toHaveLength(ROSTER_CONFIG.variable.fields.length);
    expect(client.createDictionaryItem).not.toHaveBeenCalled();
    expect(client.createDataDictionary).not.toHaveBeenCalled();
    expect(client.updateDataDictionary).not.toHaveBeenCalled();
  });

  it("已有字典缺字段时只补齐缺失字段并保留原设置", async () => {
    const client = makeClient(
      JSON.stringify({ fields: [{ key: "age", fieldName: "年龄", show: false, required: true, alias: "年纪" }], keywords: [] }),
    );
    const result = await loadFieldConfig(client);

    expect(result.variable.fields).toHaveLength(ROSTER_CONFIG.variable.fields.length);
    expect(result.variable.fields[0]).toMatchObject({ key: "age", show: false, required: true, alias: "年纪" });
    expect(client.updateDataDictionary).toHaveBeenCalledTimes(1);
    const payload = client.updateDataDictionary.mock.calls[0]?.[0] as { variable: string };
    expect(JSON.parse(payload.variable).fields[0]).toMatchObject({ key: "age", show: false, required: true, alias: "年纪" });
  });

  it("字典项和 roster 不存在时才创建，并重新查询", async () => {
    const client = makeClient();
    client.getDictionaryItemByCode = mock(async () => null);
    client.getDictionaryByItem = mock(async () => {
      if (client.getDictionaryByItem.mock.calls.length === 1) {
        return [];
      }
      return [
        {
          id: "roster-1",
          itemCode: ITEM_CODE,
          name: ROSTER_CONFIG.name,
          code: ROSTER_CONFIG.code,
          variable: JSON.stringify(ROSTER_CONFIG.variable),
        },
      ];
    });
    const result = await loadFieldConfig(client);

    expect(client.createDictionaryItem).toHaveBeenCalledTimes(1);
    expect(client.createDataDictionary).toHaveBeenCalledTimes(1);
    expect(client.getDictionaryByItem).toHaveBeenCalledTimes(2);
    expect(client.updateDataDictionary).not.toHaveBeenCalled();
    expect(result.variable.fields).toHaveLength(ROSTER_CONFIG.variable.fields.length);
  });
});
