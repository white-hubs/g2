import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

describe("pc-table scrollbar", () => {
  const css = readFileSync(new URL("./pc-table.module.css", import.meta.url), "utf8");
  const layoutCss = readFileSync(new URL("./page-layout.module.css", import.meta.url), "utf8");
  const layoutTs = readFileSync(new URL("./page-layout.ts", import.meta.url), "utf8");

  test("keeps vertical scrollbar alignment for scroll-y bodies", () => {
    expect(css).toContain(".pc-alias-table--scroll-y");
    expect(css).toContain("overflow-y: scroll !important");
  });

  test("does not hide table-body horizontal scrollbar for a fake bottom bar", () => {
    expect(css).not.toContain("::-webkit-scrollbar:horizontal");
    expect(css).not.toContain("hasTableScroll");
    expect(css).not.toContain("has-table-scroll");
  });

  test("PageLayout no longer renders external table scroll capture DOM", () => {
    expect(layoutCss).not.toContain("scrollCaptureArea");
    expect(layoutCss).not.toContain("tableScrollContainer");
    expect(layoutTs).not.toContain("pc-table-scroll-container");
    expect(layoutTs).not.toContain("scrollCaptureArea");
  });

  test("PageLayout deletes showTableXScroll prop but strips legacy callers from DOM attrs", () => {
    expect(layoutTs).not.toMatch(/showTableXScroll:\s*\{\s*type:\s*Boolean/);
    expect(layoutTs).toContain("IGNORED_ATTR_KEYS");
    expect(layoutTs).toContain("showTableXScroll");
    expect(layoutTs).toContain("show-table-x-scroll");
    expect(layoutTs).toContain("inheritAttrs: false");
  });

  test("PageLayout uses horizontal-only 16px padding (not top)", () => {
    expect(layoutCss).toMatch(/\.layoutContainer\s*\{[^}]*padding:\s*0 16px;/s);
    expect(layoutCss).not.toMatch(/\.layoutContainer\s*\{[^}]*padding:\s*16px;/s);
  });
});
