import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { PageLayout } from "./page-layout";

describe("PageLayout", () => {
  test("exports a Vue component with expected name (CubeLayout successor)", () => {
    expect(PageLayout).toBeDefined();
    expect((PageLayout as { name?: string }).name).toBe("PageLayout");
  });

  test("uses independent page-card background without changing horizontal-only padding", () => {
    const css = readFileSync(new URL("./page-layout.module.css", import.meta.url), "utf8");
    expect(css.match(/background:\s*var\(--g2-color-page-layout-bg, #ffffff\);/gu)).toHaveLength(2);
    expect(css).not.toContain("--g2-color-surface-bg");
    expect(css).toMatch(/\.layoutContainer\s*\{[^}]*padding:\s*0 16px;/s);
  });
});
