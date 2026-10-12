import Button from "ant-design-vue/es/button";
import Cascader from "ant-design-vue/es/cascader";
import Form, { FormItem } from "ant-design-vue/es/form";
import Input from "ant-design-vue/es/input";
import InputNumber from "ant-design-vue/es/input-number";
import Select from "ant-design-vue/es/select";
import Space from "ant-design-vue/es/space";
import { computed, defineComponent, h, nextTick, onMounted, onUnmounted, ref, watch, type Component } from "vue";

import { DatePicker, RangePicker } from "./date-picker";
import type { PcFormApi } from "./pc-form-api";

import styles from "./pc-form-ui.module.css";

export function resolvePcFormFieldComponent(name: string): Component | null {
  switch (name) {
    case "Input":
      return Input;
    case "Select":
      return Select;
    case "Cascader":
      return Cascader;
    case "InputNumber":
      return InputNumber;
    case "DatePicker":
      return DatePicker;
    case "RangePicker":
    case "DateRangePicker":
      return RangePicker;
    default:
      return null;
  }
}

const CollapseChevron = (collapsed: boolean): ReturnType<typeof h> =>
  h(
    "svg",
    {
      viewBox: "64 64 896 896",
      width: "1em",
      height: "1em",
      fill: "currentColor",
      "aria-hidden": true,
      style: { marginLeft: "4px" },
    },
    h("path", {
      d: collapsed
        ? "M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.7l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.3.1-12.7-6.4-12.7z"
        : "M884 768h-75c-5.1 0-9.9-2.5-12.9-6.6L512 369.8 227.9 761.4c-3 4.1-7.8 6.6-12.9 6.6h-75c-6.5 0-10.3-7.4-6.5-12.7l352.6-486.1c12.8-17.6 39-17.6 51.7 0l352.6 486.1c3.9 5.3.1 12.7-6.4 12.7z",
    }),
  );

/** 由真实表单项纵坐标判断是否已经换行，并取得首行可见高度。 */
export function measureQueryRows(bounds: { top: number; bottom: number }[]): {
  firstRowCount: number;
  firstRowHeight: number;
  overflow: boolean;
} {
  if (bounds.length === 0) return { firstRowCount: 0, firstRowHeight: 0, overflow: false };
  const firstTop = bounds[0].top;
  const firstRow = bounds.filter((item) => Math.abs(item.top - firstTop) <= 1);
  return {
    firstRowCount: firstRow.length,
    firstRowHeight: Math.ceil(Math.max(...firstRow.map((item) => item.bottom)) + 4),
    overflow: firstRow.length < bounds.length,
  };
}

export function createPcFormComponent(formApi: PcFormApi): Component {
  return defineComponent({
    name: "PcForm",
    setup: () => {
      const visibleColumns = ref(4);
      const firstRowHeight = ref(0);
      const autoOverflow = ref(false);
      const gridContainerRef = ref<HTMLDivElement | null>(null);
      let observer: ResizeObserver | undefined;

      const measure = (): void => {
        const gridContainer = gridContainerRef.value;
        if (!gridContainer) return;
        const fields = Array.from(gridContainer.querySelectorAll<HTMLElement>(".pc-design-form-item:not(.pc-query-form-action-item)"));
        const rows = measureQueryRows(fields.map((field) => ({ top: field.offsetTop, bottom: field.offsetTop + field.offsetHeight })));
        if (rows.firstRowCount > 0) visibleColumns.value = rows.firstRowCount;
        firstRowHeight.value = rows.firstRowHeight;
        autoOverflow.value = rows.overflow;
      };

      onMounted(() => {
        observer = new ResizeObserver(measure);
        if (gridContainerRef.value) observer.observe(gridContainerRef.value);
        void nextTick(measure);
      });

      onUnmounted(() => {
        observer?.disconnect();
      });

      watch(
        () => formApi.state.schema,
        () => {
          void nextTick(measure);
        },
        { deep: true },
      );

      const showCollapseButton = computed(() => {
        if (formApi.state.showCollapseButton === false) return false;
        if (formApi.state.layout === "vertical" && formApi.state.showCollapseButton !== true) return false;
        const schemaLen = formApi.state.schema.length;
        if (schemaLen <= 1) return false;
        if (formApi.state.collapsedVisibleCount !== undefined) return formApi.state.collapsedVisibleCount < schemaLen;
        return autoOverflow.value;
      });

      const isVertical = computed(() => formApi.state.layout === "vertical");

      return () => {
        const explicitLimit = formApi.state.collapsedVisibleCount !== undefined;
        const schema = explicitLimit ? formApi.getFormSchema(visibleColumns.value) : formApi.state.schema;
        const showActions = formApi.state.showButton !== false;
        const clipped = !explicitLimit && showCollapseButton.value && formApi.state.isCollapsed;
        const renderActions = (inline: boolean): ReturnType<typeof h> =>
          h(
            FormItem,
            {
              class: [
                "pc-design-form-item",
                "pc-query-form-action-item",
                styles.pcQueryFormActions,
                inline ? styles.pcQueryFormActionsInline : null,
              ],
            },
            () =>
              h(Space, { size: 8 }, () => [
                h(Button, { type: "primary", onClick: () => formApi.handleSubmit() }, () => formApi.state.submitText ?? "查询"),
                h(Button, { onClick: () => formApi.handleReset() }, () => formApi.state.resetText ?? "重置"),
              ]),
          );
        const fields = schema.map((item, index) => {
          const compName = typeof item.component === "string" ? item.component : "Custom";
          const Field = typeof item.component === "string" ? resolvePcFormFieldComponent(item.component) : item.component;
          if (!Field) {
            return h(FormItem, { label: item.label, key: item.fieldName, class: "pc-design-form-item" }, () =>
              h("div", `未知组件: ${compName}`),
            );
          }
          const props = { ...item.componentProps } as Record<string, unknown>;
          const customOnChange = props.onChange as ((value: unknown) => void) | undefined;
          const customOnPressEnter = props.onPressEnter as ((...args: unknown[]) => void) | undefined;
          const isInput = compName === "Input";
          const updateValue = (value: unknown, trigger: "change" | "enter"): void => {
            formApi.formValues[item.fieldName] = value;
            formApi.handleValuesChange(
              { [item.fieldName]: value },
              {
                fieldName: item.fieldName,
                component: compName,
                trigger,
                hasCustomOnChange: typeof customOnChange === "function",
              },
            );
          };
          return h(
            FormItem,
            {
              label: item.label,
              name: item.fieldName,
              key: item.fieldName,
              class: "pc-design-form-item",
              style: {
                ...item.style,
                ...(clipped && index >= visibleColumns.value ? { visibility: "hidden", pointerEvents: "none" } : {}),
              },
            },
            () =>
              h(Field, {
                ...props,
                value: formApi.formValues[item.fieldName],
                modelValue: formApi.formValues[item.fieldName],
                "onUpdate:value": (value: unknown) => {
                  updateValue(value, "change");
                },
                "onUpdate:modelValue": (value: unknown) => {
                  updateValue(value, "change");
                },
                onChange: (value: unknown) => {
                  customOnChange?.(value);
                },
                onPressEnter: (...args: unknown[]) => {
                  customOnPressEnter?.(...args);
                  if (isInput) updateValue(formApi.formValues[item.fieldName], "enter");
                },
              }),
          );
        });
        if (showActions && formApi.state.actionsInline) {
          fields.splice(clipped ? Math.min(visibleColumns.value, fields.length) : fields.length, 0, renderActions(true));
        }
        return h(
          Form,
          {
            layout: formApi.state.layout || "horizontal",
            colon: !isVertical.value,
            labelAlign: "left",
            labelCol: formApi.state.labelCol,
            model: formApi.formValues,
            class: [
              "pc-query-form",
              formApi.state.actionsInline ? ["pc-query-form-actions-inline", styles.pcQueryFormInlineActions] : null,
              isVertical.value ? styles.pcQueryFormVertical : null,
            ],
          },
          {
            default: () =>
              h("div", { class: [styles.pcQueryFormHeader, "pc-query-form-header", "query-form-header"] }, [
                h(
                  "div",
                  {
                    class: [styles.pcQueryFormContainer, "pc-query-form-container"],
                    id: "pc-query-form-container",
                    ref: gridContainerRef,
                    style: clipped ? { maxHeight: `${firstRowHeight.value}px`, overflow: "hidden" } : undefined,
                  },
                  fields,
                ),
                showActions && !formApi.state.actionsInline ? renderActions(false) : null,
                showActions && showCollapseButton.value
                  ? h("div", { class: styles.pcQueryFormOperations }, [
                      h(FormItem, { class: "pc-design-form-item" }, () =>
                        h(
                          Button,
                          {
                            type: "link",
                            class: styles.collapseButton,
                            onClick: () => formApi.toggleCollapse(),
                          },
                          () => [formApi.state.isCollapsed ? "展开" : "收起", CollapseChevron(!!formApi.state.isCollapsed)],
                        ),
                      ),
                    ])
                  : null,
              ]),
          },
        );
      };
    },
  });
}
