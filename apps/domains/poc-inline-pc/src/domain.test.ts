import { assertDomainModule } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import { domainModule } from "./domain";

describe("@g2-domain/poc-inline-pc", () => {
  test("exposes routes through the domain contract", () => {
    const result = assertDomainModule(domainModule);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.module.routes[0]?.name).toBe("poc-inline");
    }
  });
});
