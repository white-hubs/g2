import { describe, expect, test } from "bun:test";

import { createRemoteVerifyProxy } from "./dev-api-proxy";

describe("createRemoteVerifyProxy", () => {
  test("routes only locally implemented migration endpoints through the local BFF", () => {
    const remoteTarget = "https://cube-test.guhecloud.com:3000";
    const localBffTarget = "http://127.0.0.1:3031";
    const proxy = createRemoteVerifyProxy(remoteTarget, localBffTarget);

    expect(proxy["/gw-bff/command-dispatch"]?.target).toBe(localBffTarget);
    expect(proxy["/gw-bff/secure-edu"]?.target).toBe(localBffTarget);
    expect(proxy["/gw-bff/emergency-supplies"]?.target).toBe(localBffTarget);
    expect(proxy["/gw-bff/ouaa/departments"]?.target).toBe(localBffTarget);
    expect(proxy["/gw-bff/file/upload"]?.target).toBe(localBffTarget);
    expect(proxy["/gw-bff"]?.target).toBe(remoteTarget);
    expect(proxy["/minio"]?.target).toBe(remoteTarget);
    expect(Object.keys(proxy).indexOf("/gw-bff/command-dispatch")).toBeLessThan(Object.keys(proxy).indexOf("/gw-bff"));
    expect(Object.keys(proxy).indexOf("/gw-bff/secure-edu")).toBeLessThan(Object.keys(proxy).indexOf("/gw-bff"));
    expect(Object.keys(proxy).indexOf("/gw-bff/emergency-supplies")).toBeLessThan(Object.keys(proxy).indexOf("/gw-bff"));
  });

  test("keeps the deployed risk-control BFF on the verification environment", () => {
    const remoteTarget = "https://cube-test.guhecloud.com:3000";
    const proxy = createRemoteVerifyProxy(remoteTarget, "http://127.0.0.1:3031");

    expect(proxy["/gw-bff/risk-graded-control"]).toBeUndefined();
    expect(proxy["/gw-bff"]?.target).toBe(remoteTarget);
  });

  test("uses the remote environment for every route when no local BFF is available", () => {
    const remoteTarget = "https://cube-test.guhecloud.com:3000";
    const proxy = createRemoteVerifyProxy(remoteTarget);

    expect(proxy["/gw-bff/command-dispatch"]).toBeUndefined();
    expect(proxy["/gw-bff/risk-graded-control"]).toBeUndefined();
    expect(proxy["/gw-bff/secure-edu"]).toBeUndefined();
    expect(proxy["/gw-bff/emergency-supplies"]).toBeUndefined();
    expect(proxy["/gw-bff"]?.target).toBe(remoteTarget);
  });
});
