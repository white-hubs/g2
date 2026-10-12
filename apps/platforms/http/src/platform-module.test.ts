import { assertPlatformModule } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import { platformModule } from "./platform-module";

describe("http platform module", () => {
  test("符合 PlatformModule 契约，label 标识自己（不需要 install/slots——纯库型 Platform，能力通过 ctx.loadPlatform 按需消费）", () => {
    const result = assertPlatformModule(platformModule);
    expect(result.ok).toBe(true);
    expect(platformModule.label).toBe("http");
  });
});
