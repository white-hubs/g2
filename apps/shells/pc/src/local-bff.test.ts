import { describe, expect, test } from "bun:test";

import { bindLocalBffLifecycle, createLocalBffEnvironment } from "./local-bff";

describe("createLocalBffEnvironment", () => {
  test("maps the selected verification environment to the legacy upstream services", () => {
    expect(createLocalBffEnvironment("https://cube-test.guhecloud.com:3000/", 3031)).toMatchObject({
      PORT: "3031",
      HOSTNAME: "127.0.0.1",
      DISPATCH_URL: "https://cube-test.guhecloud.com:3000/api/dispatch",
      FUSION_COMMUNICATE_URL: "https://cube-test.guhecloud.com:3000/api/fusion-communicate",
      OUAA_URL: "https://cube-test.guhecloud.com:3000/api/ouaa",
      FILE_SERVICE_URL: "https://cube-test.guhecloud.com:3000/api/file",
      EMERGENCY_URL: "https://cube-test.guhecloud.com:3000/api/emergency",
      SECURE_EDU_URL: "https://cube-test.guhecloud.com:3000",
    });
    expect(createLocalBffEnvironment("https://cube-test.guhecloud.com:3000/", 3031)).not.toHaveProperty("RISK_CONTROL_URL");
  });

  test("stops the local BFF when Vite fails before it can listen", () => {
    const handlers = new Map<string, () => void>();
    let stops = 0;
    bindLocalBffLifecycle(
      {
        once(event, listener) {
          handlers.set(event, listener);
        },
      },
      () => {
        stops += 1;
      },
    );

    handlers.get("error")?.();
    expect(stops).toBe(1);
    expect(handlers.has("close")).toBe(true);
  });
});
