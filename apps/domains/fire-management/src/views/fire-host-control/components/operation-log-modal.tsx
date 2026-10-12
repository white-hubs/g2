import { defineComponent, watch, type PropType } from "vue";

import { useControlledPcModal } from "../composables/use-controlled-pc-modal";
import type { OperationLogViewModel } from "../models";
import { RecordsEmptyState } from "./records-empty-state";
import { usePcTable } from "@/pc-ui-runtime";
import { Page, Tag } from "@/pc-ui-runtime";

import styles from "./operation-log-modal.module.css";

const RESULT_COLORS: Record<OperationLogViewModel["result"], string> = {
  processing: "blue",
  success: "green",
  failed: "red",
};

export const OperationLogModal = defineComponent({
  name: "OperationLogModal",
  props: {
    visible: { type: Boolean, required: true },
    logs: { type: Array as PropType<OperationLogViewModel[]>, required: true },
    loading: { type: Boolean, default: false },
    pageNumber: { type: Number, default: 1 },
    pageSize: { type: Number, default: 8 },
    total: { type: Number, default: 0 },
  },
  emits: {
    close: () => true,
    pageChange: (_pageNumber: number, _pageSize: number) => true,
  },
  setup(props, { emit }) {
    const columns = [
      { title: "操作时间", dataIndex: "time", key: "time", width: 170 },
      { title: "操作人", dataIndex: "operator", key: "operator", width: 110 },
      { title: "操作类型", dataIndex: "type", key: "type", width: 110 },
      { title: "操作内容", dataIndex: "content", key: "content" },
      {
        title: "执行结果",
        dataIndex: "result",
        key: "result",
        width: 110,
        customRender: ({ record }: { record: OperationLogViewModel }) => (
          <span title={record.resultMessage || record.resultName}>
            <Tag color={RESULT_COLORS[record.result]}>{record.resultName}</Tag>
          </span>
        ),
      },
    ];
    const [PcTable, tableApi] = usePcTable({
      columns,
      rowKey: "id",
      pagination: false,
      scrollY: 300,
      autoFetch: false,
    });
    const [PcModal] = useControlledPcModal(() => props.visible, {
      title: "远程操作审计日志",
      width: "900px",
      onClosed: () => emit("close"),
    });
    watch(
      () => props.logs,
      (logs) => tableApi.setDataSource(logs),
      { immediate: true },
    );
    watch(
      () => props.loading,
      (loading) => (tableApi.loading.value = loading),
      { immediate: true },
    );
    return () => (
      <PcModal
        v-slots={{
          footer: () => null,
          default: () => (
            <div class={styles.content}>
              <div class={styles.tableArea}>
                {props.loading || props.logs.length > 0 ? <PcTable /> : <RecordsEmptyState description="暂无操作记录" />}
              </div>
              {props.total > 0 ? (
                <div class={styles.pagination}>
                  <Page
                    current={props.pageNumber}
                    pageSize={props.pageSize}
                    total={props.total}
                    syncToUrl={false}
                    showSizeChanger={false}
                    showTotal={(total: number): string => `共 ${total} 条`}
                    onPageChange={(pageNumber: number, pageSize: number) => emit("pageChange", pageNumber, pageSize)}
                  />
                </div>
              ) : null}
            </div>
          ),
        }}
      />
    );
  },
});
