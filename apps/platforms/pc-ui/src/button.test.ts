import { describe, expect, test } from "bun:test";

describe("@g2-platform/pc-ui/button subpath", () => {
  test("exports Button from dedicated entry (API on-demand)", async () => {
    const mod = await import("./button");
    expect(typeof mod.Button).toBe("object");
    expect(mod.Button).toBeDefined();
    // 子路径入口不应再导出整桶（网络按需的契约面）
    expect("Modal" in mod).toBe(false);
    expect("installPcUi" in mod).toBe(false);
  });
});
