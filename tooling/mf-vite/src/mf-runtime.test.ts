import { afterEach, describe, expect, test } from "bun:test";

import {
  MF_RUNTIME_BASE_ENV,
  MF_RUNTIME_MODE_ENV,
  MF_RUNTIME_SLIM_ENV,
  isMfRuntimeModuleId,
  mfRuntimeObjectKey,
  mfRuntimePublicUrl,
  readMfRuntimeNpmVersion,
  resolveMfRuntimeBaseUrl,
  resolveMfRuntimeMode,
  stripTrailingSlash,
} from "./mf-runtime.ts";

describe("mf-runtime paths", () => {
  test("object key uses npm version", () => {
    const version = readMfRuntimeNpmVersion();
    expect(mfRuntimeObjectKey(version)).toBe(`_mf/runtime/${version}/mf-runtime.js`);
  });

  test("public url joins base without double slash", () => {
    expect(mfRuntimePublicUrl("http://localhost:8081/", "2.8.0")).toBe("http://localhost:8081/_mf/runtime/2.8.0/mf-runtime.js");
  });

  test("stripTrailingSlash", () => {
    expect(stripTrailingSlash("http://x/")).toBe("http://x");
  });
});

describe("resolveMfRuntimeMode", () => {
  afterEach(() => {
    delete process.env[MF_RUNTIME_MODE_ENV];
    delete process.env[MF_RUNTIME_SLIM_ENV];
  });

  test("explicit wins", () => {
    process.env[MF_RUNTIME_MODE_ENV] = "bundled";
    expect(resolveMfRuntimeMode("external")).toBe("external");
  });

  test("MODE env", () => {
    process.env[MF_RUNTIME_MODE_ENV] = "bundled";
    expect(resolveMfRuntimeMode()).toBe("bundled");
  });

  test("SLIM=0 → bundled", () => {
    process.env[MF_RUNTIME_SLIM_ENV] = "0";
    expect(resolveMfRuntimeMode()).toBe("bundled");
  });

  test("default external", () => {
    expect(resolveMfRuntimeMode()).toBe("external");
  });
});

describe("resolveMfRuntimeBaseUrl", () => {
  afterEach(() => {
    delete process.env[MF_RUNTIME_BASE_ENV];
  });

  test("env and explicit", () => {
    process.env[MF_RUNTIME_BASE_ENV] = "http://localhost:8081/";
    expect(resolveMfRuntimeBaseUrl()).toBe("http://localhost:8081");
    expect(resolveMfRuntimeBaseUrl("http://localhost:5100")).toBe("http://localhost:5100");
  });
});

describe("isMfRuntimeModuleId", () => {
  test("matches package and path, skips helpers", () => {
    expect(isMfRuntimeModuleId("@module-federation/runtime")).toBe(true);
    expect(isMfRuntimeModuleId("/x/node_modules/@module-federation/runtime/dist/index.js")).toBe(true);
    expect(isMfRuntimeModuleId("@module-federation/runtime/helpers")).toBe(false);
  });
});
