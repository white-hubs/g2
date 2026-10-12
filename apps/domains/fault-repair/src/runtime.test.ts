import { expect, test } from "bun:test";

import { resolveFaultMaintainRuntime } from "./runtime";

test("FAULT 与 COMPLAINT 运行时文案与路径", () => {
  const fault = resolveFaultMaintainRuntime({ applicationCode: "FAULT" });
  expect(fault.basePath).toBe("/d/fault-repair");
  expect(fault.labels.listTitle).toBe("故障单");
  expect(fault.labels.objectColumn).toBe("故障对象");

  const complaint = resolveFaultMaintainRuntime({ applicationCode: "COMPLAINT", basePath: "/d/complaint" });
  expect(complaint.basePath).toBe("/d/complaint");
  expect(complaint.labels.listTitle).toBe("投诉建议");
  expect(complaint.labels.objectColumn).toBe("投诉内容");
  expect(complaint.labels.typeTitle).toBe("类型配置");
});
