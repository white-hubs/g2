import { type ColumnType, Empty, Page, Table } from "@g2-platform/pc-ui";
import type { PropType } from "vue";
import { defineComponent } from "vue";

export const DeviceRecordTable = defineComponent({
  name: "DeviceRecordTable",
  props: {
    records: { type: Array as PropType<unknown[]>, required: true },
    columns: { type: Array as PropType<ColumnType[]>, required: true },
    loading: { type: Boolean, required: true },
    pageNumber: { type: Number, required: true },
    pageSize: { type: Number, required: true },
    total: { type: Number, required: true },
    emptyText: { type: String, required: true },
    rowKey: { type: [String, Function] as PropType<string | ((record: unknown, index?: number) => string)>, required: true },
  },
  emits: {
    pageChange: (_pageNumber: number, _pageSize: number): boolean => true,
  },
  setup:
    (props, { emit }) =>
    () => (
      <div class="device-record-table">
        {!props.loading && props.records.length === 0 ? (
          <Empty description={props.emptyText} />
        ) : (
          <Table
            columns={props.columns}
            dataSource={props.records}
            loading={props.loading}
            pagination={false}
            rowKey={props.rowKey}
            size="small"
            scroll={{ x: 860 }}
          />
        )}
        {props.total > 0 && (
          <div class="device-record-pagination">
            <Page
              cachePageQuery={false}
              current={props.pageNumber}
              pageSize={props.pageSize}
              total={props.total}
              showSizeChanger={false}
              syncToUrl={false}
              onPageChange={(pageNumber: number, pageSize: number) => emit("pageChange", pageNumber, pageSize)}
            />
          </div>
        )}
      </div>
    ),
});
