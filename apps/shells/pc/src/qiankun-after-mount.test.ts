import { describe, expect, test } from "bun:test";

import { runQiankunAfterShellMount } from "./qiankun-after-mount";

describe("runQiankunAfterShellMount", () => {
  test("严格先完成 mountShell 再执行 startQiankun（保证壳层 DOM 已就绪）", async () => {
    const order: string[] = [];
    let shellMounted = false;
    let startSawMounted = false;

    await runQiankunAfterShellMount(
      async () => {
        order.push("mount");
        shellMounted = true;
      },
      async () => {
        order.push("start");
        startSawMounted = shellMounted;
      },
    );

    expect(order).toEqual(["mount", "start"]);
    expect(startSawMounted).toBe(true);
  });
});
