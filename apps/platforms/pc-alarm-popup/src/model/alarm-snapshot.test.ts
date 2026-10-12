import { describe, expect, test } from "bun:test";

import {
  buildAlarmSnapshotDetails,
  extractProductPropVoList,
  filterChartSnapshotDetails,
  parseMatchSnapshot,
  extractConfigAlarmValue,
} from "./alarm-snapshot";

describe("alarm snapshot", () => {
  test("parseMatchSnapshot returns matchSnapshot array from JSON string", () => {
    const raw = JSON.stringify({
      matchSnapshot: [{ propCode: "ua", propValue: "220", condition: "value[220]", propValueTs: "2024-01-01" }],
    });
    expect(parseMatchSnapshot(raw)).toEqual([{ propCode: "ua", propValue: "220", condition: "value[220]", propValueTs: "2024-01-01" }]);
  });

  test("parseMatchSnapshot returns empty when missing", () => {
    expect(parseMatchSnapshot(undefined)).toEqual([]);
    expect(parseMatchSnapshot(JSON.stringify({}))).toEqual([]);
  });

  test("extractConfigAlarmValue parses bracket value", () => {
    expect(extractConfigAlarmValue("threshold[100]")).toBe("100");
    expect(extractConfigAlarmValue("range[10][20]")).toBe("20");
  });

  test("buildAlarmSnapshotDetails maps enum and numeric constraints", () => {
    const matchSnapshot = [
      { propCode: "ua", propValue: "220", condition: "gt[200]", propValueTs: "ts1" },
      { propCode: "work_mode", propValue: "1", condition: "eq[1]", propValueTs: "ts2" },
    ];
    const productPropVoList = [
      {
        propCode: "ua",
        propName: "A相电压",
        dataType: "float",
        dataConstraint: [{ value: "0" }, { value: "400" }],
        unitName: "V",
      },
      {
        propCode: "work_mode",
        propName: "UPS状态",
        dataType: "enum",
        dataConstraint: [{ value: "1", label: "在线" }],
      },
    ];
    const details = buildAlarmSnapshotDetails(matchSnapshot, productPropVoList);
    expect(details).toHaveLength(2);
    expect(details[0]).toMatchObject({
      propCode: "ua",
      propName: "A相电压",
      propValue: "220",
      configAlarmValue: "200",
      minValue: 0,
      maxValue: 400,
      unit: "V",
    });
    expect(details[1]).toMatchObject({
      propCode: "work_mode",
      propValue: "在线",
      configAlarmValue: "1",
    });
  });

  test("extractProductPropVoList unwraps legacy envelope data", () => {
    const list = extractProductPropVoList({
      code: 200,
      data: { productPropVoList: [{ propCode: "temp", propName: "温度" }] },
    });
    expect(list).toEqual([{ propCode: "temp", propName: "温度" }]);
  });

  test("filterChartSnapshotDetails keeps intersection with chart keys", () => {
    const details = [
      { propCode: "ua", propName: "A", propValue: "1", configAlarmValue: "", minValue: 0, maxValue: 100, unit: "V" },
      { propCode: "unknown", propName: "X", propValue: "1", configAlarmValue: "", minValue: 0, maxValue: 0, unit: "" },
    ];
    const filtered = filterChartSnapshotDetails(details, new Set(["ua", "ub"]));
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.propCode).toBe("ua");
  });
});
