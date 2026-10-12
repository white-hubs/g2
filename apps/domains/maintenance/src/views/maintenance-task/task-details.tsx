import type { MaintenanceProgetRecord, MaintenanceTaskRecord } from "@g2-client/maintenance/client";
import {
  Button,
  Empty,
  Image,
  ImagePreviewGroup as RawImagePreviewGroup,
  PageLayout,
  type PcTableColumn,
  Spin,
  message,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, onMounted, ref, watch, type DefineComponent } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getMaintenanceClient } from "@/domain-context";
import { taskStatusLabel } from "@/utils/enum";
import { orDash, timeFormat } from "@/utils/format";

import styles from "../detail-form.module.css";

/** pc-ui 以 `Component` 导出预览组，JSX 需要带构造签名的组件类型。 */
const ImagePreviewGroup = RawImagePreviewGroup as unknown as DefineComponent;

export const MaintenanceTaskDetails = defineComponent({
  name: "MaintenanceTaskDetails",
  setup() {
    const client = getMaintenanceClient();
    const route = useRoute();
    const router = useRouter();
    const detail = ref<MaintenanceTaskRecord>({});
    const loading = ref(false);

    const recordColumns: PcTableColumn[] = [
      { title: "维保项", dataIndex: "maintrenaceProject", ellipsis: true },
      { title: "维保记录", dataIndex: "record", ellipsis: true },
      { title: "维保说明", dataIndex: "maintenanceDescribe", ellipsis: true },
    ];

    const [RecordTable, recordTableApi] = usePcTable({
      columns: recordColumns,
      rowKey: "id",
      tableCode: "MAINTENANCE_TASK_DETAIL_RECORDS",
      autoFetch: false,
      autoScrollY: false,
    });

    onMounted(() => {
      const id = typeof route.query.id === "string" ? route.query.id : "";
      if (!id) {
        return;
      }
      loading.value = true;
      client
        .getTask(id)
        .then((data) => {
          detail.value = data ?? {};
        })
        .catch((error: unknown) => {
          message.error(error instanceof Error ? error.message : "任务详情加载失败");
        })
        .finally(() => {
          loading.value = false;
        });
    });

    watch(
      () => detail.value.maintenanceProgetRecordVos,
      (rows) => {
        recordTableApi.setDataSource((rows ?? []) as MaintenanceProgetRecord[]);
      },
      { immediate: true },
    );

    const goBack = (): void => {
      void router.back();
    };

    /** 责任人：责任类型为人员看人员名，否则看岗位名。 */
    const responsibleText = (task: MaintenanceTaskRecord): string =>
      task.responsibilityType === "per" ? orDash(task.responsibilityPersonName) : orDash(task.responsibilityPositionName);

    const field = (label: string, value: unknown, full = false): JSX.Element => (
      <div class={[styles.item, full ? styles.itemFull : ""]}>
        <span class={styles.label}>{label}</span>
        <span class={styles.value}>{value}</span>
      </div>
    );

    const renderImages = (task: MaintenanceTaskRecord): JSX.Element => {
      const files = task.fileVOS ?? [];
      if (files.length === 0) {
        return <Empty description="暂无图片" style={{ width: "200px", margin: 0 }} />;
      }
      return (
        <ImagePreviewGroup>
          <div class={styles.images}>
            {files.map((file, index) => (
              <Image key={file.id ?? index} width={100} height={100} src={file.path ?? file.url ?? ""} />
            ))}
          </div>
        </ImagePreviewGroup>
      );
    };

    const renderRecords = (task: MaintenanceTaskRecord): JSX.Element | string => {
      if (task.maintenanceTaskStatus === "BE_MAINTAINED" || task.maintenanceTaskStatus === "STOP") {
        return "--";
      }
      return <RecordTable />;
    };

    const slots = {
      "layout-content": () => {
        const task = detail.value;
        return (
          <Spin spinning={loading.value}>
            <div class={styles.detailForm}>
              <div class={styles.sectionTitle}>基本信息</div>
              <div class={styles.gridThree}>
                {field("任务编号", orDash(task.code))}
                {field("发布时间", orDash(timeFormat(task.maintenanceTime, true)))}
                {field("维保计划名称", orDash(task.maintenancePlanName))}
                {field("设备名称", orDash(task.objectName))}
                {field("产品品类", orDash(task.categoryName))}
                {field("责任人", responsibleText(task))}
                {field("任务状态", taskStatusLabel(task.maintenanceTaskStatus))}
              </div>
              <div class={styles.sectionTitle}>维保记录</div>
              <div class={styles.gridThree}>
                {field("维保人员", orDash(task.maintenanceTaskPerson))}
                {field("维保完成时间", orDash(timeFormat(task.maintenanceFinishTime, true)))}
                {field("描述信息", orDash(task.taskRemark), true)}
                {field("现场图片", renderImages(task), true)}
                {field("维保结果", renderRecords(task), true)}
              </div>
            </div>
          </Spin>
        );
      },
      "footer-page": () => <Button onClick={goBack}>返回</Button>,
    };

    return () => <PageLayout title="维保任务详情" v-slots={slots} />;
  },
});
