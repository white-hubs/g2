// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import type { StandardResultItemModel, workOrderList } from "@g2-client/daily-task/client";
import { defineComponent, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { StandardResultItem } from "../record-info/components/standard-result-item/standard-result-item";
import { cubeDailyTaskService } from "@/api/server";
import { Button, Space } from "@/pc-ui-runtime";
import { PageLayout } from "@/pc-ui-runtime";

export const TaskTargetInfo = defineComponent({
  setup() {
    const route = useRoute();
    const router = useRouter();
    const { taskId, targetId } = route.query as { taskId: string; targetId: string };
    const recordTargetDetail = ref<StandardResultItemModel[]>([]);
    const recordWorkOrderList = ref<workOrderList[]>([]);

    const getData = async (): Promise<void> => {
      const response = await cubeDailyTaskService.getDailyTaskRecordTargetDetail({
        taskId,
        targetId,
      });
      recordTargetDetail.value = response?.standardList || [];
      recordWorkOrderList.value = response?.workOrderList || [];
    };

    onMounted(() => {
      getData();
    });

    const handleBack = (): void => {
      router.back();
    };

    /**
     * 查看工单详情
     */
    const handleViewWorkOrder = (record: workOrderList): void => {
      const target = `/portal/stream-engine-render/index?businessType=${record.workOrderType}&processInstanceId=${record.processInstanceId}&type=detail&title=工单详情`;
      void router.push(target);
    };

    const slots = {
      "layout-content": (): JSX.Element => (
        <div>
          <StandardResultItem standardResult={recordTargetDetail.value} />
          {recordWorkOrderList.value && recordWorkOrderList.value.length > 0 && (
            <div style={{ marginTop: "24px" }}>
              <div style={{ marginBottom: "16px", fontSize: "16px", fontWeight: 500 }}>关联工单</div>
              <div>
                {recordWorkOrderList.value.map((workOrder) => (
                  <div
                    key={workOrder.id}
                    style={{
                      padding: "8px 0",
                      textAlign: "left",
                      cursor: "pointer",
                      color: "var(--cube-theme-var--primary-color, #1890ff)",
                    }}
                    onClick={() => handleViewWorkOrder(workOrder)}
                  >
                    {workOrder.processInstanceName || "--"}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
      "footer-page": (): JSX.Element => (
        <Space>
          <Button
            onClick={() => {
              handleBack();
            }}
          >
            返回
          </Button>
        </Space>
      ),
    };

    return (): JSX.Element => <PageLayout title={"对象详情"} v-slots={slots} />;
  },
});
