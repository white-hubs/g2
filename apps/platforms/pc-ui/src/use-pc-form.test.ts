import { describe, expect, test } from "bun:test";

import { measureQueryRows } from "./pc-form-ui";
import { usePcForm } from "./use-pc-form";

describe("usePcForm", () => {
  test("筛选项按实际行高决定是否展示展开按钮，不要求页面主动传开关", () => {
    const [, formApi] = usePcForm({
      layout: "horizontal",
      schema: [
        { component: "Input", fieldName: "a", label: "A" },
        { component: "Input", fieldName: "b", label: "B" },
      ],
      handleSubmit: () => undefined,
    });
    expect(formApi.state.showCollapseButton).toBeUndefined();
    expect(
      measureQueryRows([
        { top: 12, bottom: 44 },
        { top: 12, bottom: 44 },
      ]),
    ).toEqual({ firstRowCount: 2, firstRowHeight: 48, overflow: false });
    expect(
      measureQueryRows([
        { top: 12, bottom: 44 },
        { top: 68, bottom: 100 },
      ]),
    ).toEqual({ firstRowCount: 1, firstRowHeight: 48, overflow: true });
  });
  test("动态查询选项更新保留用户输入和其他字段，未知字段明确报错", () => {
    const [, api] = usePcForm({
      layout: "horizontal",
      schema: [
        { component: "Input", fieldName: "keyword", label: "关键字" },
        { component: "Select", fieldName: "type", label: "类型" },
      ],
      handleSubmit: () => undefined,
    });
    api.setFieldValue("keyword", "已输入内容");
    api.setFieldValue("type", "a");
    api.updateFieldSchema({
      component: "Select",
      fieldName: "type",
      label: "类型",
      componentProps: { options: [{ label: "类型 A", value: "a" }] },
    });
    expect(api.formValues).toEqual({ keyword: "已输入内容", type: "a" });
    expect(api.getFormSchema(2).map((item) => item.fieldName)).toEqual(["keyword", "type"]);
    expect(() => api.updateFieldSchema({ component: "Input", fieldName: "missing", label: "不存在" })).toThrow("查询字段不存在");
  });
  test("handleSubmit receives current form values from schema defaults", () => {
    let submitted: Record<string, unknown> | undefined;
    const [PcForm, formApi] = usePcForm({
      layout: "horizontal",
      schema: [
        { component: "Input", fieldName: "keyword", label: "关键字", defaultValue: "abc" },
        { component: "Select", fieldName: "type", label: "类型", defaultValue: "" },
      ],
      handleSubmit: (values) => {
        submitted = { ...values };
      },
    });

    expect(PcForm).toBeDefined();
    formApi.handleSubmit();
    expect(submitted).toEqual({ keyword: "abc", type: "" });
  });

  test("supports placing query actions after the last visible field", () => {
    const [, formApi] = usePcForm({
      layout: "horizontal",
      actionsInline: true,
      schema: [{ component: "Input", fieldName: "keyword", label: "关键字" }],
      handleSubmit: () => undefined,
    });

    expect(formApi.state.actionsInline).toBe(true);
  });

  test("handleReset restores defaults then calls options.handleReset", () => {
    let resetCalls = 0;
    const [, formApi] = usePcForm({
      layout: "horizontal",
      schema: [{ component: "Input", fieldName: "keyword", label: "关键字", defaultValue: "init" }],
      handleSubmit: () => undefined,
      handleReset: () => {
        resetCalls += 1;
      },
    });

    formApi.setFieldValue("keyword", "changed");
    formApi.handleReset();
    expect(formApi.formValues.keyword).toBe("init");
    expect(resetCalls).toBe(1);
  });

  test("onHydratedQuery fires once when queryState is present", async () => {
    let hydratedCalls = 0;
    usePcForm({
      layout: "horizontal",
      schema: [{ component: "Input", fieldName: "keyword", label: "关键字", defaultValue: "" }],
      handleSubmit: () => undefined,
      queryState: { state: {} },
      onHydratedQuery: () => {
        hydratedCalls += 1;
      },
    });

    expect(hydratedCalls).toBe(0);
    await Promise.resolve();
    expect(hydratedCalls).toBe(1);
  });

  test("onHydratedQuery does not fire without queryState", async () => {
    let hydratedCalls = 0;
    usePcForm({
      layout: "horizontal",
      schema: [{ component: "Input", fieldName: "keyword", label: "关键字", defaultValue: "" }],
      handleSubmit: () => undefined,
      onHydratedQuery: () => {
        hydratedCalls += 1;
      },
    });

    await Promise.resolve();
    expect(hydratedCalls).toBe(0);
  });

  test("collapsedVisibleCount limits fields when collapsed", () => {
    const [, formApi] = usePcForm({
      layout: "horizontal",
      showCollapseButton: true,
      collapsedVisibleCount: 2,
      isCollapsed: true,
      schema: [
        { component: "Input", fieldName: "keyword", label: "关键字", defaultValue: "" },
        { component: "Input", fieldName: "brand", label: "品牌", defaultValue: "" },
        { component: "Input", fieldName: "area", label: "区域", defaultValue: "" },
        { component: "Input", fieldName: "tag", label: "标签", defaultValue: "" },
      ],
      handleSubmit: () => undefined,
    });

    expect(formApi.getFormSchema(4).map((item) => item.fieldName)).toEqual(["keyword", "brand"]);
    formApi.toggleCollapse();
    expect(formApi.getFormSchema(4).map((item) => item.fieldName)).toEqual(["keyword", "brand", "area", "tag"]);
  });
});
