import { type Ref } from "vue";
interface UseTableXScroll {
    initTableXScroll: () => void;
    updateTableXScroll: () => void;
    isEnabled: Ref<boolean>;
}
/**
 * @deprecated 外置底栏横向滚动条已移除；保留空实现供旧调用方编译通过。
 * 表格横向滚动由 AliasTable / 表格 body 原生 overflow 承担。
 */
export declare const useTableXScroll: () => UseTableXScroll;
export {};
//# sourceMappingURL=use-table-x-scroll.d.ts.map