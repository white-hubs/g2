import { computed, defineComponent, watch, type PropType } from "vue";

import { useControlledPcModal } from "../composables/use-controlled-pc-modal";
import type { FireEventViewModel } from "../models";
import { RecordsEmptyState } from "./records-empty-state";
import { usePcTable } from "@/pc-ui-runtime";
import { Page, Tag } from "@/pc-ui-runtime";
import { FIRE_EVENT_TAG_COLOR } from "@/utils/fire-event";

const hasEventContent = (event: FireEventViewModel): boolean =>
  [event.deviceInfo, event.pointName, event.time, event.location].some((value) => String(value ?? "").trim().length > 0);

export const EventRecordsModal = defineComponent({
  name: "EventRecordsModal",
  props: {
    visible: { type: Boolean, required: true },
    events: { type: Array as PropType<FireEventViewModel[]>, required: true },
    loading: { type: Boolean, default: false },
    pageNumber: { type: Number, default: 1 },
    pageSize: { type: Number, default: 10 },
    total: { type: Number, default: 0 },
  },
  emits: { close: () => true, pageChange: (_pageNumber: number, _pageSize: number) => true },
  setup(props, { emit }) {
    const visibleEvents = computed(() => props.events.filter(hasEventContent));
    const columns = [
      {
        title: "类型",
        dataIndex: "eventName",
        key: "eventName",
        customRender: ({ text, record }: { text: string; record: FireEventViewModel }) => (
          <Tag color={FIRE_EVENT_TAG_COLOR[record.eventType]}>{text}</Tag>
        ),
      },
      { title: "回路/地址/编号", dataIndex: "deviceInfo", key: "deviceInfo" },
      { title: "报警时间", dataIndex: "time", key: "time" },
      { title: "位置", dataIndex: "location", key: "location" },
    ];
    const [PcTable, tableApi] = usePcTable({
      columns,
      rowKey: "id",
      pagination: false,
      scrollY: 260,
      autoFetch: false,
    });
    const [PcModal] = useControlledPcModal(() => props.visible, {
      title: "报警与事件记录",
      width: "800px",
      onClosed: () => emit("close"),
    });
    watch(visibleEvents, (events) => tableApi.setDataSource(events), { immediate: true });
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
            <div>
              {props.loading || visibleEvents.value.length > 0 ? <PcTable /> : <RecordsEmptyState description="暂无事件记录" />}
              {props.total > 0 ? (
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
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
