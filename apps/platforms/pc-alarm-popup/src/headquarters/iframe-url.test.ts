import { describe, expect, test } from "bun:test";

import { buildHeadquartersIframeUrl, parseHeadquartersAlarmPayload } from "./iframe-url";

describe("headquarters iframe URL", () => {
  test("builds URL from market config + businessKey", () => {
    const url = buildHeadquartersIframeUrl(
      {
        url: "https://market.example.com/",
        account: "acct",
        password: "pwd",
        marketName: "示例市场",
      },
      "bk-hq-1",
    );
    expect(url).toBe("https://market.example.com/apps/@ghcloud/cube-alarm-modal?client_id=acct&client_secret=pwd&businessKey=bk-hq-1");
  });

  test("parseHeadquartersAlarmPayload", () => {
    const alarm = { businessKey: "bk", marketTenant: "m1" };
    expect(parseHeadquartersAlarmPayload({ businessPrincipal: JSON.stringify(alarm) })).toMatchObject(alarm);
    expect(parseHeadquartersAlarmPayload({ businessPrincipal: "not-json" })).toBeNull();
  });
});
