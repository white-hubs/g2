import { describe, expect, test } from "bun:test";

import { buildGroupPayload, changeMemberSelection } from "./group-state";

describe("group changes", () => {
  test("select all stores device codes and preserves selections on other pages without duplicates", () => {
    const previous = ["00001", "09000"];
    expect(
      changeMemberSelection(
        previous,
        [
          { id: "123456789123456789", code: "00001" },
          { id: "other-id", code: "00002" },
        ],
        true,
      ),
    ).toEqual(["00001", "09000", "00002"]);
    expect(previous).toEqual(["00001", "09000"]);
  });

  test("unselect all removes only changed-page codes and permits saving an empty membership", () => {
    expect(changeMemberSelection(["00001", "09000"], [{ code: "00001" }], false)).toEqual(["09000"]);
    expect(changeMemberSelection(["00001"], [{ code: "00001" }], false)).toEqual([]);
  });

  test("group code and string id keep leading digits and zero is a valid group level", () => {
    expect(
      buildGroupPayload({ id: "9123456789012345678", code: "00001", name: "测试组", groupLevel: 0, isRecord: false, type: 0 }),
    ).toEqual({ id: "9123456789012345678", code: "00001", name: "测试组", groupLevel: 0, isRecord: false, type: 0 });
  });

  test("invalid group fields cannot reach the service payload", () => {
    const valid = { code: "100", name: "测试组", groupLevel: 1, isRecord: true, type: 0 };
    expect(() => buildGroupPayload({ ...valid, code: "100000" })).toThrow();
    expect(() => buildGroupPayload({ ...valid, name: "  " })).toThrow();
    expect(() => buildGroupPayload({ ...valid, groupLevel: null })).toThrow();
    expect(() => buildGroupPayload({ ...valid, groupLevel: 100.5 })).toThrow();
  });
});
