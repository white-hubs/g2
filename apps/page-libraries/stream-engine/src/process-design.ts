import type { FlowNode } from "./flow-tree";
import { asIdNameList, flattenFormItems, type FormSchemaItem } from "./form-schema";
import { validConditionValue, type ProcessCondition } from "./process-conditions";

type NamedUser = { id: string; name: string };
export type ApprovalReminder = {
  value: number | null;
  unit: string;
  notifyType: string;
  notifyUsers: NamedUser[];
  notifyRole: NamedUser[];
  notifyPost: NamedUser[];
  notifyAppointment: NamedUser[];
  formUser: string | null;
};
export type LimitTimeConfig = {
  limitTimeNotify: { checked: boolean; approvalReminder: ApprovalReminder[] };
  limitTimeApproval: {
    checked: boolean;
    value: number | null;
    unit: string;
    type: string;
    targetUsers: NamedUser[];
    targetAccount: string;
  };
};

export const APPROVAL_ASSIGNMENT_OPTIONS = [
  { label: "指定人员", value: "ASSIGN_USER" },
  { label: "发起人自选", value: "SELF_SELECT" },
  { label: "角色", value: "ROLE" },
  { label: "管理部门职位", value: "POST" },
  { label: "所在部门岗位", value: "APPOINTMENT" },
  { label: "发起人自己", value: "SELF" },
  { label: "上一节点审批人", value: "PREV_ASSIGNEE" },
  { label: "表单内联系人", value: "FORM_USER" },
  { label: "部门+岗位", value: "DEP_POST" },
  { label: "部门+职位", value: "DEP_POSITION" },
  { label: "空节点", value: "EMPTY" },
  { label: "职位", value: "SINGLE_POST" },
  { label: "岗位", value: "SINGLE_APPOINTMENT" },
];

export const CC_ASSIGNMENT_OPTIONS = APPROVAL_ASSIGNMENT_OPTIONS.filter((option) =>
  ["ASSIGN_USER", "ROLE", "APPOINTMENT", "FORM_USER"].includes(option.value),
);
export const ASSIGNMENT_FIELDS: Record<string, string> = {
  ASSIGN_USER: "assignedUser",
  ROLE: "role",
  POST: "post",
  SINGLE_POST: "single_post",
  APPOINTMENT: "appointment",
  SINGLE_APPOINTMENT: "single_appointment",
};

export function processObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function normalizeLimitTimeConfig(value: unknown): LimitTimeConfig {
  const config = processObject(value);
  const notify = processObject(config.limitTimeNotify);
  const limit = processObject(config.limitTimeApproval ?? config.autoPass);
  const number = (raw: unknown): number | null => (raw == null || raw === "" || !Number.isFinite(Number(raw)) ? null : Number(raw));
  const reminder = (raw: unknown): ApprovalReminder => {
    const item = processObject(raw);
    return {
      ...item,
      value: number(item.value),
      unit: String(item.unit ?? "DAY"),
      notifyType: String(item.notifyType ?? "currentApproval"),
      notifyUsers: asIdNameList(item.notifyUsers),
      notifyRole: asIdNameList(item.notifyRole),
      notifyPost: asIdNameList(item.notifyPost),
      notifyAppointment: asIdNameList(item.notifyAppointment),
      formUser: item.formUser == null ? null : String(item.formUser),
    };
  };
  const targetUsers = asIdNameList(limit.targetUsers);
  return {
    ...config,
    limitTimeNotify: {
      ...notify,
      checked: Boolean(notify.checked),
      approvalReminder:
        Array.isArray(notify.approvalReminder) && notify.approvalReminder.length ? notify.approvalReminder.map(reminder) : [reminder({})],
    },
    limitTimeApproval: {
      ...limit,
      checked: Boolean(limit.checked),
      value: number(limit.value),
      unit: String(limit.unit ?? "DAY"),
      type: String(limit.type ?? "PASS"),
      targetUsers,
      targetAccount: targetUsers.length ? targetUsers.map((user) => user.id).join(",") : String(limit.targetAccount ?? ""),
    },
  };
}

export function ensureAssignmentProps(node: FlowNode): Record<string, unknown> {
  const props = (node.props ??= {});
  props.assignedType ??= "ASSIGN_USER";
  for (const key of Object.values(ASSIGNMENT_FIELDS)) props[key] ??= [];
  props.formUser ??= "";
  props.selfSelect ??= {};
  const self = processObject(props.selfSelect);
  self.type ??= "ALL";
  self.typeForSelectRange ??= { ASSIGN_USER: [], ROLE: [] };
  props.deptPost ??= { dept: null, post: [] };
  props.deptPosition ??= { dept: null, position: [] };
  props.nobody ??= { handler: "TO_PASS", assignedUser: [] };
  props.mode ??= "AND";
  return props;
}

export function editableRequired(node: FlowNode): boolean {
  return ["formPerms", "outerFormPerms"].some(
    (key) =>
      Array.isArray(node.props?.[key]) &&
      (node.props[key] as Array<{ perm?: string; required?: boolean }>).some((item) => item.perm === "E" && item.required),
  );
}

export function assignmentSummary(node: FlowNode, fields: FormSchemaItem[]): string {
  const props = node.props ?? {};
  const type = String(props.assignedType ?? "ASSIGN_USER");
  const names = (value: unknown): string =>
    asIdNameList(value)
      .map((item) => item.name)
      .join("、");
  if (node.type === "CC" && props.shouldAdd) return "发起人添加抄送人";
  if (ASSIGNMENT_FIELDS[type])
    return (
      names(props[ASSIGNMENT_FIELDS[type]]) ||
      `请选择${["POST", "SINGLE_POST"].includes(type) ? "职位" : ["APPOINTMENT", "SINGLE_APPOINTMENT"].includes(type) ? "岗位" : type === "ROLE" ? "角色" : node.type === "CC" ? "抄送人" : "审批人"}`
    );
  if (type === "SELF_SELECT") {
    const self = processObject(props.selfSelect);
    return self.type === "ALL"
      ? "发起人自选全公司"
      : `发起人自选${self.type === "ROLE" ? "角色" : "人员"}：${names(processObject(self.typeForSelectRange)[String(self.type)])}`;
  }
  if (type === "FORM_USER")
    return `表单内联系人：${flattenFormItems(fields).find((item) => String(item.id) === String(props.formUser))?.title ?? "未选择"}`;
  if (["DEP_POST", "DEP_POSITION"].includes(type)) {
    const selection = processObject(props[type === "DEP_POST" ? "deptPost" : "deptPosition"]);
    return `${type === "DEP_POST" ? "部门+岗位" : "部门+职位"}：${String(processObject(selection.dept).name ?? "未选择")} ${names(selection[type === "DEP_POST" ? "post" : "position"])}`;
  }
  return APPROVAL_ASSIGNMENT_OPTIONS.find((option) => option.value === type)?.label ?? "未设置审批人";
}

function timeoutMinutes(value: Record<string, unknown>): number {
  return Number(value.value) * (value.unit === "DAY" ? 1440 : value.unit === "HOUR" ? 60 : 1);
}

export function validateProcessDesign(root: FlowNode | null): Array<{ nodeId: string; message: string }> {
  const errors: Array<{ nodeId: string; message: string }> = [];
  const visit = (node: FlowNode | null | undefined): void => {
    if (!node?.id) return;
    const props = node.props ?? {};
    const type = String(props.assignedType ?? "ASSIGN_USER");
    const fail = (text: string): void => {
      errors.push({ nodeId: node.id, message: `${node.name}：${text}` });
    };
    if (["APPROVAL", "CC"].includes(node.type) && !(node.type === "CC" && props.shouldAdd)) {
      if (ASSIGNMENT_FIELDS[type] && !asIdNameList(props[ASSIGNMENT_FIELDS[type]]).length)
        fail(
          `请选择${type === "ROLE" ? "角色" : ["POST", "SINGLE_POST"].includes(type) ? "职位" : ["APPOINTMENT", "SINGLE_APPOINTMENT"].includes(type) ? "岗位" : "人员"}`,
        );
      if (type === "FORM_USER" && !props.formUser) fail("请选择表单内联系人");
      if (type === "SELF_SELECT") {
        const self = processObject(props.selfSelect);
        if (
          ["ASSIGN_USER", "ROLE"].includes(String(self.type)) &&
          !asIdNameList(processObject(self.typeForSelectRange)[String(self.type)]).length
        )
          fail("请选择发起人自选范围");
      }
      if (["DEP_POST", "DEP_POSITION"].includes(type)) {
        const selection = processObject(props[type === "DEP_POST" ? "deptPost" : "deptPosition"]);
        if (!processObject(selection.dept).id || !asIdNameList(selection[type === "DEP_POST" ? "post" : "position"]).length)
          fail(`请选择${type === "DEP_POST" ? "部门+岗位" : "部门+职位"}`);
      }
    }
    if (node.type === "APPROVAL") {
      const nobody = processObject(props.nobody);
      if (nobody.handler === "TO_USER" && !asIdNameList(nobody.assignedUser).length) fail("请选择审批人为空时的指定人员");
      if (nobody.handler === "TO_PASS" && editableRequired(node)) fail("必填且可编辑字段不能自动通过");
      if (props.rejectStrategy === "TO_SELECT_NODE" && !asIdNameList(props.rejectStrategyNode).length) fail("请选择驳回到指定节点");
      if (props.limitTimeApproval) {
        const config = processObject(props.limitTimeApprovalConfig);
        const notify = processObject(config.limitTimeNotify);
        const limit = processObject(config.limitTimeApproval ?? config.autoPass);
        const reminders = Array.isArray(notify.approvalReminder) ? notify.approvalReminder.map(processObject) : [];
        const validTime = (value: Record<string, unknown>): boolean => Number(value.value) >= (value.unit === "MINUTE" ? 5 : 1);
        if (notify.checked && (!reminders.length || reminders.some((reminder) => !validTime(reminder))))
          fail("请输入限时提醒时间，分钟至少为5");
        if (limit.checked) {
          if (!validTime(limit)) fail("请输入限时审批时间，分钟至少为5");
          if (limit.type !== "TRANSFER" && editableRequired(node)) fail("限时自动通过前请移除必填且可编辑字段");
          if (limit.type === "TRANSFER" && !limit.targetAccount && !asIdNameList(limit.targetUsers).length) fail("请选择超时自动转交人员");
          if (notify.checked && reminders.some((reminder) => timeoutMinutes(reminder) > timeoutMinutes(limit)))
            fail("限时提醒时间不能大于限时审批时间");
        }
      }
    }
    if (node.type === "CONDITION") {
      const groups = Array.isArray(props.groups) ? props.groups.map(processObject) : [];
      if (!groups.length || groups.some((group) => !Array.isArray(group.cids) || !group.cids.length)) fail("请设置分支条件");
      else if (
        groups.some(
          (group) =>
            !Array.isArray(group.conditions) || group.conditions.some((condition) => !validConditionValue(condition as ProcessCondition)),
        )
      )
        fail("请完善分支比较值");
    }
    node.branchs?.forEach(visit);
    visit(node.children);
  };
  visit(root);
  return errors;
}

export function prepareProcessForPublish(root: FlowNode | null, fields: FormSchemaItem[]): FlowNode | null {
  const result = root ? (JSON.parse(JSON.stringify(root)) as FlowNode) : null;
  const items = flattenFormItems(fields).filter((item) => item.name !== "GroupList");
  const visit = (node: FlowNode | null | undefined): void => {
    if (!node?.id) return;
    const props = node.props;
    if (props) {
      const key = ASSIGNMENT_FIELDS[String(props.assignedType)];
      if (key && key !== "assignedUser") props.assignedUser = structuredClone(props[key] ?? []);
      for (const permissionKey of ["formPerms", "outerFormPerms"]) {
        if (!["ROOT", "APPROVAL", "CC"].includes(node.type)) continue;
        const saved = Array.isArray(props[permissionKey]) ? props[permissionKey].map(processObject) : [];
        props[permissionKey] = items.map((item) => ({
          ...saved.find((permission) => String(permission.id) === String(item.id)),
          id: item.id,
          title: item.title,
          required: Boolean(item.props?.required),
          perm: saved.find((permission) => String(permission.id) === String(item.id))?.perm ?? (node.type === "ROOT" ? "E" : "R"),
        }));
      }
    }
    node.branchs?.forEach(visit);
    visit(node.children);
  };
  visit(result);
  return result;
}
