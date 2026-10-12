import { reactive, type UnwrapNestedRefs } from "vue";

import type { PcFormApiOptions, PcFormSchemaProp, PcFormState, PcFormValueChangeMeta } from "./pc-form-types";

function bindMethods<T extends object>(instance: T): void {
  const prototype = Object.getPrototypeOf(instance) as object;
  for (const propertyName of Object.getOwnPropertyNames(prototype)) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, propertyName);
    const propertyValue = instance[propertyName as keyof T];
    if (typeof propertyValue === "function" && propertyName !== "constructor" && descriptor && !descriptor.get && !descriptor.set) {
      instance[propertyName as keyof T] = (propertyValue as (...a: unknown[]) => unknown).bind(instance) as T[keyof T];
    }
  }
}

export class PcFormApi {
  public state: UnwrapNestedRefs<PcFormState> = reactive({
    layout: "horizontal",
    schema: [],
    showButton: true,
    isCollapsed: true,
  });

  public formValues: UnwrapNestedRefs<Record<string, unknown>> = reactive({});
  private readonly api: Pick<PcFormApiOptions, "handleSubmit" | "handleReset" | "handleValuesChange">;

  public constructor(options: PcFormApiOptions) {
    const { handleSubmit, handleReset, handleValuesChange, ...optionsState } = options;
    this.api = { handleSubmit, handleReset, handleValuesChange };
    Object.assign(this.state, optionsState);
    this.formValues = this.getFormModel();
    bindMethods(this);
  }

  public getFormSchema(columnCount: number): PcFormSchemaProp[] {
    const schemas = this.state.schema;
    // 未启用折叠时始终展示全部字段
    if (!this.state.showCollapseButton || !this.state.isCollapsed) {
      return schemas;
    }
    const limit = this.state.collapsedVisibleCount ?? columnCount;
    if (limit <= 0) {
      return schemas.slice(0, 1);
    }
    return schemas.filter((_, index) => index < limit);
  }

  public setState(state: Partial<PcFormState>): void {
    Object.assign(this.state, state);
  }

  public toggleCollapse(): void {
    this.state.isCollapsed = !this.state.isCollapsed;
  }

  public handleSubmit(): void {
    this.api.handleSubmit?.(this.formValues);
  }

  public handleValuesChange(changedValues?: Record<string, unknown>, meta?: PcFormValueChangeMeta): void {
    this.api.handleValuesChange?.(this.formValues, changedValues, meta);
  }

  public setFormValues(state: Partial<Record<string, unknown>>): void {
    Object.assign(this.formValues, state);
  }

  public setFieldValue(fieldName: string, value: unknown): void {
    this.formValues[fieldName] = value;
  }

  public updateSchema(schema: PcFormSchemaProp[]): void {
    this.state.schema = schema;
    const model = schema.reduce<Record<string, unknown>>((acc, cur) => {
      // 未设置 defaultValue 时用 undefined，避免 Select/Cascader 被 null/"" 占住而不显示 placeholder
      acc[cur.fieldName] = cur.defaultValue;
      return acc;
    }, {});
    for (const key of Object.keys(model)) {
      if (!Object.prototype.hasOwnProperty.call(this.formValues, key) || this.formValues[key] === undefined) {
        this.formValues[key] = model[key];
      }
    }
  }

  /** 更新异步选择项时保留其他字段及用户已输入的查询条件。 */
  public updateFieldSchema(schema: PcFormSchemaProp): void {
    const index = this.state.schema.findIndex((item) => item.fieldName === schema.fieldName);
    if (index < 0) throw new Error(`查询字段不存在：${schema.fieldName}`);
    this.state.schema.splice(index, 1, schema);
  }

  public handleReset(): void {
    const model = this.state.schema.reduce<Record<string, unknown>>((acc, cur) => {
      acc[cur.fieldName] = cur.defaultValue;
      return acc;
    }, {});
    for (const key of Object.keys(model)) {
      this.formValues[key] = model[key];
    }
    this.api.handleReset?.();
  }

  private getFormModel(): UnwrapNestedRefs<Record<string, unknown>> {
    const model = this.state.schema.reduce<Record<string, unknown>>((acc, cur) => {
      acc[cur.fieldName] = cur.defaultValue;
      return acc;
    }, {});
    return reactive({ ...model });
  }
}
