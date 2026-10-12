import { describe, expect, test } from "bun:test";

function resolveHeaderTitleJustify(align: "left" | "center" | "right" | undefined): string {
  if (align === "center") return "center";
  if (align === "right") return "flex-end";
  return "flex-start";
}

describe("alias-table header layout", () => {
  test("maps column align to flex justify-content", () => {
    expect(resolveHeaderTitleJustify(undefined)).toBe("flex-start");
    expect(resolveHeaderTitleJustify("center")).toBe("center");
    expect(resolveHeaderTitleJustify("right")).toBe("flex-end");
  });
});
