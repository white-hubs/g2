import { describe, expect, test } from "bun:test";

import { accountStatus, buildDevicePayload, findAccountDevice } from "./account-state";

describe("account editor boundary", () => {
  test("password encoding is repeatable after a failed save and does not mutate the form", () => {
    const form = {
      id: "9123456789012345678",
      code: "00001",
      name: "值班员",
      password: "Pass123",
      type: "SIP",
      deviceLevel: 0,
      isRecord: false,
      isVideo: true,
    };
    expect(buildDevicePayload(form)).toEqual({ ...form, password: "UGFzczEyMw==" });
    expect(buildDevicePayload(form).password).toBe("UGFzczEyMw==");
    expect(form.password).toBe("Pass123");
    expect(() => buildDevicePayload({ ...form, password: "" })).toThrow();
  });

  test("editing resolves an exact device code across keyword result pages instead of a fusion account id", async () => {
    const found = await findAccountDevice("00001", async ({ pageNumber }) =>
      pageNumber === 1
        ? { records: [{ id: "wrong-device", code: "100001" }], total: 2 }
        : { records: [{ id: "dispatch-device-id", code: "00001" }], total: 2 },
    );
    expect(found).toEqual({ id: "dispatch-device-id", code: "00001" });
  });

  test("no exact matching dispatch device is reported as unavailable", async () => {
    expect(
      await findAccountDevice("00001", async () => ({ records: [{ id: "not-an-account-id", code: "100001" }], total: 1 })),
    ).toBeUndefined();
  });

  test("unknown status renders safely and a zero level is not replaced by an empty placeholder", () => {
    expect(accountStatus("IN_USED").title).toBe("在用");
    expect(accountStatus("UNKNOWN").title).toBe("UNKNOWN");
    expect(accountStatus(undefined).title).toBe("--");
  });
});
