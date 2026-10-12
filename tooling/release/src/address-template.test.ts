import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { bindAddressEnv, loadAddressTemplateKeys } from "./address-template";

describe("address-template", () => {
  test("loads empty-value map keys", () => {
    const dir = mkdtempSync(join(tmpdir(), "g2-addr-"));
    const path = join(dir, "t.yaml");
    writeFileSync(path, "webReleaseBase:\nbackendApi:\n", "utf8");
    expect(loadAddressTemplateKeys(path)).toEqual(["webReleaseBase", "backendApi"]);
  });

  test("rejects non-empty template values", () => {
    const dir = mkdtempSync(join(tmpdir(), "g2-addr-"));
    const path = join(dir, "t.yaml");
    writeFileSync(path, "webReleaseBase: http://evil.example\n", "utf8");
    expect(() => loadAddressTemplateKeys(path)).toThrow(/non-empty/);
  });

  test("bindAddressEnv requires set vars; allows empty string", () => {
    expect(() => bindAddressEnv(["webReleaseBase"], {})).toThrow(/missing/);
    expect(bindAddressEnv(["webReleaseBase", "backendApi"], { webReleaseBase: "http://localhost:8081", backendApi: "" })).toEqual({
      webReleaseBase: "http://localhost:8081",
      backendApi: "",
    });
  });
});
