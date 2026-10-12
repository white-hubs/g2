import type { PropType } from "vue";
import { defineComponent } from "vue";

import { Pagination, Table } from "@/pc-ui-runtime";

export interface GTablePagination {
  pageSize: number;
  pageNumber: number;
  total: number;
}

export const GTable = defineComponent({
  name: "GTable",
  props: {
    title: { type: String, default: "" },
    columns: { type: Array as PropType<unknown[]>, default: () => [] },
    dataSource: { type: Array as PropType<unknown[]>, default: () => [] },
    pagination: {
      type: Object as PropType<GTablePagination>,
      default: () => ({ pageSize: 10, pageNumber: 1, total: 0 }),
    },
    showpagination: { type: Boolean, default: true },
    scrollInfo: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  emits: ["changeSize"],
  setup(props, { emit }) {
    const onShowSizeChange = (current: number, pageSize: number) => {
      emit("changeSize", { current, pageSize });
    };

    return () => (
      <>
        <Table
          columns={props.columns as never}
          dataSource={props.dataSource as never}
          pagination={false}
          scroll={props.scrollInfo as never}
          bordered
        />
        {props.showpagination ? (
          <div style={{ overflow: "hidden" }}>
            <Pagination
              current={props.pagination.pageNumber}
              pageSize={props.pagination.pageSize}
              style={{ position: "absolute", right: "15px", bottom: 0 }}
              showSizeChanger
              total={props.pagination.total}
              showTotal={(total: number) =>
                `共 ${total} 条   第${props.pagination.pageNumber}/${Math.ceil(total / props.pagination.pageSize) || 0}页`
              }
              onChange={onShowSizeChange}
              onUpdate:current={(value: number) => {
                props.pagination.pageNumber = value;
              }}
              onUpdate:pageSize={(value: number) => {
                props.pagination.pageSize = value;
              }}
            />
          </div>
        ) : null}
      </>
    );
  },
});
