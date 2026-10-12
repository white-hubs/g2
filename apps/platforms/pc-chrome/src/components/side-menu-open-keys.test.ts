import { describe, expect, test } from "bun:test";

import { nextAccordionOpenKeys } from "./side-menu-open-keys";

describe("nextAccordionOpenKeys", () => {
  test("展开兄弟项时关掉另一条分支", () => {
    expect(nextAccordionOpenKeys(["a"], ["a", "b"])).toEqual(["b"]);
  });

  test("展开子项时保留祖先", () => {
    expect(nextAccordionOpenKeys(["a"], ["a", "a/child"])).toEqual(["a", "a/child"]);
  });

  test("收起时原样返回 next", () => {
    expect(nextAccordionOpenKeys(["a", "a/child"], ["a"])).toEqual(["a"]);
  });
});
