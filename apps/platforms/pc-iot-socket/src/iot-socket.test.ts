import { describe, expect, test } from "bun:test";

import { GHIotSocket } from "./main";

describe("pc-iot-socket", () => {
  test("rejects missing accessToken", () => {
    expect(() => new GHIotSocket({ accessToken: "", tenant: 1, terminal: "10000" })).toThrow(/accessToken/);
  });
});
