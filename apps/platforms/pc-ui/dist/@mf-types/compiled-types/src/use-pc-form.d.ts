import type { DefineComponent } from "vue";
import { PcFormApi } from "./pc-form-api";
import type { PcFormApiOptions } from "./pc-form-types";
export type { PcFormApiOptions, PcFormSchemaProp, PcFormValueChangeMeta } from "./pc-form-types";
export type { PcFormApi } from "./pc-form-api";
/** 旧 `useCubeForm` → pc-ui（覆盖 Input/Select/Cascader/DatePicker/RangePicker/InputNumber） */
export declare function usePcForm(options: PcFormApiOptions): [DefineComponent, PcFormApi];
//# sourceMappingURL=use-pc-form.d.ts.map