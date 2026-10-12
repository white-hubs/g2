// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import { getCurrentDailyType } from "@g2-client/daily-task/client";
import { type VNode, computed, defineComponent, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { DailyTaskTimeLimit, DailyTaskTypeSelect, DailyTaskUrgencySelect, FileUpload } from "@/components/daily-task-widgets";
import { GLOBAL_SCENE_CODE } from "@/components/daily-task-widgets";
import { Col, Form, type FormInstance, FormItem, Input, Row } from "@/pc-ui-runtime";
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
        taskCategoryId: null,
        taskCategoryName: "",
        urgencyId: null,
        urgencyName: "",
        timeLimit: {
          day: 0,
          hour: 0,
          minute: 0,
        },
        responsibleNames: [],
        fileList: [],
      },
    });

    const formSchema = [
      {
        fieldName: "name",
        label: "任务名称",
        FormComponent: (fieldProps: Record<string, unknown>): JSX.Element => <Input {...fieldProps} maxlength={100} />,
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
        span: 16,
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
        fieldName: "responsibleNames",
        label: "负责人",
        customRender: (formState: Record<string, unknown>): JSX.Element => {
          const names = formState.responsibleNames;
          if (Array.isArray(names) && names.length > 0) {
            return <span>{names.join("、") || "--"}</span>;
          }
          return <span>--</span>;
        },
      },
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
        { required: true, message: "请输入任务名称" },
        { message: "名称不超过100个字", pattern: /^.{1,100}$/g },
      ],
      urgencyId: [{ required: true, message: "请选择紧急程度" }],
      taskCategoryId: [{ required: true, message: `请选择${taskTypeLabel.value}` }],
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
          {formSchema
            .filter((item) => item.FormComponent)
            .map((item) => {
              const { FormComponent } = item;
              if (!FormComponent) {
                return null;
              }
              return (
                <Col key={item.fieldName} xxl={item.span || layoutProps.span || 8} xl={12} lg={24} md={24} sm={24} xs={24}>
                  <FormItem
                    label={item.label}
                    name={item.fieldName}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "nowrap",
                    }}
                  >
                    {FormComponent({
                      value: state.formState[item.fieldName],
                      "onUpdate:value": (val: unknown): void => {
                        state.formState[item.fieldName] = val;
                      },
                    })}
                  </FormItem>
                </Col>
              );
            })}
        </Row>
      </Form>
    );
    const handleSubmit = async (): Promise<Record<string, unknown>> => {
      await formRef.value?.validate();
      const baseParams = {
        dailyType: state.formState.dailyType,
        name: state.formState.name,
        taskCategoryId: state.formState.taskCategoryId,
        urgencyId: state.formState.urgencyId,
        taskDay: state.formState.taskDay,
        taskHour: state.formState.taskHour,
        taskMinute: state.formState.taskMinute,
        fileIds: Array.isArray(state.formState.fileList) ? state.formState.fileList.map((item: { id: string }) => item.id) : [],
      };
      const { day = 0, hour = 0, minute = 0 } = (state.formState.timeLimit as { day?: number; hour?: number; minute?: number }) || {};
      const timeLimitParams = {
        taskDay: day,
        taskHour: hour,
        taskMinute: minute,
      };
      const params = {
        ...baseParams,
        ...timeLimitParams,
      };
      return params;
    };

    watch(
      () => props.initFormState,
      () => {
        if (Object.keys(props.initFormState).length > 0) {
          state.formState = props.initFormState;
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
