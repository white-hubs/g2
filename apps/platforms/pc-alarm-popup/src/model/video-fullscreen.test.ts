import { describe, expect, test } from "bun:test";

import { findVideoFullscreenContainer } from "./video-fullscreen";

type FakeElement = {
  classList: { contains: (name: string) => boolean };
  parentElement: FakeElement | null;
};

function fakeEl(className: string | null, parent: FakeElement | null = null): FakeElement {
  return {
    classList: {
      contains: (name: string) => className === name,
    },
    parentElement: parent,
  };
}

describe("video fullscreen helpers", () => {
  test("findVideoFullscreenContainer walks up to matching class", () => {
    const root = fakeEl("grid-item");
    const inner = fakeEl(null, root);
    expect(findVideoFullscreenContainer(inner as unknown as EventTarget, ["grid-item", "alarm-video-container-box"])).toBe(root);
  });

  test("findVideoFullscreenContainer returns null when no match", () => {
    const el = fakeEl(null);
    expect(findVideoFullscreenContainer(el as unknown as EventTarget, ["grid-item"])).toBeNull();
  });
});
