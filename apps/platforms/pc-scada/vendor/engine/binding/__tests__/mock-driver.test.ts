import { describe, expect, it, vi } from "vitest";

import { MockDriver } from "../mock-driver";

describe("MockDriver", () => {
  it("pushes update immediately when write is called", async () => {
    const driver = new MockDriver({}, 1000);
    const cb = vi.fn();

    const unsub = driver.subscribe(["running"], cb);
    cb.mockClear();

    await driver.write("running", true);

    expect(cb).toHaveBeenCalledTimes(1);
    const payload = cb.mock.calls[0]?.[0];
    expect(payload?.running?.value).toBe(true);

    unsub();
  });
});
