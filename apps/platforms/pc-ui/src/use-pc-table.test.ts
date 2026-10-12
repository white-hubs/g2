import { describe, expect, test } from "bun:test";

import { usePcTable } from "./use-pc-table";

describe("usePcTable", () => {
  test("query calls fetchApi and stores records", async () => {
    let calls = 0;
    const [PcTable, tableApi] = usePcTable({
      autoFetch: false,
      columns: [{ dataIndex: "name", title: "名称" }],
      fetchApi: async () => {
        calls += 1;
        return { total: 1, pages: 1, records: [{ id: 1, name: "门禁A" }] };
      },
    });

    expect(PcTable).toBeDefined();
    expect(calls).toBe(0);

    tableApi.query();
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));

    expect(calls).toBe(1);
    expect(tableApi.getDataSource()).toEqual([{ id: 1, name: "门禁A" }]);
  });

  test("allows multiple columns without dataIndex", () => {
    expect(() =>
      usePcTable({
        autoFetch: false,
        columns: [
          { key: "rank", title: "排名" },
          { dataIndex: "name", title: "名称" },
          { key: "total", title: "合计" },
        ],
      }),
    ).not.toThrow();
  });

  test("defaults to an internally scrollable table and allows an explicit opt-out", () => {
    const [, defaultTable] = usePcTable({ autoFetch: false, columns: [] });
    const [, pageScrollTable] = usePcTable({ autoFetch: false, columns: [], autoScrollY: false });

    expect(defaultTable.state.autoScrollY).toBe(true);
    expect(pageScrollTable.state.autoScrollY).toBe(false);
  });

  test("rejects duplicate dataIndex values", () => {
    expect(() =>
      usePcTable({
        autoFetch: false,
        columns: [
          { dataIndex: "name", title: "名称" },
          { dataIndex: "name", title: "别名" },
        ],
      }),
    ).toThrow("dataIndex must be unique");
  });
});
