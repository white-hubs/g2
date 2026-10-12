import zhCN from "ant-design-vue/es/locale/zh_CN";
import Pagination from "ant-design-vue/es/pagination";
import { defineComponent, h, onBeforeMount } from "vue";
import { useRoute, useRouter } from "vue-router";

import { readPageQueryValue, writePageQuery } from "./page-url-query";

/**
 * 旧 cube-ui `Page`：Pagination + 可选 URL pageNumber/pageSize 同步。
 * 默认挂中文 Pagination locale，避免弹窗外挂或 locale 丢失时出现 `10 / page`。
 */
export const Page = defineComponent({
  name: "PcPage",
  emits: ["pageChange", "showSizeChange"],
  props: {
    current: { type: Number, required: true },
    pageSize: { type: Number, required: true },
    total: { type: Number, required: true },
    showQuickJumper: { type: Boolean, default: undefined },
    showSizeChanger: { type: Boolean, default: undefined },
    showTotal: {
      type: Function as unknown as () => (total: number, range: [number, number]) => string,
      default: undefined,
    },
    pageSizeOptions: { type: Array as () => string[], default: undefined },
    /** 为 false 时不读写 URL（弹窗内分页等） */
    syncToUrl: { type: Boolean, default: undefined },
    /** 显式控制旧版兼容缓存；`false` 时不再在路由中持久化 pageNumber/pageSize。 */
    cachePageQuery: { type: Boolean, default: undefined },
  },
  setup(props, { emit }) {
    const route = useRoute();
    const router = useRouter();
    const shouldSyncToUrl = (): boolean => props.syncToUrl !== false && props.cachePageQuery !== false;

    onBeforeMount(() => {
      if (!shouldSyncToUrl()) return;
      const pageNumber = readPageQueryValue("pageNumber", route);
      const pageSize = readPageQueryValue("pageSize", route);
      const nextPageNumber = pageNumber ?? props.current;
      const nextPageSize = pageSize ?? props.pageSize;
      if (nextPageNumber !== props.current || nextPageSize !== props.pageSize) {
        emit("pageChange", nextPageNumber, nextPageSize);
      }
    });

    const onChange = (pageNumber: number, pageSize: number): void => {
      if (shouldSyncToUrl()) {
        writePageQuery(pageNumber, pageSize, router, route);
      }
      emit("pageChange", pageNumber, pageSize);
    };
    const onShowSizeChange = (pageNumber: number, pageSize: number): void => {
      if (shouldSyncToUrl()) {
        writePageQuery(pageNumber, pageSize, router, route);
      }
      emit("showSizeChange", pageNumber, pageSize);
    };

    return () =>
      h(Pagination, {
        current: props.current,
        pageSize: props.pageSize,
        total: props.total,
        pageSizeOptions: props.pageSizeOptions,
        // 显式中文，不依赖外层 ConfigProvider（弹窗传送到 body 时易丢 locale）。
        locale: zhCN.Pagination,
        showSizeChanger: props.showSizeChanger ?? true,
        showQuickJumper: props.showQuickJumper ?? false,
        showTotal: props.showTotal ?? ((total: number): string => `共 ${total} 条数据`),
        onChange,
        onShowSizeChange,
      });
  },
});
