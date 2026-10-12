import { type Component } from "vue";
import type { PcFormApi } from "./pc-form-api";
export declare function resolvePcFormFieldComponent(name: string): Component | null;
/** 由真实表单项纵坐标判断是否已经换行，并取得首行可见高度。 */
export declare function measureQueryRows(bounds: {
    top: number;
    bottom: number;
}[]): {
    firstRowCount: number;
    firstRowHeight: number;
    overflow: boolean;
};
export declare function createPcFormComponent(formApi: PcFormApi): Component;
//# sourceMappingURL=pc-form-ui.d.ts.map