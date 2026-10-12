import type { DataDictionary } from "@g2-contract/dictionary";
import { describe, expect, test } from "bun:test";

import { mapRecords, readMapValues, readProviderConfig, saveConfiguration } from "./config";

const row = (code: string, variable: string): DataDictionary => ({
  id: `id-${code}`,
  code,
  itemCode: "COMMAND_DISPATCH_MAP_CONFIG",
  name: code,
  variable,
  version: "7",
  flag: false,
});

describe("dispatch map configuration", () => {
  test("partial dictionaries retain valid coordinates and default missing or malformed values", () => {
    expect(readMapValues([row("lnglat", "120.2,30.4"), row("zoom", ""), row("radius", "-20")])).toEqual({
      center: { lng: 120.2, lat: 30.4 },
      rotation: 0,
      zoom: 14,
      radius: 0,
    });
    expect(readMapValues([row("lnglat", "NaN,91"), row("rotation", "Infinity"), row("zoom", "99")])).toEqual({
      center: { lng: 116.397428, lat: 39.90923 },
      rotation: 0,
      zoom: 18,
      radius: 0,
    });
  });

  test("saving map values preserves record metadata and excludes background and unrelated dictionary keys", () => {
    const records = mapRecords([row("zoom", "12"), row("background", "/files/bg.png"), row("other", "untouched")], {
      center: { lng: 121, lat: 31 },
      rotation: 45.5,
      zoom: 15.5,
      radius: 250,
    });
    expect(records.map((value) => [value.code, value.variable])).toEqual([
      ["lnglat", "121,31"],
      ["rotation", "45.5"],
      ["zoom", "15.5"],
      ["radius", "250"],
    ]);
    expect(records[2]).toMatchObject({ id: "id-zoom", version: "7", flag: false });
    expect(records[0]).toMatchObject({ id: "", version: "0", itemCode: "COMMAND_DISPATCH_MAP_CONFIG" });
  });

  test("provider dictionary supports legacy TianDiTu precedence and rejects malformed JSON", () => {
    expect(readProviderConfig([row("gdMap", '{"webKey":"gd-key","securityJsCode":"security"}')])).toEqual({
      mapType: "gdMap",
      webKey: "gd-key",
      securityJsCode: "security",
    });
    expect(readProviderConfig([row("gdMap", '{"webKey":"gd-key"}'), row("TD_MAP", '{"webKey":"td-key"}')])).toEqual({
      mapType: "TD_MAP",
      webKey: "td-key",
    });
    expect(readProviderConfig([row("t-map", '{"webKey":"td-key"}')])).toEqual({ mapType: "t-map", webKey: "td-key" });
    expect(() => readProviderConfig([row("gdMap", "{bad")])).toThrow();
  });

  test("a partial save updates successful record IDs before a later error so retries do not duplicate rows", async () => {
    const records = mapRecords([], readMapValues([]));
    const created: string[] = [];
    const updated: string[] = [];
    let rejectRotation = true;
    const client = {
      getDictionaryItemByCode: async () => ({ id: "item", code: "COMMAND_DISPATCH_MAP_CONFIG" }),
      createDictionaryItem: async () => ({ id: "item", code: "COMMAND_DISPATCH_MAP_CONFIG" }),
      createDataDictionary: async (record: DataDictionary) => {
        if (record.code === "rotation" && rejectRotation) throw new Error("Save failed");
        created.push(record.code);
        return { ...record, id: `saved-${record.code}`, version: "1" };
      },
      updateDataDictionary: async (record: DataDictionary) => {
        updated.push(record.code);
        return { ...record, version: "2" };
      },
    };
    await expect(saveConfiguration(client, records, "地图配置")).rejects.toThrow("Save failed");
    expect(records[0]?.id).toBe("saved-lnglat");
    rejectRotation = false;
    await saveConfiguration(client, records, "地图配置");
    expect(created).toEqual(["lnglat", "rotation", "zoom", "radius"]);
    expect(updated).toEqual(["lnglat"]);
  });
});
