import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { runBoundaryCheck } from "./run-boundary-check";

const dayjsFixtureRoot = join(import.meta.dirname, "../fixtures/domain-imports-dayjs");
const sharedFixtureRoot = join(import.meta.dirname, "../fixtures/imports-g2-shared");
const clientValueFixtureRoot = join(import.meta.dirname, "../fixtures/imports-g2-client-value");

describe("runBoundaryCheck", () => {
  test("domain 直依 dayjs 时失败，并在信息中引导 Platform / ADR", async () => {
    const result = await runBoundaryCheck(["apps/domains/**/*.ts"], { cwd: dayjsFixtureRoot });
    expect(result.ok).toBe(false);
    expect(result.errorCount).toBeGreaterThan(0);
    const blob = result.messages.join("\n");
    expect(blob).toMatch(/dayjs/i);
    expect(blob).toMatch(/@g2-platform|ADR-004|loadPlatform|ADR-0056/);
  });

  test("引用已退役 @g2-shared/* 时失败（enforceSharedRetirement 默认开启）", async () => {
    const result = await runBoundaryCheck(["apps/shells/**/*.ts"], { cwd: sharedFixtureRoot });
    expect(result.ok).toBe(false);
    const blob = result.messages.join("\n");
    expect(blob).toMatch(/no-g2-shared-runtime/);
    expect(blob).toMatch(/@g2-shared|loadPlatform|ADR-0056/);
  });

  test("Platform/Shell/Domain value-import @g2-client/* 时失败（须 ensureClient + @g2-contract 类型）", async () => {
    const result = await runBoundaryCheck(["apps/platforms/**/*.ts"], { cwd: clientValueFixtureRoot });
    expect(result.ok).toBe(false);
    const blob = result.messages.join("\n");
    expect(blob).toMatch(/no-g2-client-value-import/);
    expect(blob).toMatch(/@g2-client|ensureClient|ADR-0057/);
  });
});
