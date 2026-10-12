// @ts-nocheck -- 从 cube daily-inspection inspect-plan-edit/basic-info 迁入。
import { defineComponent, reactive, ref, watch, type VNode } from "vue";
import { useRoute } from "vue-router";

import { executeCycleOptions, weekCycleOptions } from "./constants";
import {
  CubeSelect,
  InspectLevelSelect,
  PersonLiableSelect,
  PersonLiableSelectCheck,
  PlanNameInput,
  TaskCreateCycle,
  TaskTimeLimit,
} from "@/compat/app-design";
import dayjs, { type Dayjs } from "@/compat/dayjs";
import { getDailyInspectionClient } from "@/domain-context";
import { Col, DatePicker, Form, FormItem, type FormInstance, Row, Switch, Textarea } from "@/pc-ui-runtime";

import styles from "./basic-info.module.css";

function splitIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.trim())
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  return [];
}

export const BasicInfo = defineComponent({
  props: {
    initFormState: {
      type: Object,
      default: () => ({}),
    },
  },
  setup: (props, { expose }) => {
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
        checkUserType: "1",
        checkUserIds: [],
        checkRoleIds: null,
        checkPostIds: null,
        checkDeptIds: null,
        limitTimeJson: "",
        level: "GENERAL",
        method: "",
        isCheck: false,
        beginTime: null,
        endTime: null,
        cronId: null,
        cycleType: null,
        hour: "12:00",
        selection: null,
        remark: "",
      },
    });

    const route = useRoute();
    // 对齐旧仓：过去日期不可选；当天禁用当前时刻之前的时分秒
    const disabledDate = (current: Dayjs): boolean => current && current < dayjs().endOf("day").add(-1, "day");
    const range = (start: number, end: number): number[] => {
      // 生成禁用范围数组
      const result = [];
      for (let i = start; i < end; i++) result.push(i);
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

    const checkUserSchema = {
      fieldName: "checkUserType",
      label: "核查人",
      span: 24,
      FormComponent: (fieldProps: Record<string, unknown>): JSX.Element => <PersonLiableSelectCheck {...fieldProps} treeDefaultExpandAll />,
      customRender: (formState: Record<string, unknown>): JSX.Element => <span>{formState.checkUserNames || "--"}</span>,
    };

    const formSchema = ref([
      {
        fieldName: "name",
        label: "计划名称",
        FormComponent: (fieldProps: Record<string, unknown>): JSX.Element => (
          <PlanNameInput
            {...fieldProps}
            checkNameApi={async (params: unknown) => {
              const payload = params as { planName: string };
              return getDailyInspectionClient().checkPlanNameRepeat({ planName: payload.planName });
            }}
          />
        ),
      },
      {
        fieldName: "beginTime",
        label: "计划开始时间",
        FormComponent: (fieldProps: Record<string, unknown>): JSX.Element => (
          <DatePicker
            disabledTime={disabledTime}
            {...fieldProps}
            disabledDate={disabledDate}
            showTime={{ format: "HH:mm:ss" }}
            format="YYYY-MM-DD HH:mm:ss"
            valueFormat="YYYY-MM-DD HH:mm:ss"
            style={{ width: "100%" }}
          />
        ),
      },
      {
        fieldName: "endTime",
        label: "计划结束时间",
        FormComponent: (fieldProps: Record<string, unknown>): JSX.Element => (
          <DatePicker
            {...fieldProps}
            showTime={{ format: "HH:mm:ss" }}
            format="YYYY-MM-DD HH:mm:ss"
            valueFormat="YYYY-MM-DD HH:mm:ss"
            style={{ width: "100%" }}
          />
        ),
      },
      {
        fieldName: "level",
        label: "巡检级别",
        FormComponent: (fieldProps: Record<string, unknown>): JSX.Element => <InspectLevelSelect {...fieldProps} />,
        customRender: (formState: Record<string, unknown>): JSX.Element => (
          <span>{formState.level ? (formState.level === "URGENT" ? "紧急" : "普通") : "--"}</span>
        ),
      },
      {
        fieldName: "typeId",
        label: "巡检类型",
        FormComponent: (fieldProps: Record<string, unknown>): JSX.Element => (
          <CubeSelect {...fieldProps} optionsFetchApi={async () => getDailyInspectionClient().listTypes()} />
        ),
        customRender: (formState: Record<string, unknown>): JSX.Element => <span>{formState.typeName || "--"}</span>,
      },
      {
        fieldName: "receiveType",
        label: "负责人",
        span: 24,
        FormComponent: (fieldProps: Record<string, unknown>): JSX.Element => <PersonLiableSelect {...fieldProps} treeDefaultExpandAll />,
        customRender: (formState: Record<string, unknown>): JSX.Element => <span>{formState.receiveNames || "--"}</span>,
      },
      {
        fieldName: "isCheck",
        label: "是否需要核查",
        FormComponent: (fieldProps: Record<string, unknown>): JSX.Element => (
          <Switch
            checked={Boolean(fieldProps.value)}
            onUpdate:checked={(val: boolean) => (fieldProps["onUpdate:value"] as (v: unknown) => void)?.(val)}
          />
        ),
        customRender: (formState: Record<string, unknown>): JSX.Element => <span>{formState.isCheck ? "是" : "否"}</span>,
      },
      {
        fieldName: "method",
        label: "扫码核查",
        FormComponent: (fieldProps: Record<string, unknown>): JSX.Element => (
          <Switch
            checked={fieldProps.value === "SCAN_CODE"}
            onUpdate:checked={(val: boolean) => (fieldProps["onUpdate:value"] as (v: unknown) => void)?.(val ? "SCAN_CODE" : "")}
          />
        ),
        customRender: (formState: Record<string, unknown>): JSX.Element => <span>{formState.method ? "是" : "否"}</span>,
      },
      {
        fieldName: "limitTimeJson",
        label: "任务时效",
        span: 24,
        FormComponent: (fieldProps: Record<string, unknown>): JSX.Element => <TaskTimeLimit {...fieldProps} />,
        customRender: (formState: Record<string, unknown>): JSX.Element | string => {
          if (!formState.limitTimeJson) return "--";
          const limitTime = JSON.parse(formState.limitTimeJson as string);
          return (
            <span>
              {limitTime.day}天{limitTime.hour}小时{limitTime.minute}分钟
            </span>
          );
        },
      },
      {
        fieldName: "cycle",
        label: "循环核查",
        span: 24,
        FormComponent: (fieldProps: Record<string, unknown>): JSX.Element => (
          <TaskCreateCycle {...fieldProps} cycleOptionsApi={async () => getDailyInspectionClient().listPeriods()} />
        ),
        customRender: (formState: Record<string, unknown>): JSX.Element => {
          if (!formState.cycle) return <span>立即执行</span>;
          const executeOption = executeCycleOptions.find((item) => item.value === formState.cycleType);
          if (!executeOption) return <span>立即执行</span>;
          const cornJson = formState.cronName ? JSON.parse(formState.cronName as string) : null;
          if (!cornJson) return <span>立即执行</span>;
          const selection = String(cornJson.selection ?? "").split(",");
          if (executeOption.value === "EVERY_WEEK" && Array.isArray(selection)) {
            const executeSelection = weekCycleOptions
              .filter((item) => selection.includes(item.value))
              .map((item) => item.label)
              .join(",");
            return (
              <span>
                {executeOption.label}：{executeSelection}：{formState.hour}{" "}
              </span>
            );
          }
          if (executeOption.value === "EVERY_MONTH" && Array.isArray(selection)) {
            return (
              <span>
                {executeOption.label}：{selection.join(",")}号：{formState.hour}
              </span>
            );
          }
          return (
            <span>
              {executeOption.label}:{formState.hour}
            </span>
          );
        },
      },
      {
        fieldName: "remark",
        label: "备注",
        span: 24,
        FormComponent: (fieldProps: Record<string, unknown>): JSX.Element => <Textarea {...fieldProps} rows={3} />,
        customRender: (formState: Record<string, unknown>): JSX.Element => <span>{formState.remark || "--"}</span>,
      },
      checkUserSchema,
    ]);

    const getFormSchema = () => formSchema.value.filter((item) => item.fieldName !== "checkUserType" || Boolean(state.formState.isCheck));

    const rules = {
      name: [
        { required: true, message: "请输入计划名称" },
        { message: "名称不超过32个字", pattern: /^.{1,32}$/ },
      ],
      beginTime: [
        { required: true, message: "请选择计划开始时间" },
        {
          validator: async (_rule: unknown, value: unknown) => {
            if (state.formState.endTime && (state.formState.endTime as string) < (value as string)) {
              return Promise.reject(new Error("计划开始时间不能大于计划结束时间"));
            }
            return Promise.resolve();
          },
        },
      ],
      endTime: [
        {
          validator: async (_rule: unknown, value: unknown) => {
            if (!value) return Promise.resolve();
            if (state.formState.beginTime && (state.formState.beginTime as string) > (value as string)) {
              return Promise.reject(new Error("计划结束时间不能小于计划开始时间"));
            }
            return Promise.resolve();
          },
        },
      ],
      level: [{ required: true, message: "请选择巡检级别" }],
      receiveType: [
        { required: true, message: "请选择负责人" },
        {
          validator: async (_rule: unknown, value: unknown) => {
            if (value === "1" && !(state.formState.receiveIds as string[])?.length) {
              return Promise.reject(new Error("请选择负责人"));
            }
            if (value === "2") {
              if (!state.formState.receiveDeptIds && !state.formState.receivePostIds && !state.formState.receiveRoleIds) {
                return Promise.reject(new Error("请选择负责人部门"));
              }
            }
            return Promise.resolve();
          },
        },
      ],
      checkUserType: [
        { required: true, message: "请选择核查人" },
        {
          validator: async (_rule: unknown, value: unknown) => {
            if (value === "1" && !(state.formState.checkUserIds as string[])?.length) {
              return Promise.reject(new Error("请选择核查人"));
            }
            if (value === "2") {
              if (!state.formState.checkRoleIds && !state.formState.checkPostIds && !state.formState.checkDeptIds) {
                return Promise.reject(new Error("请选择核查人部门"));
              }
            }
            return Promise.resolve();
          },
        },
      ],
      cycle: [
        {
          validator: async (_rule: unknown, value: boolean) => {
            if (value) {
              if (!state.formState.cronId) return Promise.reject(new Error("请选择循环周期"));
              if (state.formState.cronId === "custom") {
                if (!state.formState.cycleType) return Promise.reject(new Error("请选择自定义执行周期"));
                if (!state.formState.selection) return Promise.reject(new Error("请选择自定义执行周期时间"));
                if (!state.formState.hour) return Promise.reject(new Error("请选择自定义执行周期小时"));
              }
            }
            return Promise.resolve();
          },
        },
      ],
      typeId: [{ required: true, message: "请选择巡检类型", trigger: "blur" }],
      limitTimeJson: [{ required: true, message: "请填写任务时效" }],
    };

    const bindFieldProps = (fieldName: string) => ({
      value: state.formState[fieldName],
      "onUpdate:value": (val: unknown) => {
        state.formState[fieldName] = val;
      },
      receiveIds: state.formState.receiveIds,
      "onUpdate:receiveIds": (val: unknown) => {
        state.formState.receiveIds = val;
      },
      receiveDeptIds: state.formState.receiveDeptIds,
      "onUpdate:receiveDeptIds": (val: unknown) => {
        state.formState.receiveDeptIds = val;
      },
      receivePostIds: state.formState.receivePostIds,
      "onUpdate:receivePostIds": (val: unknown) => {
        state.formState.receivePostIds = val;
      },
      receiveRoleIds: state.formState.receiveRoleIds,
      "onUpdate:receiveRoleIds": (val: unknown) => {
        state.formState.receiveRoleIds = val;
      },
      checkUserIds: state.formState.checkUserIds,
      "onUpdate:checkUserIds": (val: unknown) => {
        state.formState.checkUserIds = val;
      },
      checkPostIds: state.formState.checkPostIds,
      "onUpdate:checkPostIds": (val: unknown) => {
        state.formState.checkPostIds = val;
      },
      checkDeptIds: state.formState.checkDeptIds,
      "onUpdate:checkDeptIds": (val: unknown) => {
        state.formState.checkDeptIds = val;
      },
      checkRoleIds: state.formState.checkRoleIds,
      "onUpdate:checkRoleIds": (val: unknown) => {
        state.formState.checkRoleIds = val;
      },
      cronId: state.formState.cronId,
      "onUpdate:cronId": (val: unknown) => {
        state.formState.cronId = val;
      },
      cycleType: state.formState.cycleType,
      "onUpdate:cycleType": (val: unknown) => {
        state.formState.cycleType = val;
      },
      selection: state.formState.selection,
      "onUpdate:selection": (val: unknown) => {
        state.formState.selection = val;
      },
      hour: state.formState.hour,
      "onUpdate:hour": (val: unknown) => {
        state.formState.hour = val;
      },
    });

    const EditForm = (formProps: { span?: number }): JSX.Element => (
      <Form ref={formRef} model={state.formState} rules={rules} layout="inline" labelCol={{ style: { width: "120px" } }}>
        <Row gutter={[12, 12]} style={{ width: "100%" }}>
          {getFormSchema().map((item) => {
            const isFullRow = item.span === 24;
            const isPersonField = item.fieldName === "receiveType" || item.fieldName === "checkUserType";
            return (
              <Col
                key={item.fieldName}
                xxl={item.span || formProps.span || 8}
                xl={isFullRow ? 24 : 12}
                lg={isFullRow ? 24 : 12}
                md={24}
                sm={24}
                xs={24}
              >
                <FormItem
                  label={item.label}
                  name={item.fieldName}
                  style={{ display: "flex", alignItems: "flex-start", flexWrap: "nowrap" }}
                >
                  {isPersonField ? (
                    <div class={styles.personSelectWrap}>{item.FormComponent(bindFieldProps(item.fieldName))}</div>
                  ) : (
                    item.FormComponent(bindFieldProps(item.fieldName))
                  )}
                </FormItem>
              </Col>
            );
          })}
        </Row>
      </Form>
    );

    const handleSubmit = async (): Promise<Record<string, unknown>> => {
      await formRef.value?.validate();
      return state.formState;
    };

    watch(
      () => props.initFormState,
      () => {
        if (Object.keys(props.initFormState).length > 0) {
          let cornJson: Record<string, unknown> = {};
          if (props.initFormState.cronName) {
            if (typeof props.initFormState.cronName === "string") {
              try {
                const parsedCron = JSON.parse(props.initFormState.cronName);
                if (typeof parsedCron === "object" && parsedCron !== null) cornJson = parsedCron;
              } catch {
                /* cronName 为普通字符串时不做额外处理 */
              }
            } else if (typeof props.initFormState.cronName === "object") {
              cornJson = props.initFormState.cronName as Record<string, unknown>;
            }
          }
          const cronId = props.initFormState.cronId ? props.initFormState.cronId : cornJson.type;
          const cycle = typeof props.initFormState.cycle === "boolean" ? props.initFormState.cycle : Boolean(cronId);
          state.formState = {
            ...props.initFormState,
            beginTime: props.initFormState.validBeginTime ? dayjs(props.initFormState.validBeginTime).format("YYYY-MM-DD HH:mm:ss") : null,
            endTime: props.initFormState.validEndTime ? dayjs(props.initFormState.validEndTime).format("YYYY-MM-DD HH:mm:ss") : null,
            receiveIds: splitIds(props.initFormState.receiveIds),
            checkUserIds: splitIds(props.initFormState.checkUserIds),
            ...cornJson,
            selection:
              typeof cornJson.selection === "string"
                ? cornJson.selection.split(",").filter(Boolean)
                : Array.isArray(cornJson.selection)
                  ? cornJson.selection
                  : [],
            cronId,
            cycle,
          };
        }
      },
    );

    expose({ handleSubmit });

    const FieldComponent = (fieldProps: {
      label: string;
      fieldName: string;
      span?: number;
      customRender: ((value: Record<string, unknown>) => VNode | string) | undefined;
    }): VNode => {
      const isFullRow = fieldProps.span === 24;
      return (
        <Col xxl={fieldProps.span || 8} xl={isFullRow ? 24 : 12} lg={isFullRow ? 24 : 12} md={24} sm={24} xs={24}>
          <div class={styles.itemContent}>
            <label>{fieldProps.label}：</label>
            <span>
              {fieldProps.customRender ? fieldProps.customRender(state.formState) : String(state.formState[fieldProps.fieldName] ?? "--")}
            </span>
          </div>
        </Col>
      );
    };

    const InfoForm = (): VNode => (
      <div class={styles.container}>
        <Row gutter={[12, 12]}>
          {getFormSchema().map((item) => (
            <FieldComponent
              {...(item.span ? { span: item.span } : {})}
              fieldName={item.fieldName}
              key={item.fieldName}
              customRender={item.customRender}
              label={item.label}
            />
          ))}
        </Row>
      </div>
    );

    return () => (
      <>
        {route.query.type !== "info" ? <EditForm span={8} /> : null}
        {route.query.type === "info" ? <InfoForm /> : null}
      </>
    );
  },
});
