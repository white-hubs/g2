import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createLocalDevState,
  lanHostnameFromHostHeader,
  overlayLocalRemotes,
  resolveLocalDevSources,
  rewriteLoopbackUrlForLan,
  rewriteProfileEntriesForLan,
  selectRegisteredApplicationRemotes,
  type LocalRemoteRegistration,
} from "./dev-server";

test("LAN 访问时把 localhost Remote 改写成访问主机名", () => {
  expect(lanHostnameFromHostHeader("192.168.4.153:5100")).toBe("192.168.4.153");
  expect(lanHostnameFromHostHeader("localhost:5100")).toBeUndefined();
  expect(rewriteLoopbackUrlForLan("http://localhost:5117/mf-manifest.json", "192.168.4.153")).toBe(
    "http://192.168.4.153:5117/mf-manifest.json",
  );
  expect(rewriteLoopbackUrlForLan("http://127.0.0.1:5016/mf-manifest.json", "192.168.4.153")).toBe(
    "http://192.168.4.153:5016/mf-manifest.json",
  );
  expect(rewriteLoopbackUrlForLan("https://cube-dev.guhecloud.com:3000/x", "192.168.4.153")).toBe("https://cube-dev.guhecloud.com:3000/x");
});

test("LAN Profile 只改写已注册 Remote，不改写未启动的 Platform/Client 占位", () => {
  const profile = {
    platform: [{ name: "pcAuth", entry: "http://localhost:5010/mf-manifest.json" }],
    client: [{ name: "authClient", entry: "http://localhost:5021/mf-manifest.json" }],
    remotes: [{ name: "renovation", entry: "http://localhost:5117/mf-manifest.json" }],
  };
  const result = rewriteProfileEntriesForLan(profile, "192.168.4.153", new Set(["renovation"]));
  expect(result.platform?.[0]?.entry).toBe("http://localhost:5010/mf-manifest.json");
  expect(result.client?.[0]?.entry).toBe("http://localhost:5021/mf-manifest.json");
  expect(result.remotes?.[0]?.entry).toBe("http://192.168.4.153:5117/mf-manifest.json");
});

test("local entries override only matching logicalName entries", () => {
  const source = {
    env: "uat",
    remotes: [
      { name: "accessControl", logicalName: "accessControl", entry: "https://env/access/mf-manifest.json", basePath: "/d/access" },
      { name: "dailyTask", logicalName: "dailyTask", entry: "https://env/task/mf-manifest.json" },
    ],
    platform: [{ name: "pcUi", entry: "https://env/ui/mf-manifest.json" }],
  };
  const local: LocalRemoteRegistration = {
    logicalName: "accessControl",
    packageName: "@g2-domain/access-control",
    manifestUrl: "http://localhost:5050/mf-manifest.json",
    instanceId: "one",
    pid: 1,
    lastSeenAt: Date.now(),
  };
  const result = overlayLocalRemotes(source, [local]);
  expect(result.remotes?.[0]).toEqual({ ...source.remotes[0], entry: local.manifestUrl });
  expect(result.remotes?.[1]).toEqual(source.remotes[1]);
  expect(result.platform).toEqual(source.platform);
  expect(source.remotes[0]?.entry).toContain("https://env/");
});

test("legacy compatibility keeps the complete Platform and Client inventory but only registered MF Domains", () => {
  const source = {
    remotes: [
      { name: "accessControl", entry: "https://env/access/mf-manifest.json" },
      { name: "hazardGovernance", entry: "https://env/hazard/mf-manifest.json" },
    ],
    pageLibrary: [{ name: "pages", entry: "https://env/pages/mf-manifest.json" }],
    platform: [{ name: "pcUi", entry: "http://localhost:5016/mf-manifest.json" }],
    client: [{ name: "hazardGovernanceClient", entry: "http://localhost:5033/mf-manifest.json" }],
  };
  const local: LocalRemoteRegistration = {
    logicalName: "hazardGovernance",
    packageName: "@g2-domain/hazard-governance",
    manifestUrl: "http://localhost:5070/mf-manifest.json",
    instanceId: "one",
    pid: 1,
    lastSeenAt: Date.now(),
  };
  const result = selectRegisteredApplicationRemotes(source, [local]);
  expect(result.remotes).toEqual([{ name: "hazardGovernance", entry: local.manifestUrl }]);
  expect(result.pageLibrary).toEqual([]);
  expect(result.platform).toEqual(source.platform);
  expect(result.client).toEqual(source.client);
});

test("g2 profile retains environment remotes while overlaying only the matching local entry", () => {
  const source = {
    remotes: [
      { name: "accessControl", entry: "https://env/access/mf-manifest.json" },
      { name: "hazardGovernance", entry: "https://env/hazard/mf-manifest.json" },
    ],
    platform: [],
  };
  const local: LocalRemoteRegistration = {
    logicalName: "hazardGovernance",
    packageName: "@g2-domain/hazard-governance",
    manifestUrl: "http://localhost:5070/mf-manifest.json",
    instanceId: "one",
    pid: 1,
    lastSeenAt: Date.now(),
  };
  expect(overlayLocalRemotes(source, [local]).remotes).toEqual([source.remotes[0], { ...source.remotes[1], entry: local.manifestUrl }]);
});

test("仅启动安全教育 Domain 时保留其页面库声明，其他未启动库不激活", () => {
  const library = { name: "secureEduPages", entry: "http://localhost:5142/mf-manifest.json" };
  const source = {
    platform: [],
    remotes: [{ name: "secureEdu", basePath: "/d/secure-edu" }],
    pageLibrary: [library, { name: "otherPages" }],
  };
  const local: LocalRemoteRegistration = {
    logicalName: "secureEdu",
    packageName: "@g2-domain/secure-edu-market",
    manifestUrl: "http://localhost:5141/mf-manifest.json",
    instanceId: "edu",
    pid: 1,
    lastSeenAt: Date.now(),
  };
  expect(selectRegisteredApplicationRemotes(source, [local]).pageLibrary).toEqual([library]);
  expect(selectRegisteredApplicationRemotes(source, []).pageLibrary).toEqual([]);
});

test("source status reflects legacy workspace fallback and local Remote priority", () => {
  const source = {
    remotes: [{ name: "hazardGovernance", entry: "http://localhost:5070/mf-manifest.json" }],
    platform: [{ name: "pcUi", entry: "http://localhost:5016/mf-manifest.json" }],
    client: [{ name: "hazardGovernanceClient", entry: "http://localhost:5033/mf-manifest.json" }],
  };
  const local: LocalRemoteRegistration = {
    logicalName: "hazardGovernance",
    packageName: "@g2-domain/hazard-governance",
    manifestUrl: "http://localhost:5070/mf-manifest.json",
    instanceId: "one",
    pid: 1,
    lastSeenAt: Date.now(),
  };
  expect(resolveLocalDevSources(source, [local], "legacy-compat")).toEqual([
    { logicalName: "pcUi", kind: "platform", source: "workspace", entry: source.platform[0]!.entry },
    { logicalName: "hazardGovernanceClient", kind: "client", source: "workspace", entry: source.client[0]!.entry },
    { logicalName: "hazardGovernance", kind: "remotes", source: "local-remote", entry: source.remotes[0]!.entry },
  ]);
});

test("rejects a target profile that is not a resolved profile", async () => {
  const directory = await mkdtemp(join(tmpdir(), "g2-dev-profile-"));
  const profilePath = join(directory, "invalid.json");
  await writeFile(profilePath, JSON.stringify({ platform: "invalid", remotes: [] }));
  try {
    const state = createLocalDevState({
      profileUrl: profilePath,
      environmentName: "test",
      apiTarget: "https://example.test",
      mode: "g2-profile",
    });
    await expect(state.fetchProfile()).rejects.toThrow('field "platform" must be an array');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("reloads a changed local resolved Profile instead of retaining the boot snapshot", async () => {
  const directory = await mkdtemp(join(tmpdir(), "g2-dev-profile-"));
  const profilePath = join(directory, "resolved.json");
  const profile = (name: string) => JSON.stringify({ platform: [], remotes: [{ name, entry: `http://localhost/${name}` }] });
  await writeFile(profilePath, profile("accessControl"));
  try {
    const state = createLocalDevState({
      profileUrl: profilePath,
      environmentName: "test",
      apiTarget: "https://example.test",
      mode: "legacy-compat",
    });
    expect((await state.fetchProfile()).remotes?.map((remote) => remote.name)).toEqual(["accessControl"]);

    await Bun.sleep(20);
    await writeFile(profilePath, profile("intruderAlarm"));

    expect((await state.fetchProfile()).remotes?.map((remote) => remote.name)).toEqual(["intruderAlarm"]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
