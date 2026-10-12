import { describe, expect, it } from "bun:test";

import { ROSTER_CONFIG, rosterFieldVariable } from "./fields";

describe("员工字段字典迁移", () => {
  it("保留服务端顺序与设置，并补齐新增字段", () => {
    const result = rosterFieldVariable(
      JSON.stringify({
        fields: [
          { key: "age", fieldName: "年龄", show: false, required: true, alias: "年纪" },
          { key: "dateOfBirth", fieldName: "出生日期", show: true, required: false, alias: "生日" },
        ],
        keywords: [{ key: "staff", fieldName: "员工", alias: "同事" }],
      }),
    );

    expect(result.fields).toHaveLength(ROSTER_CONFIG.variable.fields.length);
    expect(result.fields[0]).toMatchObject({ key: "age", show: false, required: true, alias: "年纪" });
    expect(result.fields[1]).toMatchObject({ key: "dateOfBirth", required: false, alias: "生日" });
    expect(result.fields.some((field) => field.key === "workingYears")).toBe(true);
    expect(result.keywords).toEqual([{ key: "staff", fieldName: "员工", alias: "同事" }]);
  });

  it("拒绝损坏的已保存配置，避免覆盖原始数据", () => {
    expect(() => rosterFieldVariable("{invalid-json")).toThrow("员工字段配置数据格式错误");
  });
});
