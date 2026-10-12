import { describe, expect, test } from "bun:test";

import { getFieldPermission, resolveFormPerms, shouldShowField } from "./form-perms";

const flowJson = {
  id: "root",
  props: {
    formPerms: [
      { id: "f1", perm: "E" },
      { id: "f2", perm: "R" },
      { id: "f3", perm: "H" },
    ],
  },
  children: {
    id: "approve-1",
    props: {
      formPerms: [
        { id: "f1", perm: "R" },
        { id: "f2", perm: "E" },
        { id: "f3", perm: "E" },
      ],
    },
  },
};

describe("form-perms", () => {
  test("resolves root perms for add", () => {
    const perms = resolveFormPerms({ processType: "add", nodeId: "root", flowJson });
    expect(perms.map((item) => `${item.id}:${item.perm}`)).toEqual(["f1:E", "f2:R", "f3:H"]);
  });

  test("resolves current node perms for detail", () => {
    const perms = resolveFormPerms({
      processType: "detail",
      nodeId: "approve-1",
      flowJson,
      processJson: flowJson,
    });
    expect(getFieldPermission({ id: "f1", name: "TextInput" }, perms, "detail", "approve-1")).toEqual({
      show: true,
      readonly: true,
    });
    expect(getFieldPermission({ id: "f2", name: "SelectInput" }, perms, "detail", "approve-1")).toEqual({
      show: true,
      readonly: false,
    });
  });

  test("hides empty readonly fields", () => {
    expect(shouldShowField({ id: "f1", name: "TextInput", title: "内容" }, { show: true, readonly: true }, null)).toBe(false);
    expect(shouldShowField({ id: "f1", name: "TextInput", title: "内容" }, { show: true, readonly: true }, "市场")).toBe(true);
  });
});
