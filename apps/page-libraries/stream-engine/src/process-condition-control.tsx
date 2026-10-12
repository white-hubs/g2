import type { StreamEngineClient } from "@g2-client/stream-engine/client";
import { Input, InputNumber, Select, message } from "@g2-platform/pc-ui";
import { defineComponent, ref, watch, type PropType } from "vue";

import type { StreamEnginePageProps } from "./contract";
import { UserPickerControl } from "./form-controls";
import { normalizeSelectOptions } from "./form-options";
import { asIdNameList, type FormSchemaItem } from "./form-schema";
import {
  NUMERIC_CONDITION_OPTIONS,
  ORGANIZATION_CONDITION_OPTIONS,
  isNumericCondition,
  isRangeCondition,
  type ProcessCondition,
} from "./process-conditions";
import { processObject } from "./process-design";
import ProcessRolePicker from "./process-role-picker";

type Choice = { id: string; name: string };
const fullWidth = { width: "100%" };
const organizationTypes = ORGANIZATION_CONDITION_OPTIONS.map((option) => option.value);

function namedChoices(rows: unknown[]): Choice[] {
  return rows.flatMap((row) => {
    const value = processObject(row);
    const id = value.id ?? value.code;
    return id == null ? [] : [{ id: String(id), name: String(value.name ?? value.positionName ?? value.typeName ?? value.label ?? id) }];
  });
}

export default defineComponent({
  name: "ProcessConditionControl",
  props: {
    condition: { type: Object as PropType<ProcessCondition>, required: true },
    field: { type: Object as PropType<FormSchemaItem> },
    client: { type: Object as PropType<StreamEngineClient> },
    publicForm: { type: Boolean, default: false },
    getOuaaClient: { type: Function as PropType<StreamEnginePageProps["getOuaaClient"]> },
  },
  setup(props) {
    const loading = ref(false);
    const choices = ref<Choice[]>([]);
    let version = 0;
    watch(
      () => [props.condition.id, props.condition.valueType, props.field?.name, props.client],
      async () => {
        const current = ++version;
        choices.value = [];
        const client = props.client;
        const type = props.condition.valueType;
        const fieldName = props.field?.name;
        if (
          !client ||
          (!["Dept", "FormDept", "deptList", "Post"].includes(type ?? "") &&
            !["FaultTypeSelect", "ProblemTypeSelect"].includes(fieldName ?? ""))
        ) {
          loading.value = false;
          return;
        }
        loading.value = true;
        try {
          const rows =
            type === "Post"
              ? await client.listPositions()
              : ["Dept", "FormDept", "deptList"].includes(type ?? "")
                ? await client.listProcessDepartments()
                : fieldName === "FaultTypeSelect"
                  ? await client.listFaultTypes("FAULT")
                  : await client.listHiddenDangerTypes();
          if (current === version) choices.value = namedChoices(rows);
        } catch (error) {
          if (current === version) message.error(error instanceof Error ? error.message : "条件选项加载失败");
        } finally {
          if (current === version) loading.value = false;
        }
      },
      { immediate: true },
    );
    watch(
      () => props.publicForm,
      (enabled) => {
        if (!enabled && props.condition.valueType === "OutSider") {
          props.condition.valueType = "User";
          props.condition.value = [];
        }
      },
      { immediate: true },
    );

    const renderOrganization = () => {
      const condition = props.condition;
      const selected = asIdNameList(condition.value);
      const options = [...new Map([...selected, ...choices.value].map((item) => [item.id, { label: item.name, value: item.id }])).values()];
      return (
        <Select
          mode="multiple"
          value={selected.map((item) => item.id)}
          options={options}
          loading={loading.value}
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="请选择"
          style={fullWidth}
          onUpdate:value={(value) => {
            condition.value = (Array.isArray(value) ? value : []).map((id) => ({
              id: String(id),
              name: options.find((option) => option.value === String(id))?.label ?? String(id),
            }));
          }}
        />
      );
    };
    const renderNumber = (index: number) => {
      const condition = props.condition;
      const duration = ["VacationLength", "OvertimeLength", "DepartureTimeLength"].includes(condition.name ?? "");
      return (
        <InputNumber
          value={condition.value[index] == null ? undefined : Number(condition.value[index])}
          precision={duration ? 2 : undefined}
          min={duration ? (index === 1 ? Number(condition.value[0] ?? 0) : 0) : undefined}
          max={
            duration
              ? index === 0 && isRangeCondition(condition.compare) && condition.value[1] != null
                ? Number(condition.value[1])
                : 999.99
              : undefined
          }
          placeholder={isRangeCondition(condition.compare) ? (index === 0 ? "下限" : "上限") : "输入比较值"}
          style={{ width: "100%", minWidth: "0" }}
          onUpdate:value={(value) => {
            const next = [...condition.value];
            next[index] = value;
            condition.value = next;
          }}
        />
      );
    };

    return () => {
      const condition = props.condition;
      const type = condition.valueType;
      if (organizationTypes.includes(type ?? "") || ["getStaffList", "FormDept", "deptList"].includes(type ?? ""))
        return (
          <div style={{ display: "grid", gap: "8px" }}>
            {organizationTypes.includes(type ?? "") ? (
              <Select
                aria-label="组织条件类型"
                value={type}
                options={ORGANIZATION_CONDITION_OPTIONS.map((option) => ({
                  ...option,
                  disabled: option.value === "OutSider" && !props.publicForm,
                }))}
                style={fullWidth}
                onUpdate:value={(value) => {
                  condition.valueType = String(value);
                  condition.value = value === "OutSider" ? ["outsider"] : [];
                }}
              />
            ) : null}
            {["User", "getStaffList"].includes(type ?? "") ? (
              <UserPickerControl
                value={asIdNameList(condition.value)}
                getOuaaClient={props.getOuaaClient}
                multiple
                onUpdate:value={(value: Choice[]) => {
                  condition.value = value;
                }}
              />
            ) : type === "Role" ? (
              <ProcessRolePicker
                value={asIdNameList(condition.value)}
                client={props.client}
                onUpdate:value={(value: Choice[]) => {
                  condition.value = value;
                }}
              />
            ) : type === "OutSider" ? null : (
              renderOrganization()
            )}
          </div>
        );
      const numeric = isNumericCondition(condition);
      const configured = normalizeSelectOptions(props.field?.props?.options);
      const businessChoices = ["FaultTypeSelect", "ProblemTypeSelect"].includes(props.field?.name ?? "");
      const options = businessChoices ? choices.value.map((item) => ({ label: item.name, value: item.id })) : configured;
      const selectedBusiness = asIdNameList(condition.value);
      const completeOptions = businessChoices
        ? [
            ...new Map(
              [...selectedBusiness.map((item) => ({ label: item.name, value: item.id })), ...options].map((option) => [
                String(option.value),
                option,
              ]),
            ).values(),
          ]
        : options;
      return (
        <div style={{ display: "grid", gap: "8px" }}>
          <Select
            aria-label="判断符"
            value={condition.compare || undefined}
            options={
              numeric
                ? NUMERIC_CONDITION_OPTIONS
                : [
                    { label: "等于", value: "=" },
                    { label: "属于", value: "IN" },
                  ]
            }
            style={fullWidth}
            onUpdate:value={(value) => {
              condition.compare = String(value);
              condition.value = [];
            }}
          />
          {numeric ? (
            condition.compare === "IN" ? (
              <Select
                mode="tags"
                value={condition.value.map(String)}
                placeholder="输入可能包含的值"
                style={fullWidth}
                onUpdate:value={(value) => {
                  condition.value = Array.isArray(value) ? value : [];
                }}
              />
            ) : isRangeCondition(condition.compare) ? (
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 14px minmax(0, 1fr)", gap: "4px", alignItems: "center" }}>
                {renderNumber(0)}
                <span>至</span>
                {renderNumber(1)}
              </div>
            ) : (
              renderNumber(0)
            )
          ) : completeOptions.length || businessChoices || ["SelectInput", "MultipleSelect"].includes(props.field?.name ?? "") ? (
            <Select
              mode={condition.compare === "IN" ? "multiple" : undefined}
              value={
                condition.compare === "IN"
                  ? businessChoices
                    ? selectedBusiness.map((item) => item.id)
                    : condition.value.map(String)
                  : businessChoices
                    ? selectedBusiness[0]?.id
                    : condition.value[0] == null
                      ? undefined
                      : String(condition.value[0])
              }
              options={completeOptions}
              loading={loading.value}
              allowClear
              placeholder="选择值"
              style={fullWidth}
              onUpdate:value={(value) => {
                const values = Array.isArray(value) ? value : value == null ? [] : [value];
                condition.value = businessChoices
                  ? values.map((id) => ({
                      id: String(id),
                      name: completeOptions.find((option) => String(option.value) === String(id))?.label ?? String(id),
                    }))
                  : values;
              }}
            />
          ) : condition.compare === "IN" ? (
            <Select
              mode="tags"
              value={condition.value.map(String)}
              placeholder="输入可能包含的值"
              style={fullWidth}
              onUpdate:value={(value) => {
                condition.value = Array.isArray(value) ? value : [];
              }}
            />
          ) : (
            <Input
              value={String(condition.value[0] ?? "")}
              placeholder="输入比较值"
              onUpdate:value={(value: string) => {
                condition.value = value ? [value] : [];
              }}
            />
          )}
        </div>
      );
    };
  },
});
