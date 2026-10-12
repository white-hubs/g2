import { expect, test } from "bun:test";

import { fileSceneForBusiness } from "./file-scene";

test("附件场景沿用旧流引擎的业务映射", () => {
  expect(fileSceneForBusiness("FAULT")).toBe("FAULT::FLOW");
  expect(fileSceneForBusiness("HIDDENDANGER")).toBe("HIDDENDANGER::FLOW");
  expect(fileSceneForBusiness("LEAVE")).toBe("ATTENDANCE_MANAGEMENT::CLOCK_IN");
  expect(fileSceneForBusiness("UNKNOWN")).toBe("APPROVAL_CENTER");
});
