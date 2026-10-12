import { describe, expect, test } from "bun:test";

import {
  fieldKey,
  formFieldPathOptions,
  initialFormValue,
  matchesOptionRelation,
  parseSchema,
  resolveSchemaRaw,
  syncAttachmentCounts,
  topLevelSchema,
  validateDesignItems,
  type FormSchemaItem,
} from "./form-schema";

describe("form-schema", () => {
  test("parses formJson array and keeps control name for registry", () => {
    const items = parseSchema(
      JSON.stringify([
        { id: "a1", name: "ProblemTypeSelect", title: "隐患类型", width: 50, props: { required: true } },
        { id: "a2", name: "FileUpload", title: "上传附件", width: 100 },
      ]),
    );
    expect(topLevelSchema(items).map((item) => item.name)).toEqual(["ProblemTypeSelect", "FileUpload"]);
    expect(fieldKey(items[0]!)).toBe("a1");
  });

  test("detail uses the saved task form version from properties", () => {
    const task = { properties: { formJson: '[{"id":"snapshot"}]' }, formJson: '[{"id":"top"}]' };
    const flow = { formJson: '[{"id":"current"}]' };
    expect(parseSchema(resolveSchemaRaw(true, task, flow))[0]?.id).toBe("snapshot");
    expect(parseSchema(resolveSchemaRaw(false, task, flow))[0]?.id).toBe("top");
  });

  test("accepts structured schema and skips empty task snapshots", () => {
    const flow = { formJson: [{ id: "live", name: "TextInput" }] };
    expect(parseSchema(resolveSchemaRaw(true, { properties: { formJson: "" } }, flow))[0]?.id).toBe("live");
    expect(parseSchema(resolveSchemaRaw(true, { properties: JSON.stringify({ formJson: '[{"id":"snapshot"}]' }) }, flow))[0]?.id).toBe(
      "snapshot",
    );
  });

  test("keeps option links and legacy publish validation for nested controls", () => {
    const dependent = { id: "dependent", name: "TextInput", title: "说明", props: { relateParams: { selector: "选项1" } } };
    expect(matchesOptionRelation(dependent, { selector: "选项1" })).toBe(true);
    expect(matchesOptionRelation(dependent, { selector: ["选项2"] })).toBe(false);
    expect(
      validateDesignItems([
        {
          id: "group",
          name: "GroupList",
          title: "组合",
          props: { items: [{ id: "selector", name: "SelectInput", title: "选择", props: { options: ["选项1", ""] } }] },
        },
      ]),
    ).toContain("选择 含有空选项");
  });

  test("new GroupList rows apply text, date, staff and department defaults independently", () => {
    const now = new Date(2026, 8, 28, 10, 20, 30);
    const user = { id: "staff-1", name: "张三", organizations: [{ id: "dept-1", name: "维修部" }] };
    expect(initialFormValue({ name: "TextInput", props: { defaultValue: "默认单行" } }, user, now)).toBe("默认单行");
    expect(initialFormValue({ name: "TextareaInput", props: { defaultValue: "默认\n多行" } }, user, now)).toBe("默认\n多行");
    expect(initialFormValue({ name: "DateTime", props: { format: "yyyy-MM-dd HH:mm", autoCurrentTime: true } }, user, now)).toBe(
      "2026-09-28 10:20",
    );
    expect(
      initialFormValue(
        { name: "DateTime", props: { format: "yyyy-MM", defaultValue: "2025-12-01 12:00:00", autoCurrentTime: true } },
        user,
        now,
      ),
    ).toBe("2025-12");
    const staff: FormSchemaItem = { name: "UserPicker", props: { defaultValue: true } };
    const first = initialFormValue(staff, user, now) as Array<{ id: string; name: string }>;
    const second = initialFormValue(staff, user, now);
    first[0]!.name = "改名";
    expect(second).toEqual([{ id: "staff-1", name: "张三" }]);
    expect(initialFormValue({ name: "DeptPicker", props: { defaultValue: true } }, user, now)).toEqual([{ id: "dept-1", name: "维修部" }]);
    expect(initialFormValue({ name: "UserPicker", props: { defaultValue: false } }, user, now)).toBeNull();
  });

  test("date ranges keep legacy group paths in their association options", () => {
    const items: FormSchemaItem[] = [
      { id: "range", name: "DateTimeRange", title: "停车日期" },
      { id: "group", name: "GroupList", title: "车辆", props: { items: [{ id: "plate", name: "CarId", title: "车牌" }] } },
    ];
    expect(formFieldPathOptions(items, "range")).toEqual([
      { label: "车辆", value: "group" },
      { label: "车辆>车牌", value: "group>plate" },
    ]);
    expect(formFieldPathOptions(items, "range", ",")[1]).toEqual({ label: "车辆>车牌", value: "group,plate" });
  });

  test("attachment counts follow each GroupList row through additions and removals", () => {
    const items: FormSchemaItem[] = [{ id: "count", name: "NumberInput", props: { params: "files" } }];
    const first: Record<string, unknown> = { files: [{ id: "a" }, { id: "b" }], count: null };
    const second: Record<string, unknown> = { files: null, count: 9 };
    expect(syncAttachmentCounts(items, first, { files: [{ id: "root" }] })).toBe(true);
    expect(first.count).toBe(2);
    expect(syncAttachmentCounts(items, second, { files: [{ id: "root" }] })).toBe(true);
    expect(second.count).toBe(0);
    first.files = [];
    expect(syncAttachmentCounts(items, first)).toBe(true);
    expect(first.count).toBe(0);
    expect(syncAttachmentCounts(items, first)).toBe(false);
    const linkedToRoot: Record<string, unknown> = { count: null };
    expect(syncAttachmentCounts(items, linkedToRoot, { files: [{ id: "root" }] })).toBe(true);
    expect(linkedToRoot.count).toBe(1);
  });
});
