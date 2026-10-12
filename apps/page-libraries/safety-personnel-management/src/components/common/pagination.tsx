import { Page } from "@g2-platform/pc-ui";
/** @jsxImportSource vue */
import { defineComponent } from "vue";

export const GPagination = defineComponent({
  props: {
    total: { type: Number, default: 0 },
    current: { type: Number, default: 1 },
    pageSize: { type: Number, default: 10 },
  },
  emits: ["change"],
  setup(props, { emit }) {
    const onChange = (page: number, pageSize: number): void => {
      emit("change", page, pageSize);
    };
    return () => (
      <Page
        syncToUrl={false}
        current={props.current}
        pageSize={props.pageSize}
        total={props.total}
        showTotal={(total: number) => `共 ${total} 条`}
        onPageChange={onChange}
      />
    );
  },
});
