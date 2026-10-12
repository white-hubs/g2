// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import { getCurrentDailyType } from "@g2-client/daily-task/client";
import { type VNode, computed, defineComponent, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { cubeDailyTaskService } from "@/api/server";
import {
  DailyTaskCreateCycle,
  DailyTaskTimeLimit,
  DailyTaskTypeSelect,
  DailyTaskUrgencySelect,
  FileUpload,
} from "@/components/daily-task-widgets";
import { GLOBAL_SCENE_CODE } from "@/components/daily-task-widgets";
import { Col, DatePicker, Form, type FormInstance, FormItem, Input, Row } from "@/pc-ui-runtime";
import { dayjs, type Dayjs } from "@/pc-ui-runtime";
import { getTaskTypeLabel } from "@/utils/daily-task-edit-common";

import styles from "./basic-info.module.css";

export const BasicInfo = defineComponent({
  props: {
    initFormState: {
      type: Object,
      default: () => ({}),
    },
  },
  setup: (props, { expose }) => {
    const route = useRoute();
    const formRef = ref<FormInstance>();
    const taskTypeLabel = computed(() => getTaskTypeLabel(getCurrentDailyType()));

    const state = reactive<{
      formState: Record<string, unknown>;
    }>({
      formState: {
        dailyType: getCurrentDailyType(),
        name: "",
        startTime: "",
        endTime: "",
        taskCategoryId: null,
        taskCategoryName: "",
        urgencyId: null,
        urgencyName: "",
        cronId: "",
        cronName: "",
        specifiedType: "",
        specifiedDays: [],
        specifiedTime: "12:00:00",
        timeLimit: {
          day: 0,
          hour: 0,
          minute: 0,
        },
        // Description: '',
        fileList: [],
      },
    });
    const disabledDate = (current: Dayjs): boolean => current && current < dayjs().endOf("day").add(-1, "day");
    const range = (start: number, end: number): number[] => {
      // 生成禁用范围数组
      const result = [];
      for (let i = start; i < end; i++) {
        result.push(i);
      }
      return result;
    };
    const disabledTime = (
      current: Dayjs,
    ):
      | {
          disabledHours: () => number[];
          disabledMinutes?: () => number[];
          disabledSeconds?: () => number[];
        }
      | object => {
      if (!current) {
        return {};
      }

      if (current && dayjs(current).format("YYYY-MM-DD") === dayjs().format("YYYY-MM-DD")) {
        // 如果是今天，禁用当前时间之前的小时、分钟、秒
        const now = dayjs();
        return {
          disabledHours: () => range(0, now.hour()),
          disabledMinutes: () => (current.hour() === now.hour() ? range(0, now.minute()) : []),
          disabledSeconds: () => (current.hour() === now.hour() && current.minute() === now.minute() ? range(0, now.second()) : []),
        };
      }
      return {
        disabledHours: () => [],
        disabledMinutes: () => [],
        disabledSeconds: () => [],
      };
    };

    const formSchema = [
      {
        fieldName: "name",
        label: "计划名称",
        FormComponent: (fieldProps: Record<string, unknown>): JSX.Element => <Input maxlength={100} {...fieldProps} />,
      },
      {
        fieldName: "startTime",
        label: "生效时间",
        FormComponent: (fieldProps: Record<string, unknown>): JSX.Element => (
          <DatePicker
            disabledTime={disabledTime}
            {...fieldProps}
            disabledDate={disabledDate}
            showTime={{ format: "YYYY-MM-DD HH:mm:ss" }}
            valueFormat="YYYY-MM-DD HH:mm:ss"
          />
        ),
      },
      {
        fieldName: "endTime",
        label: "失效时间",
        FormComponent: (fieldProps: Record<string, unknown>): JSX.Element => (
          <DatePicker {...fieldProps} showTime={{ format: "YYYY-MM-DD HH:mm:ss" }} valueFormat="YYYY-MM-DD HH:mm:ss" />
        ),
      },
      {
        fieldName: "urgencyId",
        label: "紧急程度",
        FormComponent: (fieldProps: Record<string, unknown>): JSX.Element => <DailyTaskUrgencySelect {...fieldProps} />,
        customRender: (formState: Record<string, unknown>): JSX.Element => <span>{formState.urgencyName || "--"}</span>,
      },
      {
        fieldName: "taskCategoryId",
        label: taskTypeLabel.value,
        FormComponent: (fieldProps: Record<string, unknown>): JSX.Element => (
          <DailyTaskTypeSelect {...fieldProps} placeholder={`请选择${taskTypeLabel.value}`} />
        ),
        customRender: (formState: Record<string, unknown>): JSX.Element => <span>{formState.taskCategoryName || "--"}</span>,
      },
      {
        fieldName: "timeLimit",
        label: "任务时限",
        FormComponent: (fieldProps: Record<string, unknown>): JSX.Element => <DailyTaskTimeLimit {...fieldProps} />,
        customRender: (formState: Record<string, unknown>): JSX.Element | string => {
          const { day = 0, hour = 0, minute = 0 } = (formState.timeLimit as { day?: number; hour?: number; minute?: number }) || {};
          return (
            <span>
              {day}天{hour}小时{minute}分钟
            </span>
          );
        },
      },
      {
        fieldName: "cronId",
        label: "计划周期",
        span: 12,
        FormComponent: (fieldProps: Record<string, unknown>): JSX.Element => (
          <DailyTaskCreateCycle
            {...fieldProps}
            specifiedType={state.formState.specifiedType as string}
            specifiedDays={state.formState.specifiedDays as string[]}
            specifiedTime={state.formState.specifiedTime as string}
            cycleOptionsApi={async () => {
              const res = await cubeDailyTaskService.getTaskCyclePage({
                pageSize: 1000,
                pageNumber: 1,
                dailyType: getCurrentDailyType(),
              });
              return res.records || [];
            }}
          />
        ),
        customRender: (formState: Record<string, unknown>): JSX.Element => {
          if (formState.cronId === "custom") {
            const specifiedType = formState.specifiedType as string;
            const specifiedDays = (formState.specifiedDays as string[]) ?? [];
            const specifiedTime = formState.specifiedTime as string;
            let periodText: string;
            switch (specifiedType) {
              case "EVERY_DAY": {
                periodText = "每天";
                break;
              }
              case "EVERY_WEEK": {
                periodText = `每周${specifiedDays.join("、")}`;
                break;
              }
              default: {
                periodText = `每月${specifiedDays.join("、")}号`;
              }
            }
            return <span>{`${periodText} ${specifiedTime}`}</span>;
          }
          const cronName = (formState.cronName as string) || "--";
          return <span>{cronName}</span>;
        },
      },
      // {
      //   FieldName: 'description',
      //   Label: '任务说明',
      //   Span: 24,
      //   FormComponent: (props: Record<string, unknown>): JSX.Element=> <Textarea {...props} />,
      //   CustomRender: (formState: Record<string, unknown>): JSX.Element => {
      //     Return <span>{formState.description || '--'}</span>
      //   }
      // },
      {
        fieldName: "fileList",
        label: "附件信息",
        span: 24,
        FormComponent: (fieldProps: Record<string, unknown>): JSX.Element => (
          <FileUpload multiple type="picture-card" sceneCode={GLOBAL_SCENE_CODE.dailyTask} {...fieldProps} />
        ),
        customRender: (formState: Record<string, unknown>): JSX.Element => (
          <FileUpload value={formState.fileList} multiple readonly={true} type="picture-card" sceneCode={GLOBAL_SCENE_CODE.dailyTask} />
        ),
      },
    ];
    const rules = {
      name: [
        { required: true, message: "请输入计划名称" },
        { message: "名称不超过100个字", pattern: /^.{1,100}$/g },
      ],
      startTime: [
        { required: true, message: "请选择计划生效时间" },
        {
          validator: async (rule: unknown, value: unknown): Promise<Error | void> => {
            if (state.formState.endTime && (state.formState.endTime as string) < (value as string)) {
              throw new Error("计划生效时间不能大于计划失效时间");
            }
            return;
          },
        },
      ],
      endTime: [
        { required: true, message: "请选择计划失效时间" },
        {
          validator: async (rule: unknown, value: unknown): Promise<Error | void> => {
            if (!value) {
              return;
            }
            if (state.formState.startTime && (state.formState.startTime as string) > (value as string)) {
              throw new Error("计划失效时间不能小于计划生效时间");
            }
            return;
          },
        },
      ],
      urgencyId: [{ required: true, message: "请选择紧急程度" }],
      taskCategoryId: [{ required: true, message: `请选择${taskTypeLabel.value}` }],
      superintendentType: [
        { required: true, message: "请选择负责人" },
        {
          validator: async (rule: unknown, value: unknown): Promise<Error | void> => {
            if (value === "USER" && (state.formState.receiveIds as string[]).length === 0) {
              throw new Error("请选择负责人");
            }
            if (value === "DEPT" && (state.formState.receiveDeptIds as string[]).length === 0) {
              throw new Error("请选择负责人部门");
            }
            if (value === "POST" && (state.formState.receivePostIds as string[]).length === 0) {
              throw new Error("请选择负责人岗位");
            }
            if (value === "ROLE" && (state.formState.receiveRoleIds as string[]).length === 0) {
              throw new Error("请选择负责人角色");
            }
            return;
          },
        },
      ],
      cronId: [
        { required: true, message: "请选择计划周期" },
        {
          validator: async (rule: unknown, value: boolean): Promise<Error | void> => {
            if (value) {
              if (!state.formState.cronId) {
                throw new Error("请选择循环周期");
              }
              if (state.formState.cronId === "custom") {
                if (!state.formState.specifiedType) {
                  throw new Error("请选择自定义执行周期");
                }
                if (!state.formState.specifiedDays) {
                  throw new Error("请选择自定义执行周期时间");
                }
                if (!state.formState.specifiedTime) {
                  throw new Error("请选择自定义执行周期小时");
                }
              }
            }
            return;
          },
        },
      ],
      timeLimit: [
        { required: true, message: "请填写任务时限" },
        {
          validator: async (rule: unknown, value: unknown): Promise<Error | void> => {
            const { day = 0, hour = 0, minute = 0 } = (value as { day?: number; hour?: number; minute?: number }) || {};
            if (day === 0 && hour === 0 && minute === 0) {
              throw new Error("任务时限不能全为0");
            }
            return;
          },
        },
      ],
    };
    const EditForm = (layoutProps: { span?: number }): JSX.Element => (
      <Form
        ref={formRef}
        model={state.formState}
        rules={rules}
        layout="inline"
        labelCol={{
          style: {
            width: "120px",
          },
        }}
      >
        <Row gutter={[8 * 12, 12]} style={{ width: "100%" }}>
          {formSchema.map((item) => (
            <Col key={item.fieldName} xxl={item.span || layoutProps.span || 8} xl={12} lg={24} md={24} sm={24} xs={24}>
              <FormItem label={item.label} name={item.fieldName}>
                {item.FormComponent({
                  value: state.formState[item.fieldName],
                  "onUpdate:value": (val: unknown): void => {
                    state.formState[item.fieldName] = val;
                  },
                  cronId: state.formState.cronId,
                  "onUpdate:cronId": (val: unknown): void => {
                    state.formState.cronId = val;
                  },
                  specifiedType: state.formState.specifiedType,
                  "onUpdate:specifiedType": (val: unknown): void => {
                    state.formState.specifiedType = val;
                  },
                  specifiedDays: state.formState.specifiedDays,
                  "onUpdate:specifiedDays": (val: unknown): void => {
                    state.formState.specifiedDays = val;
                  },
                  specifiedTime: state.formState.specifiedTime,
                  "onUpdate:specifiedTime": (val: unknown): void => {
                    state.formState.specifiedTime = val;
                  },
                })}
              </FormItem>
            </Col>
          ))}
        </Row>
      </Form>
    );
    const handleSubmit = async (): Promise<Record<string, unknown>> => {
      await formRef.value?.validate();
      const baseParams = {
        dailyType: state.formState.dailyType,
        name: state.formState.name,
        startTime: state.formState.startTime,
        endTime: state.formState.endTime,
        taskCategoryId: state.formState.taskCategoryId,
        urgencyId: state.formState.urgencyId,
        // Description: state.formState.description,
        fileIds: (state.formState.fileList ?? []).map((item: { id: string }) => item.id),
      };
      const { day = 0, hour = 0, minute = 0 } = (state.formState.timeLimit as { day?: number; hour?: number; minute?: number }) || {};
      const timeLimitParams = {
        taskDay: day,
        taskHour: hour,
        taskMinute: minute,
      };
      const cronParams =
        state.formState.cronId === "custom"
          ? {
              cronId: "",
              specifiedType: state.formState.specifiedType,
              specifiedDays: Array.isArray(state.formState.specifiedDays)
                ? state.formState.specifiedDays.join(",")
                : state.formState.specifiedDays,
              specifiedTime: state.formState.specifiedTime,
            }
          : { cronId: state.formState.cronId };

      const params = {
        ...baseParams,
        ...cronParams,
        ...timeLimitParams,
      };
      return params;
    };

    watch(
      () => props.initFormState,
      () => {
        if (Object.keys(props.initFormState).length > 0) {
          state.formState = {
            ...props.initFormState,
            startTime: props.initFormState.startTime ? dayjs(props.initFormState.startTime).format("YYYY-MM-DD HH:mm:ss") : null,
            endTime: props.initFormState.endTime ? dayjs(props.initFormState.endTime).format("YYYY-MM-DD HH:mm:ss") : null,
            cronId: props.initFormState.cronId ? props.initFormState.cronId : "custom",
          };
        }
      },
    );
    expose({
      handleSubmit,
    });
    const FieldComponent = (fieldProps: {
      label: string;
      fieldName: string;
      span?: number;
      customRender: ((value: Record<string, unknown>) => VNode | string) | undefined;
    }): VNode => (
      <Col xxl={fieldProps.span || 8} xl={8} lg={8} md={12} sm={12} xs={24}>
        <div class={styles["item-content"]}>
          <label>{fieldProps.label}：</label>
          <span>{fieldProps.customRender ? fieldProps.customRender(state.formState) : state.formState[fieldProps.fieldName]}</span>
        </div>
      </Col>
    );
    const InfoForm = (): VNode => (
      <div class={styles.container}>
        <Row gutter={[0, 32]}>
          {formSchema.map((item) => (
            <FieldComponent span={8} fieldName={item.fieldName} key={item.fieldName} customRender={item.customRender} label={item.label} />
          ))}
        </Row>
      </div>
    );

    return (): JSX.Element => (
      <>
        {route.query.type !== "detail" && <EditForm span={8} />}
        {route.query.type === "detail" && <InfoForm />}
      </>
    );
  },
});
