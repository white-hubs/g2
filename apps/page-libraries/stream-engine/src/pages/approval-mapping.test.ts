import { describe, expect, it } from "bun:test";

import { buildFieldMapList, controlOptions, formControlTree, restoreBusinessFields } from "./approval-mapping";

describe("legacy approval field mapping", () => {
  const schema = JSON.stringify([
    { id: "object", name: "SelectInput", title: "隐患对象" },
    {
      id: "group",
      name: "GroupList",
      title: "隐患明细",
      props: { items: [{ id: "description", name: "TextareaInput", title: "隐患描述" }] },
    },
  ]);

  it("restores nested selections and saves the form control tree with business field IDs", () => {
    const tree = formControlTree(schema);
    const fields = restoreBusinessFields(
      [
        { id: "object-type", name: "对象类型" },
        { id: "danger-description", name: "隐患描述" },
      ],
      tree,
      [
        { controlId: "object", businessField: "object-type" },
        { controlId: "description", businessField: "danger-description" },
      ],
    );
    expect(fields.map((field) => field.formItemId)).toEqual([["object"], ["group", "description"]]);
    expect(controlOptions(tree)[1]?.children?.[0]?.controlId).toBe("description");
    expect(buildFieldMapList(tree, fields)).toEqual([
      { controlId: "object", title: "隐患对象", businessField: "object-type" },
      {
        controlId: "group",
        title: "隐患明细",
        businessField: "",
        controlType: "RECEPTACLE",
        children: [{ controlId: "description", title: "隐患描述", businessField: "danger-description" }],
      },
    ]);
  });
});
