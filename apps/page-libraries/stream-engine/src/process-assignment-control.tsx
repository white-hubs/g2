import type { StreamEngineClient } from "@g2-client/stream-engine/client";
import { Checkbox, FormItem, InputNumber, Select, message } from "@g2-platform/pc-ui";
import { defineComponent, ref, watch, type PropType } from "vue";

import type { StreamEnginePageProps } from "./contract";
import type { FlowNode } from "./flow-tree";
import { UserPickerControl } from "./form-controls";
import { asIdNameList, flattenFormItems, type FormSchemaItem } from "./form-schema";
import {
  APPROVAL_ASSIGNMENT_OPTIONS,
  ASSIGNMENT_FIELDS,
  CC_ASSIGNMENT_OPTIONS,
  ensureAssignmentProps,
  processObject,
} from "./process-design";
import ProcessRolePicker from "./process-role-picker";

type Choice = { id: string; name: string };
const selectStyle = { width: "100%" };

function choices(rows: unknown[]): Choice[] {
  return rows.flatMap((row) => {
    const item = processObject(row);
    return item.id == null
      ? []
      : [{ id: String(item.id), name: String(item.name ?? item.appointmentName ?? item.positionName ?? item.id) }];
  });
}

export default defineComponent({
  name: "ProcessAssignmentControl",
  props: {
    node: { type: Object as PropType<FlowNode>, required: true },
    client: { type: Object as PropType<StreamEngineClient> },
    fields: { type: Array as PropType<FormSchemaItem[]>, default: () => [] },
    getOuaaClient: { type: Function as PropType<StreamEnginePageProps["getOuaaClient"]> },
  },
  setup(props) {
    const loading = ref(false);
    const available = ref<Choice[]>([]);
    const departments = ref<Choice[]>([]);
    let version = 0;
    const self = (): Record<string, unknown> => processObject(props.node.props?.selfSelect);
    const departmentSelection = (): Record<string, unknown> =>
      processObject(props.node.props?.[props.node.props?.assignedType === "DEP_POST" ? "deptPost" : "deptPosition"]);
    watch(
      () => props.node.id,
      () => {
        ensureAssignmentProps(props.node);
      },
      { immediate: true, flush: "sync" },
    );
    watch(
      () => [props.node.id, props.node.props?.assignedType, self().type, processObject(departmentSelection().dept).id],
      async () => {
        const current = ++version;
        available.value = [];
        const client = props.client;
        const type = String(props.node.props?.assignedType);
        const target = type === "SELF_SELECT" ? String(self().type) : type;
        if (!client || !["POST", "SINGLE_POST", "APPOINTMENT", "SINGLE_APPOINTMENT", "DEP_POST", "DEP_POSITION"].includes(target)) {
          loading.value = false;
          return;
        }
        loading.value = true;
        try {
          let rows: unknown[];
          if (["DEP_POST", "DEP_POSITION"].includes(target)) {
            if (!departments.value.length) {
              const result = choices(await client.listProcessDepartments());
              if (current !== version) return;
              departments.value = result;
            }
            const id = processObject(departmentSelection().dept).id;
            const result = id == null ? undefined : await client.getDepartmentAssignments(String(id));
            rows = (target === "DEP_POST" ? result?.postList : result?.positionList) ?? [];
          } else if (["POST", "SINGLE_POST"].includes(target)) rows = await client.listPositions();
          else rows = (await client.pageAppointments()).records;
          if (current === version) available.value = choices(rows);
        } catch (error) {
          if (current === version) message.error(error instanceof Error ? error.message : "组织选项加载失败");
        } finally {
          if (current === version) loading.value = false;
        }
      },
      { immediate: true },
    );

    const renderSelection = (value: unknown, update: (next: Choice[]) => void) => {
      const selected = asIdNameList(value);
      const options = [
        ...new Map([...selected, ...available.value].map((item) => [item.id, { label: item.name, value: item.id }])).values(),
      ];
      return (
        <Select
          mode="multiple"
          value={selected.map((item) => item.id)}
          options={options}
          loading={loading.value}
          style={selectStyle}
          placeholder="请选择"
          onUpdate:value={(next) => {
            update(
              (Array.isArray(next) ? next : []).map((id) => ({
                id: String(id),
                name: options.find((option) => option.value === String(id))?.label ?? String(id),
              })),
            );
          }}
        />
      );
    };

    return () => {
      const node = props.node;
      const settings = node.props ?? {};
      const type = String(settings.assignedType ?? "ASSIGN_USER");
      const key = ASSIGNMENT_FIELDS[type];
      const userFields = flattenFormItems(props.fields).filter((item) =>
        node.type === "CC" ? item.name === "UserPicker" : ["UserPicker", "TelPhone"].includes(String(item.name)),
      );
      const assignmentOptions = node.type === "CC" ? CC_ASSIGNMENT_OPTIONS : APPROVAL_ASSIGNMENT_OPTIONS;
      return (
        <>
          {node.type === "CC" ? (
            <FormItem label="发起人添加抄送人">
              <Checkbox
                checked={Boolean(settings.shouldAdd)}
                onUpdate:checked={(value) => {
                  settings.shouldAdd = value;
                }}
              />
            </FormItem>
          ) : null}
          <FormItem label={node.type === "CC" ? "抄送人类型" : "审批人类型"}>
            <Select
              value={type}
              options={assignmentOptions}
              style={selectStyle}
              onUpdate:value={(value) => {
                settings.assignedType = value;
              }}
            />
          </FormItem>
          {type === "ASSIGN_USER" ? (
            <FormItem label="指定人员">
              <UserPickerControl
                value={asIdNameList(settings.assignedUser)}
                getOuaaClient={props.getOuaaClient}
                multiple
                onUpdate:value={(value: Choice[]) => {
                  settings.assignedUser = value;
                }}
              />
            </FormItem>
          ) : null}
          {key && type !== "ASSIGN_USER" ? (
            <FormItem label={type === "ROLE" ? "指定角色" : ["POST", "SINGLE_POST"].includes(type) ? "指定职位" : "指定岗位"}>
              {type === "ROLE" ? (
                <ProcessRolePicker
                  value={asIdNameList(settings.role)}
                  client={props.client}
                  onUpdate:value={(value: Choice[]) => {
                    settings.role = value;
                  }}
                />
              ) : (
                renderSelection(settings[key], (value) => {
                  settings[key] = value;
                })
              )}
            </FormItem>
          ) : null}
          {type === "SELF_SELECT" ? (
            <>
              <FormItem label="选择范围">
                <Select
                  value={String(self().type ?? "ALL")}
                  options={[
                    { label: "全公司", value: "ALL" },
                    { label: "指定人员", value: "ASSIGN_USER" },
                    { label: "指定角色", value: "ROLE" },
                  ]}
                  style={selectStyle}
                  onUpdate:value={(value) => {
                    self().type = value;
                  }}
                />
              </FormItem>
              {self().type === "ASSIGN_USER" ? (
                <FormItem label="指定人员范围">
                  <UserPickerControl
                    value={asIdNameList(processObject(self().typeForSelectRange).ASSIGN_USER)}
                    getOuaaClient={props.getOuaaClient}
                    multiple
                    onUpdate:value={(value: Choice[]) => {
                      processObject(self().typeForSelectRange).ASSIGN_USER = value;
                    }}
                  />
                </FormItem>
              ) : null}
              {self().type === "ROLE" ? (
                <FormItem label="指定角色范围">
                  <ProcessRolePicker
                    value={asIdNameList(processObject(self().typeForSelectRange).ROLE)}
                    client={props.client}
                    onUpdate:value={(value: Choice[]) => {
                      processObject(self().typeForSelectRange).ROLE = value;
                    }}
                  />
                </FormItem>
              ) : null}
            </>
          ) : null}
          {type === "FORM_USER" ? (
            <FormItem label="表单人员项">
              <Select
                value={settings.formUser ? String(settings.formUser) : undefined}
                options={userFields.map((item) => ({ label: String(item.title), value: String(item.id) }))}
                placeholder="请选择表单人员项"
                style={selectStyle}
                onUpdate:value={(value) => {
                  settings.formUser = value;
                }}
              />
            </FormItem>
          ) : null}
          {["DEP_POST", "DEP_POSITION"].includes(type) ? (
            <>
              <FormItem label="部门">
                <Select
                  value={
                    processObject(departmentSelection().dept).id == null ? undefined : String(processObject(departmentSelection().dept).id)
                  }
                  options={departments.value.map((item) => ({ label: item.name, value: item.id }))}
                  loading={loading.value}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="请选择部门"
                  style={selectStyle}
                  onUpdate:value={(value) => {
                    departmentSelection().dept = departments.value.find((item) => item.id === String(value)) ?? null;
                    departmentSelection()[type === "DEP_POST" ? "post" : "position"] = [];
                  }}
                />
              </FormItem>
              <FormItem label={type === "DEP_POST" ? "岗位" : "职位"}>
                {renderSelection(departmentSelection()[type === "DEP_POST" ? "post" : "position"], (value) => {
                  departmentSelection()[type === "DEP_POST" ? "post" : "position"] = value;
                })}
              </FormItem>
            </>
          ) : null}
          {["LEADER", "LEADER_TOP"].includes(type) ? (
            <FormItem label="主管级别">
              <InputNumber
                min={1}
                max={20}
                value={Number(processObject(settings[type === "LEADER" ? "leader" : "leaderTop"]).level ?? 1)}
                onUpdate:value={(value) => {
                  const targetKey = type === "LEADER" ? "leader" : "leaderTop";
                  settings[targetKey] = { ...processObject(settings[targetKey]), level: value };
                }}
              />
            </FormItem>
          ) : null}
        </>
      );
    };
  },
});
