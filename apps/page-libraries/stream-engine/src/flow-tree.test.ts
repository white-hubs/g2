import { describe, expect, test } from "bun:test";

import { addConditionBranch, findFlowNode, insertFlowNode, removeFlowNode, type FlowNode } from "./flow-tree";

describe("flow tree editing", () => {
  test("inserts an approval ahead of the following node without losing the chain", () => {
    const next: FlowNode = { id: "next", parentId: "root", type: "CC", name: "抄送人" };
    const root: FlowNode = { id: "root", type: "ROOT", name: "发起人", children: next };
    const approval = insertFlowNode(root, "APPROVAL", [{ id: "field", title: "原因", props: { required: true } }]);
    expect(root.children).toBe(approval);
    expect(approval.children).toBe(next);
    expect(next.parentId).toBe(approval.id);
    expect(approval.props?.formPerms).toEqual([{ id: "field", title: "原因", perm: "R", required: true }]);
    expect(removeFlowNode(root, approval.id)).toBe(true);
    expect(root.children).toBe(next);
    expect(next.parentId).toBe("root");
  });

  test("keeps the following chain after a condition join", () => {
    const next: FlowNode = { id: "next", parentId: "root", type: "APPROVAL", name: "审批人" };
    const root: FlowNode = { id: "root", type: "ROOT", name: "发起人", children: next };
    const conditions = insertFlowNode(root, "CONDITIONS", []);
    const join = conditions.children!;
    expect(conditions.branchs?.map((branch) => branch.name)).toEqual(["条件1", "条件2"]);
    expect(join.type).toBe("EMPTY");
    expect(join.children).toBe(next);
    expect(next.parentId).toBe(join.id);
    const third = addConditionBranch(conditions)!;
    expect(findFlowNode(root, third.id)).toBe(third);
    expect(removeFlowNode(root, third.id)).toBe(true);
    expect(removeFlowNode(root, conditions.branchs![0]!.id)).toBe(true);
    expect(root.children).toBe(next);
  });
});
