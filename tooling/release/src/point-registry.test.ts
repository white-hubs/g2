import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

import { loadRegistryValue, pointRegistry } from "./point-registry";

describe("pointRegistry", () => {
  test("updates given keys and preserves others in temp file", () => {
    const dir = mkdtempSync(join(tmpdir(), "g2-point-registry-"));
    const registryPath = join(dir, "registry.yaml");
    writeFileSync(
      registryPath,
      `webReleaseBase: "http://localhost:8081"
pcShell: "pcShell/old/index.html"
pcAuth: "pcAuth/old/mf-manifest.json"
backendApi: ""
`,
      "utf8",
    );

    const applied = pointRegistry(registryPath, {
      pcAuth: "pcAuth/20260722.abc/mf-manifest.json",
      pcShell: "pcShell/20260722.abc/index.html",
    });

    expect(applied).toEqual({
      pcAuth: "pcAuth/20260722.abc/mf-manifest.json",
      pcShell: "pcShell/20260722.abc/index.html",
    });

    const doc = parseYaml(readFileSync(registryPath, "utf8")) as Record<string, string>;
    expect(doc.webReleaseBase).toBe("http://localhost:8081");
    expect(doc.backendApi).toBe("");
    expect(doc.pcAuth).toBe("pcAuth/20260722.abc/mf-manifest.json");
    expect(doc.pcShell).toBe("pcShell/20260722.abc/index.html");

    rmSync(dir, { recursive: true, force: true });
  });

  test("dry-run does not write file", () => {
    const dir = mkdtempSync(join(tmpdir(), "g2-point-registry-"));
    const registryPath = join(dir, "registry.yaml");
    const original = "pcAuth: old\n";
    writeFileSync(registryPath, original, "utf8");

    pointRegistry(registryPath, { pcAuth: "pcAuth/new/mf-manifest.json" }, { dryRun: true });
    expect(readFileSync(registryPath, "utf8")).toBe(original);

    rmSync(dir, { recursive: true, force: true });
  });

  test("loadRegistryValue reads key from yaml", () => {
    const dir = mkdtempSync(join(tmpdir(), "g2-point-registry-"));
    const registryPath = join(dir, "registry.yaml");
    writeFileSync(registryPath, `pcShell: "pcShell/ver/index.html"\nbackendApi: ""\n`, "utf8");

    expect(loadRegistryValue(registryPath, "pcShell")).toBe("pcShell/ver/index.html");
    expect(loadRegistryValue(registryPath, "backendApi")).toBeUndefined();

    rmSync(dir, { recursive: true, force: true });
  });
});
