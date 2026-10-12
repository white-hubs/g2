import { describe, expect, test } from "bun:test";

import {
  applyRemoteDevOptimizeDeps,
  excludeWorkspaceSharedFromOptimizeDeps,
  isMfDtsErrorMessage,
  mergeRemoteDevHmr,
  mergeStrictDts,
  workspaceSharedDependencies,
} from "./index";
import { createUnchangedHmrTracker } from "./skip-unchanged-hmr";
import { syncVueJsxHmrRecordIds } from "./vue-jsx-hmr-id-sync";

test("workspace shared packages are excluded from Vite dependency prebundling", () => {
  expect(workspaceSharedDependencies({ vue: { singleton: true }, "@g2-platform/pc-ui": { singleton: true } })).toEqual([
    "@g2-platform/pc-ui",
  ]);
});

test("remote optimizer uses pc-ui's dayjs when the domain does not declare dayjs", () => {
  const optimizeDeps: { include?: string[]; exclude?: string[]; holdUntilCrawlEnd?: boolean } = {
    include: ["leaflet"],
    exclude: ["leaflet.markercluster"],
  };
  applyRemoteDevOptimizeDeps(optimizeDeps, { "@g2-platform/pc-ui": "workspace:*" });
  expect(optimizeDeps.include).toContain("@g2-platform/pc-ui > dayjs/plugin/advancedFormat");
  expect(optimizeDeps.exclude).toEqual(["leaflet.markercluster", "@ant-design/icons-vue", "ant-design-vue"]);
  expect(optimizeDeps.holdUntilCrawlEnd).toBe(false);
});

test("remote optimizer preserves explicit settings and resolves direct dayjs", () => {
  const optimizeDeps = { include: ["dayjs"], exclude: ["ant-design-vue"], holdUntilCrawlEnd: true };
  applyRemoteDevOptimizeDeps(optimizeDeps, { dayjs: "1.11.13", "ant-design-vue": "4.2.6" });
  expect(optimizeDeps.include).toContain("dayjs/plugin/advancedFormat");
  expect(optimizeDeps.include?.filter((dependency) => dependency === "dayjs")).toHaveLength(1);
  expect(optimizeDeps.holdUntilCrawlEnd).toBe(true);
});

test("workspace shared packages added by the MF plugin are removed from final optimizer inputs", () => {
  const optimizeDeps = {
    include: ["vue", "@g2-platform/pc-ui", "@g2-platform/pc-ui/button"],
    exclude: ["ant-design-vue"],
    entries: ["**/*.html", "/repo/apps/platforms/pc-ui/src/index.ts", "/repo/apps/domains/example/src/domain.ts"],
  };

  excludeWorkspaceSharedFromOptimizeDeps(optimizeDeps, ["@g2-platform/pc-ui"], ["/repo/apps/platforms/pc-ui/src/index.ts"]);

  expect(optimizeDeps).toEqual({
    include: ["vue"],
    exclude: ["ant-design-vue", "@g2-platform/pc-ui"],
    entries: ["**/*.html", "/repo/apps/domains/example/src/domain.ts"],
  });
});

describe("mergeStrictDts", () => {
  test("dts: false stays false", () => {
    expect(mergeStrictDts(false)).toBe(false);
  });

  test("defaults abortOnError, tsc, and child-process compile", () => {
    expect(mergeStrictDts(undefined)).toEqual({
      generateTypes: {
        compilerInstance: "tsc",
        compileInChildProcess: true,
        abortOnError: true,
      },
    });
  });

  test("preserves generateTypes: false", () => {
    expect(mergeStrictDts({ generateTypes: false })).toEqual({ generateTypes: false });
  });

  test("caller overrides lose to forced abortOnError; child process stays default unless set", () => {
    expect(
      mergeStrictDts({
        generateTypes: {
          abortOnError: false,
          compileInChildProcess: false,
          compilerInstance: "vue-tsc",
          typesFolder: "x",
        },
      }),
    ).toEqual({
      generateTypes: {
        compilerInstance: "vue-tsc",
        typesFolder: "x",
        compileInChildProcess: false,
        abortOnError: true,
      },
    });
  });
});

describe("isMfDtsErrorMessage", () => {
  test("matches TYPE-001 Error", () => {
    expect(isMfDtsErrorMessage(new Error("Failed to generate type declaration. #TYPE-001"))).toBe(true);
  });

  test("ignores unrelated", () => {
    expect(isMfDtsErrorMessage(new Error("rollup failed"))).toBe(false);
  });
});

describe("syncVueJsxHmrRecordIds", () => {
  test("aligns createRecord/reload ids with prefixed __hmrId", () => {
    const input = `
HazardWorkbench.__hmrId = "hazardGovernance-0c900b66"
__VUE_HMR_RUNTIME__.createRecord("0c900b66", HazardWorkbench)
import.meta.hot.accept(({HazardWorkbench: __HazardWorkbench}) => {
__VUE_HMR_RUNTIME__.reload("0c900b66", __HazardWorkbench)
})
`;
    const out = syncVueJsxHmrRecordIds(input);
    expect(out).toContain('createRecord("hazardGovernance-0c900b66", HazardWorkbench)');
    expect(out).toContain('reload("hazardGovernance-0c900b66", __HazardWorkbench)');
    expect(out).not.toContain('createRecord("0c900b66"');
    expect(out).not.toContain('reload("0c900b66"');
  });

  test("no-ops when ids already match", () => {
    const input = `
Comp.__hmrId = "hazardGovernance-abc"
__VUE_HMR_RUNTIME__.createRecord("hazardGovernance-abc", Comp)
__VUE_HMR_RUNTIME__.reload("hazardGovernance-abc", Comp)
`;
    expect(syncVueJsxHmrRecordIds(input)).toBeUndefined();
  });
});

describe("createUnchangedHmrTracker", () => {
  test("skips when content is unchanged after seed", async () => {
    const tracker = createUnchangedHmrTracker();
    tracker.lastContent.set("/tmp/a.tsx", "const x = 1");
    expect(await tracker.decide("/tmp/a.tsx", "const x = 1")).toBe("skip");
    expect(await tracker.decide("/tmp/a.tsx", "const x = 2")).toBe("update");
    expect(await tracker.decide("/tmp/a.tsx", "const x = 2")).toBe("skip");
  });
});

describe("mergeRemoteDevHmr", () => {
  test("defaults remoteHmr true for remotes", () => {
    expect(mergeRemoteDevHmr(true, undefined)).toEqual({ remoteHmr: true });
    expect(mergeRemoteDevHmr(true, { disableDynamicRemoteTypeHints: true })).toEqual({
      disableDynamicRemoteTypeHints: true,
      remoteHmr: true,
    });
  });

  test("respects explicit remoteHmr on remotes", () => {
    expect(mergeRemoteDevHmr(true, { remoteHmr: false })).toEqual({ remoteHmr: false });
    expect(mergeRemoteDevHmr(true, { remoteHmr: "full-reload" })).toEqual({ remoteHmr: "full-reload" });
  });

  test("leaves host/dev untouched when not a remote", () => {
    expect(mergeRemoteDevHmr(false, undefined)).toBeUndefined();
    expect(mergeRemoteDevHmr(false, { remoteHmr: true })).toEqual({ remoteHmr: true });
  });
});
