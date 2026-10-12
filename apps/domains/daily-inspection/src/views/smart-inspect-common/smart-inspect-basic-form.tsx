// @ts-nocheck -- 对齐旧仓 smart-inspect-basic-form：负责人选择、周期、时限、开始时间禁选过去。
import type { InspectionRecord } from "@g2-contract/daily-inspection";
import { computed, defineComponent, reactive, ref, watch, type PropType } from "vue";

import { CubeSelect, InspectLevelSelect, PersonLiableSelect, PlanNameInput, TaskCreateCycle, TaskTimeLimit } from "@/compat/app-design";
import { executeCycleOptions, formatDisplayTime, formatLimitTimeJson, weekCycleOptions } from "@/compat/constants";
import dayjs, { type Dayjs } from "@/compat/dayjs";
import { getDailyInspectionClient } from "@/domain-context";
import { Col, DatePicker, Form, FormItem, Row, Textarea, type FormInstance } from "@/pc-ui-runtime";

import styles from "./smart-inspect-page.module.css";

type FormMode = "plan" | "task";

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string")
    return value
      ? value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  return [];
}

function splitIds(value: unknown): string[] {
  return toArray(value);
}

function normalizeDateTime(value: unknown): string | null {
  if (value == null || value === "") return null;
  const parsed = dayjs(value as string | number | Date);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD HH:mm:ss") : null;
}

function getCycleText(formState: Record<string, unknown>): string {
  if (!formState.cycle) return "立即执行";
  const executeOption = executeCycleOptions.find((item) => item.value === formState.cycleType);
  if (!executeOption) return "立即执行";
  let cronJson: Record<string, unknown> | null = null;
  if (typeof formState.cronName === "string") {
    try {
      cronJson = JSON.parse(formState.cronName) as Record<string, unknown>;
    } catch {
      cronJson = null;
    }
  }
  const selectionSource = formState.selection || cronJson?.selection;
  const selection = Array.isArray(selectionSource)
    ? selectionSource.map(String)
    : String(selectionSource || "")
        .split(",")
        .filter(Boolean);
  const hour = String(formState.hour || "12:00");
  if (executeOption.value === "EVERY_WEEK") {
    const labels = weekCycleOptions
      .filter((item) => selection.includes(item.value))
      .map((item) => item.label)
      .join(",");
    return `${executeOption.label}：${labels || "--"}：${hour}`;
  }
  if (executeOption.value === "EVERY_MONTH") {
    return `${executeOption.label}：${selection.join(",") || "--"}号：${hour}`;
  }
  return `${executeOption.label}：${hour}`;
}

export const SmartInspectBasicForm = defineComponent({
  name: "SmartInspectBasicForm",
  props: {
    initFormState: { type: Object as PropType<InspectionRecord>, default: () => ({}) },
    mode: { type: String as PropType<FormMode>, default: "plan" },
    readonly: { type: Boolean, default: false },
  },
  setup(props, { expose }) {
    const formRef = ref<FormInstance>();
    const state = reactive<{ formState: Record<string, unknown> }>({
      formState: {
        name: "",
        cycle: false,
        typeId: null,
        receiveType: "1",
        receiveIds: [],
        receiveDeptIds: null,
        receivePostIds: null,
        receiveRoleIds: null,
        limitTimeJson: "",
        level: "GENERAL",
        beginTime: null as string | null,
        endTime: null as string | null,
        cronId: null,
        cycleType: null,
        hour: "12:00",
        selection: null,
        remark: "",
      },
    });

    const disabledDate = (current: Dayjs): boolean => current && current < dayjs().endOf("day").add(-1, "day");
    const range = (start: number, end: number): number[] => {
      const result: number[] = [];
      for (let i = start; i < end; i += 1) result.push(i);
      return result;
    };
    const disabledTime = (current: Dayjs) => {
      if (!current) return {};
      if (dayjs(current).format("YYYY-MM-DD") === dayjs().format("YYYY-MM-DD")) {
        const now = dayjs();
        return {
          disabledHours: () => range(0, now.hour()),
          disabledMinutes: () => (current.hour() === now.hour() ? range(0, now.minute()) : []),
          disabledSeconds: () => (current.hour() === now.hour() && current.minute() === now.minute() ? range(0, now.second()) : []),
        };
      }
      return {};
    };

    const sync = (): void => {
      const source = props.initFormState ?? {};
      if (!Object.keys(source).length) return;
      Object.assign(state.formState, {
        ...source,
        name: String(source.name ?? source.planName ?? source.taskName ?? ""),
        typeId: source.typeId ?? source.inspectTypeId ?? null,
        level: source.level ?? "GENERAL",
        receiveType: String(source.receiveType ?? "1"),
        receiveIds: splitIds(source.receiveIds),
        receiveDeptIds: source.receiveDeptIds == null || source.receiveDeptIds === "" ? null : source.receiveDeptIds,
        receivePostIds: splitIds(source.receivePostIds),
        receiveRoleIds: splitIds(source.receiveRoleIds),
        limitTimeJson: source.limitTimeJson ?? "",
        beginTime: normalizeDateTime(source.beginTime ?? source.validBeginTime),
        endTime: normalizeDateTime(source.endTime ?? source.validEndTime),
        remark: String(source.remark ?? ""),
        cycle: Boolean(source.cycle),
        cronId: source.cronId ?? null,
        cycleType: source.cycleType ?? null,
        hour: source.hour ?? "12:00",
        selection: source.selection ?? null,
        cronName: source.cronName,
        receiveNames: source.receiveNames,
        typeName: source.typeName,
      });
    };

    watch(() => props.initFormState, sync, { immediate: true, deep: true });

    const nameLabel = computed(() => (props.mode === "plan" ? "计划名称" : "任务名称"));
    const beginLabel = computed(() => (props.mode === "plan" ? "计划开始时间" : "任务开始时间"));
    const endLabel = computed(() => (props.mode === "plan" ? "计划结束时间" : "任务结束时间"));
    const limitLabel = computed(() => (props.mode === "plan" ? "任务时限" : "任务有效期"));

    const rules = computed(() => ({
      name: [
        { required: true, message: `请输入${nameLabel.value}` },
        { message: "名称不超过32个字", pattern: /^.{1,32}$/ },
      ],
      beginTime:
        props.mode === "plan"
          ? [
              { required: true, message: `请选择${beginLabel.value}` },
              {
                validator: async (_rule: unknown, value: unknown) => {
                  if (state.formState.endTime && String(state.formState.endTime) < String(value ?? "")) {
                    return Promise.reject(new Error("开始时间不能大于结束时间"));
                  }
                  return Promise.resolve();
                },
              },
            ]
          : [],
      endTime: [
        {
          validator: async (_rule: unknown, value: unknown) => {
            if (!value) return Promise.resolve();
            if (state.formState.beginTime && String(state.formState.beginTime) > String(value)) {
              return Promise.reject(new Error("结束时间不能小于开始时间"));
            }
            return Promise.resolve();
          },
        },
      ],
      level: [{ required: true, message: "请选择巡检级别" }],
      typeId: [{ required: true, message: "请选择巡检类型", trigger: "blur" }],
      receiveType: [
        { required: true, message: "请选择负责人" },
        {
          validator: async (_rule: unknown, value: unknown) => {
            if (value === "1" && !toArray(state.formState.receiveIds).length) {
              return Promise.reject(new Error("请选择负责人"));
            }
            if (value === "2" && !state.formState.receiveDeptIds && !state.formState.receivePostIds && !state.formState.receiveRoleIds) {
              return Promise.reject(new Error("请选择负责人部门"));
            }
            return Promise.resolve();
          },
        },
      ],
      cycle: [
        {
          validator: async (_rule: unknown, value: boolean) => {
            if (props.mode !== "plan" || !value) return Promise.resolve();
            if (!state.formState.cronId) return Promise.reject(new Error("请选择循环周期"));
            if (state.formState.cronId === "custom") {
              if (!state.formState.cycleType) return Promise.reject(new Error("请选择自定义执行周期"));
              if (!state.formState.selection) return Promise.reject(new Error("请选择自定义执行周期时间"));
              if (!state.formState.hour) return Promise.reject(new Error("请选择自定义执行周期小时"));
            }
            return Promise.resolve();
          },
        },
      ],
      limitTimeJson: [{ required: true, message: `请填写${limitLabel.value}` }],
    }));

    const handleSubmit = async (): Promise<InspectionRecord> => {
      await formRef.value?.validate();
      return {
        ...state.formState,
        name: String(state.formState.name ?? "").trim(),
        receiveIds: toArray(state.formState.receiveIds),
        beginTime: state.formState.beginTime || undefined,
        endTime: state.formState.endTime || undefined,
      } as InspectionRecord;
    };

    expose({
      handleSubmit,
      getFormState: () => state.formState,
      setFormValues: (values: InspectionRecord) => Object.assign(state.formState, values),
    });

    if (props.readonly) {
      return () => {
        const fields = [
          { label: nameLabel.value, value: state.formState.name },
          { label: "巡检类型", value: state.formState.typeName ?? state.formState.typeId },
          { label: "巡检级别", value: String(state.formState.level) === "URGENT" ? "紧急" : "普通" },
          { label: "负责人", value: state.formState.receiveNames ?? toArray(state.formState.receiveIds).join(",") },
          ...(props.mode === "plan"
            ? [
                { label: beginLabel.value, value: formatDisplayTime(state.formState.beginTime) },
                { label: endLabel.value, value: formatDisplayTime(state.formState.endTime) },
                { label: "周期巡检", value: getCycleText(state.formState) },
              ]
            : []),
          { label: limitLabel.value, value: formatLimitTimeJson(state.formState.limitTimeJson) },
          { label: "备注", value: state.formState.remark },
        ];
        return (
          <dl class={styles["detail-grid"]}>
            {fields.map((field) => (
              <div class={styles["detail-item"]} key={field.label}>
                <dt>{field.label}</dt>
                <dd>{String(field.value ?? "--") || "--"}</dd>
              </div>
            ))}
          </dl>
        );
      };
    }

    const bind = (fieldName: string) => ({
      value: state.formState[fieldName],
      "onUpdate:value": (val: unknown) => {
        state.formState[fieldName] = val;
      },
    });

    return () => (
      <Form ref={formRef} model={state.formState} rules={rules.value} labelCol={{ style: { width: "120px" } }}>
        <Row gutter={24}>
          <Col span={12}>
            <FormItem label={nameLabel.value} name="name">
              <PlanNameInput
                {...bind("name")}
                checkNameApi={async (params: unknown) => {
                  const payload = params as { planName: string };
                  return getDailyInspectionClient().checkPlanNameRepeat({ planName: payload.planName });
                }}
              />
            </FormItem>
          </Col>
          {props.mode === "plan" ? (
            <Col span={12}>
              <FormItem label={beginLabel.value} name="beginTime">
                <DatePicker
                  {...bind("beginTime")}
                  disabledDate={disabledDate}
                  disabledTime={disabledTime}
                  showTime={{ format: "HH:mm:ss" }}
                  format="YYYY-MM-DD HH:mm:ss"
                  valueFormat="YYYY-MM-DD HH:mm:ss"
                  style={{ width: "100%" }}
                  placeholder={`请选择${beginLabel.value}`}
                />
              </FormItem>
            </Col>
          ) : null}
          {props.mode === "plan" ? (
            <Col span={12}>
              <FormItem label={endLabel.value} name="endTime">
                <DatePicker
                  {...bind("endTime")}
                  showTime={{ format: "HH:mm:ss" }}
                  format="YYYY-MM-DD HH:mm:ss"
                  valueFormat="YYYY-MM-DD HH:mm:ss"
                  style={{ width: "100%" }}
                  placeholder={`请选择${endLabel.value}`}
                />
              </FormItem>
            </Col>
          ) : null}
          <Col span={12}>
            <FormItem label="巡检级别" name="level">
              <InspectLevelSelect {...bind("level")} />
            </FormItem>
          </Col>
          <Col span={12}>
            <FormItem label="巡检类型" name="typeId">
              <CubeSelect {...bind("typeId")} optionsFetchApi={async () => getDailyInspectionClient().listTypes()} />
            </FormItem>
          </Col>
          <Col span={12}>
            <FormItem label={limitLabel.value} name="limitTimeJson">
              <TaskTimeLimit {...bind("limitTimeJson")} />
            </FormItem>
          </Col>
          <Col span={24}>
            <FormItem label="负责人" name="receiveType">
              <PersonLiableSelect
                value={state.formState.receiveType}
                receiveIds={state.formState.receiveIds}
                receiveDeptIds={state.formState.receiveDeptIds}
                receivePostIds={state.formState.receivePostIds}
                receiveRoleIds={state.formState.receiveRoleIds}
                treeDefaultExpandAll
                onUpdate:value={(val: unknown) => {
                  state.formState.receiveType = val;
                  state.formState.receiveIds = [];
                  state.formState.receiveDeptIds = null;
                  state.formState.receivePostIds = [];
                  state.formState.receiveRoleIds = [];
                }}
                onUpdate:receiveIds={(val: unknown) => {
                  state.formState.receiveIds = val;
                }}
                onUpdate:receiveDeptIds={(val: unknown) => {
                  state.formState.receiveDeptIds = val;
                }}
                onUpdate:receivePostIds={(val: unknown) => {
                  state.formState.receivePostIds = val;
                }}
                onUpdate:receiveRoleIds={(val: unknown) => {
                  state.formState.receiveRoleIds = val;
                }}
              />
            </FormItem>
          </Col>
          {props.mode === "plan" ? (
            <Col span={24}>
              <FormItem label="周期巡检" name="cycle">
                <TaskCreateCycle
                  {...bind("cycle")}
                  cycleOptionsApi={async () => getDailyInspectionClient().listPeriods()}
                  cronId={state.formState.cronId}
                  cycleType={state.formState.cycleType}
                  hour={state.formState.hour}
                  selection={state.formState.selection}
                  onUpdate:cronId={(val: unknown) => {
                    state.formState.cronId = val;
                  }}
                  onUpdate:cycleType={(val: unknown) => {
                    state.formState.cycleType = val;
                  }}
                  onUpdate:hour={(val: unknown) => {
                    state.formState.hour = val;
                  }}
                  onUpdate:selection={(val: unknown) => {
                    state.formState.selection = val;
                  }}
                />
              </FormItem>
            </Col>
          ) : null}
          <Col span={24}>
            <FormItem label="备注" name="remark">
              <Textarea {...bind("remark")} rows={4} maxlength={500} showCount placeholder="请输入备注" />
            </FormItem>
          </Col>
        </Row>
      </Form>
    );
  },
});
