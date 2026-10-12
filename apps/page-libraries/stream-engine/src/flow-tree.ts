export type FlowNode = {
  id: string;
  type: string;
  name: string;
  parentId?: string | null;
  props?: Record<string, unknown>;
  children?: FlowNode | null;
  branchs?: FlowNode[];
  [key: string]: unknown;
};

const approvalActions = [
  { code: "PASS", name: "同意", alias: "", perm: "S" },
  { code: "BACK", name: "退回", alias: "", perm: "S" },
  { code: "TRANSFER", name: "转交", alias: "", perm: "S" },
  { code: "REJECT", name: "驳回", alias: "", perm: "S" },
  { code: "WITHDRAW", name: "撤回", alias: "", perm: "S" },
  { code: "COMMENT", name: "评论", alias: "", perm: "H" },
];

function id(): string {
  return crypto.randomUUID();
}

export function conditionProps(): Record<string, unknown> {
  return { groupsType: "OR", groups: [{ groupType: "AND", cids: [], conditions: [] }], expression: "" };
}

export function createFlowNode(
  type: "APPROVAL" | "CC" | "CONDITIONS",
  parentId: string,
  formItems: Array<{ id?: string; title?: string; props?: { required?: boolean } }>,
): FlowNode {
  const nodeId = id();
  if (type === "CONDITIONS") {
    return {
      id: nodeId,
      parentId,
      type,
      name: "条件分支",
      props: {},
      children: { id: id(), parentId: nodeId, type: "EMPTY", name: "" },
      branchs: [1, 2].map((number) => ({
        id: id(),
        parentId: nodeId,
        type: "CONDITION",
        name: `条件${number}`,
        props: conditionProps(),
        children: null,
      })),
    };
  }
  const formPerms = formItems.map((item) => ({ id: item.id, title: item.title, perm: "R", required: Boolean(item.props?.required) }));
  return {
    id: nodeId,
    parentId,
    type,
    name: type === "APPROVAL" ? "审批人" : "抄送人",
    props:
      type === "APPROVAL"
        ? {
            assignedType: "ASSIGN_USER",
            mode: "AND",
            nobody: { handler: "TO_PASS", assignedUser: [] },
            rejectStrategy: "TO_REJECT",
            rejectStrategyNode: [],
            timeLimit: { timeout: { unit: "H", value: 0 }, handler: { type: "REFUSE", notify: { once: true, hour: 1 } } },
            assignedUser: [],
            formPerms,
            outerFormPerms: structuredClone(formPerms),
            operateAlias: structuredClone(approvalActions),
            formUser: "",
            role: [],
            post: [],
            appointment: [],
            sign: true,
            designatedApprover: true,
            countersign: true,
            opinion: true,
          }
        : {
            shouldAdd: false,
            assignedUser: [],
            appointment: [],
            role: [],
            formPerms,
            outerFormPerms: structuredClone(formPerms),
            operateAlias: structuredClone(approvalActions),
            assignedType: "ASSIGN_USER",
          },
  };
}

export function insertFlowNode(
  parent: FlowNode,
  type: "APPROVAL" | "CC" | "CONDITIONS",
  formItems: Array<{ id?: string; title?: string; props?: { required?: boolean } }>,
): FlowNode {
  const after = parent.children?.id ? parent.children : null;
  const node = createFlowNode(type, parent.id, formItems);
  if (type === "CONDITIONS") {
    const join = node.children!;
    join.children = after;
    if (after) after.parentId = join.id;
  } else {
    node.children = after;
    if (after) after.parentId = node.id;
  }
  parent.children = node;
  return node;
}

export function addConditionBranch(node: FlowNode): FlowNode | undefined {
  if (node.type !== "CONDITIONS" || !node.branchs) return undefined;
  const branch: FlowNode = {
    id: id(),
    parentId: node.id,
    type: "CONDITION",
    name: `条件${node.branchs.length + 1}`,
    props: conditionProps(),
    children: null,
  };
  node.branchs.push(branch);
  return branch;
}

export function findFlowNode(root: FlowNode | null, targetId?: string): FlowNode | undefined {
  if (!root?.id || !targetId) return undefined;
  if (root.id === targetId) return root;
  for (const branch of root.branchs ?? []) {
    const found = findFlowNode(branch, targetId);
    if (found) return found;
  }
  return findFlowNode(root.children ?? null, targetId);
}

export function removeFlowNode(root: FlowNode | null, targetId: string): boolean {
  const target = findFlowNode(root, targetId);
  if (!target || target.type === "ROOT" || target.type === "EMPTY") return false;
  const parent = findFlowNode(root, target.parentId ?? undefined);
  if (!parent) return false;
  if (target.type === "CONDITION" && parent.type === "CONDITIONS") {
    const branches = parent.branchs ?? [];
    if (target.children?.id) return false;
    if (branches.length === 2) {
      const before = findFlowNode(root, parent.parentId ?? undefined);
      if (!before) return false;
      const remaining = branches.find((branch) => branch.id !== targetId)!;
      const next = remaining.children?.id ? remaining.children : parent.children?.children;
      before.children = next?.id ? next : null;
      if (before.children) before.children.parentId = before.id;
      if (remaining.children?.id) {
        let end = remaining.children;
        while (end.children?.id) end = end.children;
        end.children = parent.children?.children?.id ? parent.children.children : null;
        if (end.children) end.children.parentId = end.id;
      }
      return true;
    }
    if (branches.length < 2) return false;
    parent.branchs = branches.filter((branch) => branch.id !== targetId);
    return true;
  }
  if (parent.children?.id !== targetId) return false;
  if (target.type === "CONDITIONS" && target.branchs?.some((branch) => branch.children?.id)) return false;
  const next = target.type === "CONDITIONS" ? target.children?.children : target.children;
  parent.children = next?.id ? next : null;
  if (parent.children) parent.children.parentId = parent.id;
  return true;
}
