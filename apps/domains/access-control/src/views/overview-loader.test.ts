import { describe, expect, test } from "bun:test";

import { loadOverview, loadTrend } from "./overview-loader";

describe("access-control overview loader", () => {
  test("loadOverview fans out passedTodayNum / ranking / events", async () => {
    const calls: string[] = [];
    const client = {
      passedTodayNum: async () => {
        calls.push("passedTodayNum");
        return 12;
      },
      getDoorRanking: async () => {
        calls.push("getDoorRanking");
        return [{ id: "1", doorName: "A", num: 3 }];
      },
      getDoorEvents: async () => {
        calls.push("getDoorEvents");
        return [{ id: "e1", doorName: "A", eventName: "进", eventTime: "2026-01-01T08:00:00Z" }];
      },
    };

    const data = await loadOverview(client);
    expect(calls.toSorted()).toEqual(["getDoorEvents", "getDoorRanking", "passedTodayNum"]);
    expect(data.todayCount).toBe(12);
    expect(data.ranking).toHaveLength(1);
    expect(data.events).toHaveLength(1);
  });

  test("loadTrend calls getDoorTend with timeFlag", async () => {
    const client = {
      getDoorTend: async (params?: unknown) => {
        expect((params as { timeFlag?: string }).timeFlag).toBe("timeMonth");
        return [{ timeValue: "01", num: 5 }];
      },
    };
    const trend = await loadTrend(client, "timeMonth");
    expect(trend).toEqual([{ timeValue: "01", num: 5 }]);
  });
});
