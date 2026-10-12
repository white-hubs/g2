import { type UnwrapNestedRefs } from "vue";
import type { PcFormApiOptions, PcFormSchemaProp, PcFormState, PcFormValueChangeMeta } from "./pc-form-types";
export declare class PcFormApi {
    state: UnwrapNestedRefs<PcFormState>;
    formValues: UnwrapNestedRefs<Record<string, unknown>>;
    private readonly api;
    constructor(options: PcFormApiOptions);
    getFormSchema(columnCount: number): PcFormSchemaProp[];
    setState(state: Partial<PcFormState>): void;
    toggleCollapse(): void;
    handleSubmit(): void;
    handleValuesChange(changedValues?: Record<string, unknown>, meta?: PcFormValueChangeMeta): void;
    setFormValues(state: Partial<Record<string, unknown>>): void;
    setFieldValue(fieldName: string, value: unknown): void;
    updateSchema(schema: PcFormSchemaProp[]): void;
    /** 更新异步选择项时保留其他字段及用户已输入的查询条件。 */
    updateFieldSchema(schema: PcFormSchemaProp): void;
    handleReset(): void;
    private getFormModel;
}
//# sourceMappingURL=pc-form-api.d.ts.map