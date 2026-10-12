import { expect, test } from "bun:test";
import { reactive } from "vue";

import { createFlowNode, type FlowNode } from "./flow-tree";
import { ensureAssignmentProps, normalizeLimitTimeConfig, prepareProcessForPublish, validateProcessDesign } from "./process-design";

test("审批范围保持旧发起人自选、岗位与部门字段结构", () => {
  const node = createFlowNode("APPROVAL", "root", []);
  const props = ensureAssignmentProps(node);
  props.assignedType = "SELF_SELECT";
  props.selfSelect = { type: "ROLE", typeForSelectRange: { ROLE: [] } };
  expect(validateProcessDesign(node)[0]?.message).toContain("自选范围");
  props.selfSelect = { type: "ROLE", typeForSelectRange: { ROLE: [{ id: "r1", name: "维修角色" }] } };
  expect(validateProcessDesign(node)).toEqual([]);
  props.assignedType = "DEP_POST";
  props.deptPost = { dept: { id: "d1", name: "工程部" }, post: [] };
  expect(validateProcessDesign(node)[0]?.message).toContain("部门+岗位");
  props.deptPost = { dept: { id: "d1", name: "工程部" }, post: [{ id: "p1", name: "维修岗" }] };
  expect(validateProcessDesign(node)).toEqual([]);
});

test("发布角色、职位和岗位会转换为assignedUser且不改动编辑状态", () => {
  for (const [type, key] of [
    ["ROLE", "role"],
    ["POST", "post"],
    ["SINGLE_POST", "single_post"],
    ["APPOINTMENT", "appointment"],
    ["SINGLE_APPOINTMENT", "single_appointment"],
  ]) {
    const node = reactive(createFlowNode("APPROVAL", "root", []));
    node.props!["assignedType"] = type;
    node.props![key!] = [{ id: "choice", name: "审批范围" }];
    const result = prepareProcessForPublish(node, []);
    expect(result?.props?.assignedUser).toEqual([{ id: "choice", name: "审批范围" }]);
    expect(node.props?.assignedUser).toEqual([]);
  }
});

test("发布同步组合内字段的权限名称和必填，删除已移除字段", () => {
  const node: FlowNode = {
    id: "approval",
    type: "APPROVAL",
    name: "审批",
    props: {
      formPerms: [
        { id: "child", title: "旧名", required: false, perm: "E" },
        { id: "removed", perm: "H" },
      ],
    },
  };
  const result = prepareProcessForPublish(node, [
    { id: "group", name: "GroupList", props: { items: [{ id: "child", name: "TextInput", title: "新名", props: { required: true } }] } },
  ]);
  expect(result?.props?.formPerms).toEqual([{ id: "child", title: "新名", required: true, perm: "E" }]);
});

test("必填编辑字段、限时提醒与超时转交按旧校验阻止不完整发布", () => {
  const node = createFlowNode("APPROVAL", "root", []);
  node.props = {
    ...node.props,
    assignedType: "SELF",
    formPerms: [{ id: "field", required: true, perm: "E" }],
    limitTimeApproval: true,
    limitTimeApprovalConfig: {
      limitTimeNotify: { checked: true, approvalReminder: [{ unit: "MINUTE", value: 4 }] },
      limitTimeApproval: { checked: true, unit: "MINUTE", value: 10, type: "TRANSFER", targetUsers: [] },
    },
  };
  const errors = validateProcessDesign(node).map((error) => error.message);
  expect(errors.some((message) => message.includes("不能自动通过"))).toBe(true);
  expect(errors.some((message) => message.includes("提醒时间"))).toBe(true);
  expect(errors.some((message) => message.includes("转交人员"))).toBe(true);
});

test("抄送允许发起人补选时不强制预设名单，分支比较值不可为空", () => {
  const cc = createFlowNode("CC", "root", []);
  expect(validateProcessDesign(cc).length).toBe(1);
  cc.props!.shouldAdd = true;
  expect(validateProcessDesign(cc)).toEqual([]);
  const condition: FlowNode = {
    id: "condition",
    type: "CONDITION",
    name: "条件1",
    props: { groups: [{ cids: ["field"], conditions: [{ id: "field", value: [] }] }] },
  };
  expect(validateProcessDesign(condition)[0]?.message).toContain("分支比较值");
});

test("历史autoPass和缺失提醒字段在高级设置中保持原值并补齐名单", () => {
  const config = normalizeLimitTimeConfig({
    autoPass: { checked: true, value: "8", unit: "HOUR" },
    limitTimeNotify: { checked: true, approvalReminder: [{ value: 5, unit: "MINUTE", notifyType: "ROLE" }] },
  });
  expect(config.limitTimeApproval).toEqual({ checked: true, value: 8, unit: "HOUR", type: "PASS", targetUsers: [], targetAccount: "" });
  expect(config.limitTimeNotify.approvalReminder[0]).toEqual({
    value: 5,
    unit: "MINUTE",
    notifyType: "ROLE",
    notifyUsers: [],
    notifyRole: [],
    notifyPost: [],
    notifyAppointment: [],
    formUser: null,
  });
  const transfer = normalizeLimitTimeConfig({
    limitTimeApproval: { checked: true, type: "TRANSFER", targetUsers: [{ id: "user1", name: "审批人" }] },
  });
  expect(transfer.limitTimeApproval.targetAccount).toBe("user1");
});

test("发布校验读取最新必填字段而非历史权限快照", () => {
  const node = createFlowNode("APPROVAL", "root", [{ id: "field", props: { required: false } }]);
  node.props!.assignedType = "SELF";
  node.props!.formPerms = [{ id: "field", perm: "E", required: false }];
  expect(validateProcessDesign(node)).toEqual([]);
  const prepared = prepareProcessForPublish(node, [{ id: "field", name: "TextInput", props: { required: true } }]);
  expect(validateProcessDesign(prepared)[0]?.message).toContain("不能自动通过");
});
