import { describe, expect, test } from "bun:test";

import { applyAliasTableColumn, clearAliasColumnConfig, loadAliasColumnConfig, saveAliasColumnConfig } from "./alias-table-storage";

describe("alias-table-storage", () => {
  test("applies sort and filter from saved config", () => {
    const tableCode = "TEST_ALIAS_TABLE";
    clearAliasColumnConfig(tableCode);
    saveAliasColumnConfig(tableCode, [
      { code: "b", sort: 0, visible: true },
      { code: "a", sort: 1, visible: false },
      { code: "c", sort: 2, visible: true },
    ]);

    const columns = applyAliasTableColumn({
      tableCode,
      columns: [
        { code: "a", title: "A" },
        { code: "b", title: "B" },
        { code: "c", title: "C" },
      ],
    });

    expect(columns.map((item) => item.code)).toEqual(["b", "c"]);
    expect(loadAliasColumnConfig(tableCode)).toHaveLength(3);
    clearAliasColumnConfig(tableCode);
  });
});
