import { describe, expect, test } from "bun:test";

import { RuntimeCommonLoadError, createRuntimeCommonLoader, loadRuntimeCommon, setRuntimeCommonLoader } from "./index";

describe("runtime common loader", () => {
  test("exposes the Shell loader to separately loaded page libraries", async () => {
    const loader = createRuntimeCommonLoader(async (name, exposed) => ({ name, exposed }));
    setRuntimeCommonLoader(loader.load);
    await expect(loadRuntimeCommon("pcChart", "index")).resolves.toEqual({ name: "pcChart", exposed: "index" });
  });

  test("preloads and records the version actually loaded", async () => {
    const loader = createRuntimeCommonLoader(async (_name, exposed) => {
      if (exposed === "info") return { runtimeVersion: "2026.09.22.1", apiVersion: "1.2.0" };
      return { button: true };
    });
    await loader.preload([{ name: "pcUi", apiVersion: "1.x" }]);
    expect(loader.diagnostics()).toEqual([{ name: "pcUi", state: "ready", runtimeVersion: "2026.09.22.1", apiVersion: "1.2.0" }]);
  });

  test("rejects an incompatible common API before a domain can load", async () => {
    const loader = createRuntimeCommonLoader(async () => ({ runtimeVersion: "2026.09.22.1", apiVersion: "2.0.0" }));
    await expect(loader.preload([{ name: "pcUi", apiVersion: "1.x" }])).rejects.toBeInstanceOf(RuntimeCommonLoadError);
    expect(loader.diagnostics()[0]?.state).toBe("failed");
  });
});
