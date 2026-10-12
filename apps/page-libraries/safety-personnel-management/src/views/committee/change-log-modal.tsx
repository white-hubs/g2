import { Empty, Modal, Table } from "@g2-platform/pc-ui";
/** @jsxImportSource vue */
import { defineComponent, ref } from "vue";

import { getCommitteeChangeLogs } from "../../api/safety-personnel";
import { COMMITTEE_CHANGE_TYPE_LABEL } from "../../constants";
import { useAuthRequest } from "../../hooks/use-auth-request";
import { showApiError } from "../../utils/api-error";
import { formatDateTime } from "../../utils/format-time";

export const ChangeLogModal = defineComponent({
  setup(_, { expose }) {
    const open = ref(false);
    const loading = ref(false);
    const records = ref<{ logId: string; changeType: string; changeContent: string; operator: string; changeTime: string }[]>([]);

    const show = async (committeeId: string): Promise<void> => {
      open.value = true;
      loading.value = true;
      try {
        const logs = await useAuthRequest(() => getCommitteeChangeLogs(committeeId));
        records.value = logs.map((l) => ({
          logId: String(l.id ?? ""),
          changeType: COMMITTEE_CHANGE_TYPE_LABEL[l.changeType ?? ""] ?? l.changeType ?? "",
          changeContent: l.changeContent ?? "",
          operator: l.operatorName ?? "",
          changeTime: formatDateTime(l.changeTime as string | number | undefined),
        }));
      } catch (e) {
        showApiError(e);
        records.value = [];
      } finally {
        loading.value = false;
      }
    };

    expose({ open: show });

    const columns = [
      { title: "变更类型", dataIndex: "changeType", width: 120 },
      { title: "变更内容", dataIndex: "changeContent", ellipsis: true },
      {
        title: "操作人",
        dataIndex: "operator",
        width: 140,
        ellipsis: true,
      },
      {
        title: "变更时间",
        dataIndex: "changeTime",
        width: 190,
        customRender: ({ text }: { text: string }) => <span style={{ whiteSpace: "nowrap" }}>{text}</span>,
      },
    ];

    return () => (
      <Modal
        open={open.value}
        title="变更记录"
        width={1040}
        footer={null}
        onCancel={() => {
          open.value = false;
        }}
      >
        <Table
          rowKey="logId"
          columns={columns}
          dataSource={records.value}
          loading={loading.value}
          pagination={false}
          tableLayout="fixed"
          locale={{ emptyText: <Empty description="暂无变更记录" /> }}
        />
      </Modal>
    );
  },
});
