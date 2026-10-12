import type { DefineComponent } from "vue";

import { readFormQuery, writeFormQuery, type FormQueryValue } from "./form-query-cache";
import { PcFormApi } from "./pc-form-api";
import type { PcFormApiOptions, PcFormSchemaProp, PcFormValueChangeMeta } from "./pc-form-types";
import { createPcFormComponent } from "./pc-form-ui";

export type { PcFormApiOptions, PcFormSchemaProp, PcFormValueChangeMeta } from "./pc-form-types";
export type { PcFormApi } from "./pc-form-api";

/** 旧 `useCubeForm` → pc-ui（覆盖 Input/Select/Cascader/DatePicker/RangePicker/InputNumber） */
export function usePcForm(options: PcFormApiOptions): [DefineComponent, PcFormApi] {
  const cache = options.cache ?? true;
  const cacheOnChange = options.cacheOnChange ?? true;
  const cacheFields = options.cacheFields ?? options.schema.map((item) => item.fieldName).filter(Boolean);
  const pageNumberField = options.autoQueryPageNumberField ?? "pageNumber";
  const pageSizeField = options.autoQueryPageSizeField ?? "pageSize";
  const defaultPageNumber = options.autoQueryDefaultPageNumber ?? 1;
  const defaultPageSize = options.autoQueryDefaultPageSize ?? 10;
  const schemaByField = (field: string): PcFormSchemaProp | undefined => formApi.state.schema.find((item) => item.fieldName === field);
  const parseValue = (raw: string, schema?: PcFormSchemaProp): unknown => {
    const optionsList = (schema?.componentProps as { options?: Array<{ value: unknown }> } | undefined)?.options;
    const matched = optionsList?.find((item) => String(item.value) === raw);
    if (matched) return matched.value;
    if (typeof schema?.defaultValue === "number") return Number.isFinite(Number(raw)) ? Number(raw) : raw;
    if (typeof schema?.defaultValue === "boolean") return raw === "true";
    return raw.includes(",") ? raw.split(",") : raw;
  };
  const pick = (values: Record<string, unknown>): Record<string, FormQueryValue> =>
    cacheFields.reduce<Record<string, FormQueryValue>>((result, field) => {
      result[field] = values[field] as FormQueryValue;
      return result;
    }, {});
  let formApi: PcFormApi;
  const syncState = (values: Record<string, unknown>): void => {
    const target = options.syncStateRef ?? options.queryState;
    if (!target) return;
    Object.assign(target, options.syncMap ? options.syncMap(values) : values);
  };
  const submit = (values: Record<string, unknown>): void => {
    syncState(values);
    if (cache) writeFormQuery({ ...pick(values), [pageNumberField]: defaultPageNumber });
    options.handleSubmit(values);
  };
  const reset = (): void => {
    syncState(formApi.formValues);
    if (cache)
      writeFormQuery({ ...Object.fromEntries(cacheFields.map((field) => [field, undefined])), [pageNumberField]: defaultPageNumber });
    options.handleReset?.();
  };
  const valuesChange = (values: Record<string, unknown>, changed?: Record<string, unknown>, meta?: PcFormValueChangeMeta): void => {
    const isInput = meta?.component === "Input";
    const shouldQuery = meta && (!isInput ? meta.trigger === "change" : meta.trigger === "enter") && !meta.hasCustomOnChange;
    const shouldResetPage = meta && (!isInput ? meta.trigger === "change" : meta.trigger === "enter");
    if (!meta?.hasCustomOnChange) syncState(changed ?? values);
    if (cache && cacheOnChange)
      writeFormQuery({
        ...pick(values),
        ...(shouldResetPage ? { [pageNumberField]: defaultPageNumber, [pageSizeField]: defaultPageSize } : {}),
      });
    options.handleValuesChange?.(values, changed, meta);
    if (shouldQuery) submit(values);
  };
  formApi = new PcFormApi({ ...options, handleSubmit: submit, handleReset: reset, handleValuesChange: valuesChange });
  let hydrated = false;
  if (options.queryState) {
    formApi.setFormValues(options.queryState);
    hydrated = true;
  }
  if (cache && !hydrated) {
    const restored = cacheFields.reduce<Record<string, unknown>>((result, field) => {
      const raw = readFormQuery(field);
      if (raw !== undefined) result[field] = parseValue(raw, schemaByField(field));
      return result;
    }, {});
    if (Object.keys(restored).length > 0) {
      formApi.setFormValues(restored);
      syncState(formApi.formValues);
      hydrated = true;
    }
  }
  if (hydrated) queueMicrotask(() => options.onHydratedQuery?.());
  const PcForm = createPcFormComponent(formApi) as DefineComponent;
  return [PcForm, formApi];
}
