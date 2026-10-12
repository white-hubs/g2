import { expect, test } from "bun:test";

import { backLogTitle, buildFlowVariables } from "./flow-variables";

test("passes condition and form assignee values to the flow engine", () => {
  const flow = {
    type: "ROOT",
    children: {
      type: "CONDITIONS",
      branchs: [
        {
          props: {
            groups: [
              {
                conditions: [
                  { id: "field-status", name: "SelectInput" },
                  { id: "field-dept", name: "DeptPicker" },
                ],
              },
            ],
          },
          children: { type: "APPROVAL", props: { assignedType: "FORM_USER", formUser: "field-user" } },
        },
      ],
    },
  };
  expect(buildFlowVariables(flow, { "field-status": "urgent", "field-dept": [{ id: "dep-1" }], "field-user": { id: "user-1" } })).toEqual({
    "field-status": "urgent",
    "field-dept": ["dep-1"],
    "field-user": { id: "user-1" },
  });
});

test("uses a configured form field for the backlog title", () => {
  expect(backLogTitle([{ id: "title", name: "TextInput", props: { useAsBackLogTitle: true } }], { title: "  故障单  " })).toBe("故障单");
});
