import { Button, Empty, Table } from "@g2-platform/pc-ui";
/** @jsxImportSource vue */
import { defineComponent, onMounted, ref, watch } from "vue";

import { getPersonResumeByType } from "../../../../api/safety-personnel";
import { useAuthRequest } from "../../../../hooks/use-auth-request";
import type { ResumeItemUI } from "../../../../types/ui";
import { showApiError } from "../../../../utils/api-error";
import { mapResumeItem } from "../../../../utils/mappers";
import { openResumeDetail } from "../../../../utils/resume-detail-navigation";

const TAB_TO_API_TYPE: Record<string, string> = {
  patrol: "patrol",
  alarm: "alarm",
  approval: "approval",
  meeting: "meeting",
  other: "other",
};

export const TaskTableTab = defineComponent({
  props: {
    personId: { type: String, required: true },
    resumeType: { type: String, required: true },
  },
  setup(props) {
    const records = ref<ResumeItemUI[]>([]);
    const loading = ref(false);

    const load = async (): Promise<void> => {
      const apiType = TAB_TO_API_TYPE[props.resumeType];
      if (!apiType) {
        records.value = [];
        return;
      }
      loading.value = true;
      try {
        const list = await useAuthRequest(() => getPersonResumeByType(props.personId, apiType));
        records.value = list.map(mapResumeItem);
      } catch (e) {
        showApiError(e);
        records.value = [];
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      void load();
    });
    watch(
      () => props.personId,
      () => {
        void load();
      },
    );

    const columns = [
      { title: "名称", dataIndex: "title", ellipsis: true },
      { title: "任务时间", dataIndex: "taskTime", width: 160 },
      {
        title: "详情",
        width: 100,
        customRender: ({ record }: { record: ResumeItemUI }) => (
          <Button
            type="link"
            size="small"
            onClick={() => {
              openResumeDetail(record);
            }}
          >
            查看详情
          </Button>
        ),
      },
    ];

    return () => (
      <Table
        class="safety-resume-task-table"
        bordered
        size="middle"
        rowKey="id"
        columns={columns}
        dataSource={records.value}
        loading={loading.value}
        pagination={false}
        locale={{ emptyText: <Empty description="暂无任务记录" /> }}
      />
    );
  },
});
