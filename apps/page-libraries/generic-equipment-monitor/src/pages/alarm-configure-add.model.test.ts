import { describe, expect, test } from "bun:test";

import { alarmConfigEditorTitle, resolveAlarmConfigEditorMode } from "./alarm-configure-add.model";

describe("resolveAlarmConfigEditorMode", () => {
  test("maps host props type/copy/ruleId without reading applicationCode from URL", () => {
    expect(resolveAlarmConfigEditorMode({ mode: "add" })).toBe("add");
    expect(resolveAlarmConfigEditorMode({ mode: "detail", ruleId: "1" })).toBe("detail");
    expect(resolveAlarmConfigEditorMode({ mode: "edit", ruleId: "1" })).toBe("edit");
    expect(resolveAlarmConfigEditorMode({ mode: "edit", ruleId: "1", copy: "1" })).toBe("copy");
    expect(resolveAlarmConfigEditorMode({ ruleId: "" })).toBe("add");
  });
});

describe("alarmConfigEditorTitle", () => {
  test("matches iot-center title suffixes", () => {
    expect(alarmConfigEditorTitle("add")).toBe("报警规则-新增");
    expect(alarmConfigEditorTitle("detail")).toBe("报警规则-详情");
  });
});
