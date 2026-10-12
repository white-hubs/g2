import { expect, test } from "bun:test";

import { formatProcessTime, processOperationName } from "./process-progress";

test("历史操作展示旧版中文状态和完整时间", () => {
  expect(processOperationName("SUBMIT")).toBe("提交");
  expect(processOperationName("PASS")).toBe("审批通过");
  expect(processOperationName("REJECT")).toBe("拒绝");
  expect(formatProcessTime(1788940888865)).toMatch(/^2026-09-\d\d \d\d:\d\d:\d\d$/);
  expect(formatProcessTime("1788940888865")).toMatch(/^2026-09-\d\d \d\d:\d\d:\d\d$/);
  expect(formatProcessTime(null)).toBe("--");
});
