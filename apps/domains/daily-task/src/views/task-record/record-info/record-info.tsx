// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import { type DailyRecordRepairModel, type DailyTaskRecordDetailsModel, TaskResultStatusMap } from "@g2-client/daily-task/client";
import { getCurrentDailyType } from "@g2-client/daily-task/client";
import { type VNode, defineComponent, onMounted, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";

import { ResultItem } from "./components/result-item/result-item";
import { TargetResultItem } from "./components/target-result-item/target-result-item";
import { cubeDailyTaskService } from "@/api/server";
import { Button, Col, Image, ImagePreviewGroup, Row, message } from "@/pc-ui-runtime";
import { PageLayout } from "@/pc-ui-runtime";
import { dayjs } from "@/pc-ui-runtime";

import styles from "./record-info.module.css";

export const TaskRecordInfo = defineComponent({
  setup: () => {
    const route = useRoute();
    const router = useRouter();
    const state = reactive<{
      formData: DailyTaskRecordDetailsModel;
    }>({
      formData: {
        id: "",
        dailyType: getCurrentDailyType(),
        taskId: "",
        taskName: "",
        executionTime: "",
        executorId: "",
        executorName: "",
        executionResult: "",
        remark: "",
        fileList: [],
        recordItemList: [],
        targetList: [],
        workOrderList: [],
        exceptionList: [],
      },
    });

    const schemaData = [
      {
        fieldName: "taskName",
        label: "任务名称",
      },
      {
        fieldName: "executionTime",
        label: "执行时间",
        customRender: (value: unknown): JSX.Element | string => {
          const time = dayjs(value as string).format("YYYY-MM-DD HH:mm:ss");
          return <span>{time || "--"}</span>;
        },
      },
      {
        fieldName: "executorName",
        label: "巡检人员",
        customRender: (value: unknown): JSX.Element | string => <span>{value || "--"}</span>,
      },
      {
        fieldName: "executionResult",
        label: "巡检结果",
        customRender: (value: unknown): JSX.Element | string => {
          const textVal = TaskResultStatusMap.get(value as string) || "";
          return <span>{textVal || "--"}</span>;
        },
      },
      {
        fieldName: "remark",
        label: "备注",
      },
    ];
    onMounted(() => {
      getDetails();
    });
    const getDetails = async (): Promise<void> => {
      const id = route.query.id as string;
      try {
        const result = await cubeDailyTaskService.getDailyTaskRecordDetail({
          id,
        });
        state.formData = {
          ...result,
        };
      } catch (error) {
        const { errorMessage } = (error as { toJSON: () => { errorMessage: string } }).toJSON();
        message.error(errorMessage || "请求失败");
      }
    };
    const FieldComponent = (props: {
      label: string;
      fieldName: string;
      span?: number;
      customRender: ((value: unknown) => VNode | string) | undefined;
    }): VNode => (
      <Col xxl={props.span || 8} xl={8} lg={8} md={12} sm={12} xs={24}>
        <div class={styles["item-content"]}>
          <label>{props.label}：</label>
          <span>{props.customRender ? props.customRender(state.formData[props.fieldName]) : state.formData[props.fieldName]}</span>
        </div>
      </Col>
    );

    const handleBack = (): void => {
      router.back();
    };
    const getRepairResultName = (executionResult: string): string => (executionResult === "NORMAL" ? "正常" : "异常");
    const getRepairList = (): DailyRecordRepairModel[] =>
      (state.formData.exceptionList ?? []).flatMap((exception) => exception.repairList ?? []);
    const renderRepairRecord = (repair: DailyRecordRepairModel): JSX.Element => (
      <div class={styles["repair-item"]} key={repair.id}>
        <Row gutter={[0, 16]}>
          <Col xxl={8} xl={8} lg={8} md={12} sm={12} xs={24}>
            <div class={styles["repair-field"]}>
              <label>处理时间：</label>
              <span>{repair.createTime ? dayjs(repair.createTime).format("YYYY-MM-DD HH:mm:ss") : "--"}</span>
            </div>
          </Col>
          <Col xxl={8} xl={8} lg={8} md={12} sm={12} xs={24}>
            <div class={styles["repair-field"]}>
              <label>处理人：</label>
              <span>{repair.handlerName || "--"}</span>
            </div>
          </Col>
          <Col xxl={8} xl={8} lg={8} md={12} sm={12} xs={24}>
            <div class={styles["repair-field"]}>
              <label>处理结果：</label>
              <span class={repair.executionResult === "NORMAL" ? styles["repair-normal"] : styles["repair-error"]}>
                {getRepairResultName(repair.executionResult)}
              </span>
            </div>
          </Col>
          {repair.remark && (
            <Col span={24}>
              <div class={styles["repair-field"]}>
                <label>备注：</label>
                <span>{repair.remark}</span>
              </div>
            </Col>
          )}
          {Boolean(repair.fileList?.length) && (
            <Col span={24}>
              <div class={styles["repair-files"]}>
                <ImagePreviewGroup>
                  {repair.fileList.map((file) => (
                    <Image key={file.id} src={file.path} style={{ width: "80px", height: "80px" }} width={80} height={80} />
                  ))}
                </ImagePreviewGroup>
              </div>
            </Col>
          )}
        </Row>
      </div>
    );

    const layoutSlots = {
      "layout-content": (): JSX.Element => (
        <div class={styles.container}>
          <div class={styles["item-title"]}>基本信息</div>
          <Row gutter={[0, 32]}>
            {schemaData.map((item) => (
              <FieldComponent
                span={8}
                fieldName={item.fieldName}
                key={item.fieldName}
                customRender={item.customRender}
                label={item.label}
              />
            ))}
          </Row>
          {state.formData.recordItemList?.length > 0 && (
            <>
              <div class={styles["item-title"]} style={{ marginTop: "32px" }}>
                任务结果
              </div>
              <ResultItem patrolResult={state.formData.recordItemList || []} />
            </>
          )}
          {state.formData.targetList?.length > 0 && (
            <>
              <div class={styles["item-title"]} style={{ marginTop: "32px" }}>
                任务对象
              </div>
              <TargetResultItem targetResult={state.formData.targetList || []} />
            </>
          )}
          {state.formData.executionResult === "ABNORMAL" && (
            <>
              <div class={styles["item-title"]} style={{ marginTop: "32px" }}>
                异常处理
              </div>
              <div class={styles["repair-card"]}>
                {getRepairList().length > 0 ? (
                  getRepairList().map(renderRepairRecord)
                ) : (
                  <div class={styles["empty-repair"]}>暂无处理记录</div>
                )}
              </div>
            </>
          )}
        </div>
      ),
      "footer-page": (): JSX.Element => (
        <Button
          onClick={() => {
            handleBack();
          }}
        >
          返回
        </Button>
      ),
    };
    return (): JSX.Element => <PageLayout title="任务记录详情" v-slots={layoutSlots} />;
  },
});
