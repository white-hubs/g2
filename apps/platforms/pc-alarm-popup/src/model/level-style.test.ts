import { describe, expect, test } from "bun:test";

import { getAlarmLevelClass, getAlarmLevelImage } from "./level-style";

describe("level class mapping", () => {
  test("maps 一级/二级/三级 and defaults to blue", () => {
    expect(getAlarmLevelClass("一级")).toBe("red");
    expect(getAlarmLevelClass("二级")).toBe("yellow");
    expect(getAlarmLevelClass("三级")).toBe("orange");
    expect(getAlarmLevelClass("四级")).toBe("blue");
    expect(getAlarmLevelImage("一级")).toContain("hong.png");
  });
});
