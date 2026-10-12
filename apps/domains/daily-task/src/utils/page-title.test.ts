import { expect, test } from "bun:test";

import { resolvePageTitle } from "./page-title";

test("daily-task page title is passed to PageLayout as a string", () => {
  expect(resolvePageTitle({ title: "任务计划" })).toBe("任务计划");
  expect(resolvePageTitle({})).toBe("日常任务");
});
