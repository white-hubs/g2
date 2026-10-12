import type { StreamEngineClient } from "@g2-client/stream-engine/client";
import { Button, Checkbox, DatePicker, Form, FormItem, Input, InputNumber, Modal, Select, Switch, message } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref, watch, type PropType } from "vue";

import { AttendanceHrPropertyFields } from "../attendance-hr-properties";
import { PERSONNEL_CONTROLS } from "../components/control-catalog";
import { availableFormControlGroups, type FormControlDefinition } from "../form-control-catalog";
import { formFieldPathOptions, type FormSchemaItem } from "../form-schema";

import styles from "./form-process-design.module.css";

const DATE_FORMATS = [
  { label: "年", value: "yyyy" },
  { label: "年-月", value: "yyyy-MM" },
  { label: "年-月-日", value: "yyyy-MM-dd" },
  { label: "年-月-日 时:分", value: "yyyy-MM-dd HH:mm" },
  { label: "年-月-日 时:分:秒", value: "yyyy-MM-dd HH:mm:ss" },
];
const NO_REQUIRED = new Set(["Description", "GroupList", "AddAssetTable", "ChooseAssetTable", "ConsumablesEnter"]);
const NO_PRINT = new Set(["Description", "GroupList", "AddAssetTable", "ChooseAssetTable", "ConsumablesEnter", "ConsumablesOut"]);
const PLACEHOLDER_CONTROLS = new Set([
  "TextInput",
  "TextareaInput",
  "NumberInput",
  "AmountInput",
  "SelectInput",
  "MultipleSelect",
  "DateTime",
  "FileUpload",
  "UserPicker",
  "DeptPicker",
  "Description",
]);
const PARAM_CONTROLS = new Set([
  "CarId",
  "ConsumablesEnter",
  "ConsumablesOut",
  "ChooseAssetTable",
  "ObjectSelect",
  "TargetObjectSelect",
  "RectifyTargetSelect",
  "DeviceStatus",
  "DeviceChangeStatus",
  "OutSourceCom",
  "OutSourceMode",
  "WorkList",
  "FocusWorkRequirement",
  "WorkPermitLevelSelect",
  "WorkPermitRiskCheckItems",
  "WorkPermitAcceptanceItems",
  "ViolatorName",
  "ViolatorPhone",
  ...PERSONNEL_CONTROLS.map((item) => item.id),
]);
const PARAM_SOURCES: Record<string, { label: string; names: string[] }> = {
  WorkPermitLevelSelect: { label: "关联作业类型", names: ["WorkPermitTypeSelect"] },
  WorkPermitRiskCheckItems: { label: "关联作业类型", names: [] },
  WorkPermitAcceptanceItems: { label: "关联作业类型", names: [] },
};

function flatten(items: FormSchemaItem[]): FormSchemaItem[] {
  return items.flatMap((item) => [
    item,
    ...(item.name === "GroupList" && Array.isArray(item.props?.items) ? flatten(item.props.items as FormSchemaItem[]) : []),
  ]);
}

export default defineComponent({
  name: "FormPropertyEditor",
  props: {
    selected: { type: Object as PropType<FormSchemaItem>, required: true },
    formItems: { type: Array as PropType<FormSchemaItem[]>, required: true },
    application: { type: String, default: undefined },
    client: { type: Object as PropType<StreamEngineClient | undefined>, default: undefined },
    onAddNested: { type: Function as PropType<(parentId: string, control: FormControlDefinition, group: string) => void>, required: true },
    onRemoveNested: { type: Function as PropType<(id: string) => void>, required: true },
  },
  setup(props) {
    const linkOpen = ref(false);
    const links = reactive<Record<string, string | undefined>>({});
    watch(
      () => props.selected.id,
      () => {
        linkOpen.value = false;
      },
    );

    const itemProps = () => (props.selected.props ??= {});
    const set = (key: string, value: unknown): void => {
      itemProps()[key] = value;
    };
    const options = () => (Array.isArray(itemProps().options) ? (itemProps().options as string[]) : []);
    const setOptions = (next: string[]): void => set("options", next);
    const allItems = () => flatten(props.formItems);
    const fieldOptions = (names?: string[]) =>
      allItems()
        .filter((item) => item.id !== props.selected.id && (!names || names.includes(String(item.name))))
        .map((item) => ({ label: String(item.title ?? item.name), value: String(item.id) }));
    const fieldSelect = (key: string, label: string, names?: string[]) => (
      <FormItem label={label}>
        <Select
          allowClear
          value={itemProps()[key] == null ? undefined : String(itemProps()[key])}
          options={fieldOptions(names)}
          placeholder="请选择"
          style={{ width: "100%" }}
          onUpdate:value={(value) => set(key, value ?? null)}
        />
      </FormItem>
    );
    const switchField = (key: string, label: string) => (
      <FormItem label={label}>
        <Switch checked={Boolean(itemProps()[key])} onUpdate:checked={(value) => set(key, Boolean(value))} />
      </FormItem>
    );
    const numberField = (key: string, label: string, min: number, max: number) => (
      <FormItem label={label}>
        <InputNumber
          value={Number(itemProps()[key] ?? min)}
          min={min}
          max={max}
          precision={0}
          style={{ width: "100%" }}
          onUpdate:value={(value) => set(key, value == null ? min : Number(value))}
        />
      </FormItem>
    );

    const openLinks = (): void => {
      const values = options();
      if (values.some((value) => !value.trim()) || new Set(values).size !== values.length) {
        message.warning("选项不能为空或重复");
        return;
      }
      for (const key of Object.keys(links)) delete links[key];
      const saved = Array.isArray(itemProps().optionRelateParams)
        ? (itemProps().optionRelateParams as Array<{ opt?: string; contactComponent?: string }>)
        : [];
      for (const option of values) links[option] = saved.find((entry) => entry.opt === option)?.contactComponent || undefined;
      linkOpen.value = true;
    };

    const saveLinks = (): void => {
      const id = String(props.selected.id);
      const entries = options().map((opt) => ({ opt, optId: opt, contactComponent: links[opt] ?? "" }));
      set("optionRelateParams", entries);
      for (const item of allItems()) {
        if (item.id === id) continue;
        item.props ??= {};
        const relate =
          item.props.relateParams && typeof item.props.relateParams === "object"
            ? { ...(item.props.relateParams as Record<string, string>) }
            : {};
        delete relate[id];
        const matched = entries.find((entry) => entry.contactComponent === item.id);
        if (matched) relate[id] = matched.opt;
        item.props.relateParams = Object.keys(relate).length ? relate : null;
      }
      linkOpen.value = false;
      message.success("选项关联已更新");
    };

    return () => {
      const selected = props.selected;
      const name = String(selected.name ?? "");
      const current = itemProps();
      const isOptions = name === "SelectInput" || name === "MultipleSelect";
      return (
        <>
          <div class={styles.panelTitle}>{selected.title}</div>
          <Form layout="horizontal" class={styles.propertyForm}>
            <FormItem label="表单名称">
              <Input
                value={String(selected.title ?? "")}
                disabled={Boolean(selected.props?.disabled)}
                maxlength={20}
                showCount
                onUpdate:value={(value: string) => {
                  selected.title = value;
                }}
              />
            </FormItem>
            <FormItem label="表单宽度">
              <InputNumber
                value={Number(selected.width ?? 100)}
                min={1}
                max={100}
                step={0.01}
                precision={2}
                style={{ width: "100%" }}
                onUpdate:value={(value) => {
                  selected.width = value == null ? 100 : Number(value);
                }}
              />
            </FormItem>
            {name === "DateTimeRange" ? (
              <FormItem label="提示文字">
                <div class={styles.rangePlaceholders}>
                  {[0, 1].map((index) => (
                    <Input
                      key={index}
                      value={String((Array.isArray(current.placeholder) ? current.placeholder[index] : undefined) ?? "")}
                      maxlength={20}
                      placeholder={index === 0 ? "开始日期提示" : "结束日期提示"}
                      onUpdate:value={(value: string) => {
                        const next = Array.isArray(current.placeholder) ? [...current.placeholder] : ["", ""];
                        next[index] = value;
                        set("placeholder", next);
                      }}
                    />
                  ))}
                </div>
              </FormItem>
            ) : PLACEHOLDER_CONTROLS.has(name) ? (
              <FormItem label={name === "Description" ? "提示内容" : "提示文字"}>
                <Input
                  value={typeof current.placeholder === "string" ? current.placeholder : ""}
                  maxlength={name === "Description" ? undefined : 20}
                  showCount={name !== "Description"}
                  placeholder={name === "Description" ? "请设置提示内容" : "请设置提示语"}
                  onUpdate:value={(value: string) => set("placeholder", value)}
                />
              </FormItem>
            ) : null}
            {name === "TextInput" || name === "TextareaInput" ? (
              <FormItem label="默认值">
                <Input
                  value={String(current.defaultValue ?? "")}
                  maxlength={name === "TextInput" ? 20 : undefined}
                  onUpdate:value={(value: string) => set("defaultValue", value)}
                />
              </FormItem>
            ) : null}
            {name === "TextInput" ? switchField("useAsBackLogTitle", "设置为标题") : null}
            {name === "TextareaInput" ? numberField("rows", "显示行数", 2, 99) : null}
            {name === "NumberInput" ? (
              <>
                {fieldSelect("params", "关联参数", ["FileUpload", "ImageUpload"])}
                {numberField("precision", "保留小数", 0, 100)}
                <FormItem label="最小值">
                  <Input
                    value={String(current.minNum ?? "")}
                    placeholder="最小值"
                    onUpdate:value={(value: string) => set("minNum", value)}
                  />
                </FormItem>
                <FormItem label="最大值">
                  <Input
                    value={String(current.maxNum ?? "")}
                    placeholder="最大值"
                    onUpdate:value={(value: string) => set("maxNum", value)}
                  />
                </FormItem>
              </>
            ) : null}
            {name === "AmountInput" ? (
              <>
                {numberField("precision", "保留小数", 0, 3)}
                {switchField("showChinese", "展示大写")}
              </>
            ) : null}
            {isOptions ? (
              <div class={styles.optionEditor}>
                <div class={styles.optionHeader}>
                  <span>选项设置</span>
                  <Button type="link" onClick={() => setOptions([...options(), "新选项"])}>
                    新增选项
                  </Button>
                  <Button type="link" onClick={openLinks}>
                    关联参数
                  </Button>
                </div>
                {options().map((option, index) => (
                  <div class={styles.optionRow} key={index}>
                    <Input
                      value={option}
                      placeholder="请设置选项值"
                      onUpdate:value={(value: string) => {
                        const next = [...options()];
                        next[index] = value;
                        setOptions(next);
                      }}
                    />
                    <Button
                      type="text"
                      disabled={index === 0}
                      onClick={() => {
                        const next = [...options()];
                        [next[index - 1], next[index]] = [next[index], next[index - 1]];
                        setOptions(next);
                      }}
                    >
                      ↑
                    </Button>
                    <Button
                      type="text"
                      disabled={index === options().length - 1}
                      onClick={() => {
                        const next = [...options()];
                        [next[index], next[index + 1]] = [next[index + 1], next[index]];
                        setOptions(next);
                      }}
                    >
                      ↓
                    </Button>
                    <Button type="text" danger onClick={() => setOptions(options().filter((_, itemIndex) => itemIndex !== index))}>
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
            {name === "DateTime" || name === "DateTimeRange" ? (
              <FormItem label="日期格式">
                <Select
                  value={String(current.format ?? "yyyy-MM-dd HH:mm:ss")}
                  options={DATE_FORMATS}
                  style={{ width: "100%" }}
                  onUpdate:value={(value) => set("format", String(value))}
                />
              </FormItem>
            ) : null}
            {name === "DateTime" ? (
              <>
                <FormItem label="默认值">
                  <DatePicker
                    value={current.defaultValue as never}
                    valueFormat="YYYY-MM-DD HH:mm:ss"
                    showTime
                    style={{ width: "100%" }}
                    disabled={Boolean(current.autoCurrentTime)}
                    onUpdate:value={(value) => set("defaultValue", value)}
                  />
                </FormItem>
                <FormItem label="自动带出当前时间">
                  <Checkbox
                    checked={Boolean(current.autoCurrentTime)}
                    onUpdate:checked={(value) => {
                      set("autoCurrentTime", Boolean(value));
                      if (value) set("defaultValue", null);
                    }}
                  />
                </FormItem>
              </>
            ) : null}
            {name === "DateTimeRange" ? (
              <>
                <FormItem label="关联参数">
                  <Select
                    allowClear
                    value={current.params == null ? undefined : String(current.params)}
                    options={formFieldPathOptions(props.formItems, String(selected.id))}
                    placeholder="请选择"
                    style={{ width: "100%" }}
                    onUpdate:value={(value) => set("params", value ?? null)}
                  />
                </FormItem>
                {switchField("showLength", "展示时长")}
              </>
            ) : null}
            {name === "RateInput" ? numberField("rateNum", "最大值", 1, 100) : null}
            {name === "Description" ? (
              <FormItem label="文字颜色">
                <Input type="color" value={String(current.color ?? "#B1B1B1")} onUpdate:value={(value: string) => set("color", value)} />
              </FormItem>
            ) : null}
            {name === "AreaList" ? (
              <FormItem label="数据源">
                <Input value={String(current.api ?? "")} onUpdate:value={(value: string) => set("api", value)} />
              </FormItem>
            ) : null}
            {["RelatedDeviceSelect", "UserPicker", "DeptPicker"].includes(name) ? switchField("multiple", "是否多选") : null}
            {["UserPicker", "DeptPicker"].includes(name) ? switchField("defaultValue", "默认值") : null}
            {name === "UserPicker" ? fieldSelect("params", "关联部门") : null}
            {name === "AlarmRecords" ? (
              <>
                {fieldSelect("params", "关联设备", ["RelatedDeviceSelect"])}
                {fieldSelect("params2", "关联时间区间", ["DateTimeRange", "TimePickerRange"])}
              </>
            ) : null}
            {name === "GroupList" ? (
              <>
                {switchField("closeAdd", "关闭添加(根节点)")}
                {switchField("closeAddChild", "关闭添加(子节点)")}
                <FormItem label="添加子控件">
                  <Select
                    showSearch
                    optionFilterProp="label"
                    placeholder="请选择组件"
                    value={undefined}
                    style={{ width: "100%" }}
                    options={availableFormControlGroups(props.application).map((group) => ({
                      label: group.title,
                      options: group.items.flatMap((entry, index) =>
                        entry.id === "GroupList" ? [] : [{ label: entry.title, value: `${group.title}:${index}` }],
                      ),
                    }))}
                    onUpdate:value={(value) => {
                      const [title, index] = String(value).split(":");
                      const group = availableFormControlGroups(props.application).find((entry) => entry.title === title);
                      const control = group?.items[Number(index)];
                      if (group && control && control.id !== "GroupList") props.onAddNested(String(selected.id), control, group.title);
                    }}
                  />
                </FormItem>
                {(Array.isArray(current.items) ? (current.items as FormSchemaItem[]) : []).map((child) => (
                  <div class={styles.nestedField} key={child.id}>
                    <span>{child.title}</span>
                    <Button type="link" danger onClick={() => props.onRemoveNested(String(child.id))}>
                      删除
                    </Button>
                  </div>
                ))}
              </>
            ) : null}
            {PARAM_CONTROLS.has(name) && current.params !== undefined
              ? fieldSelect(
                  "params",
                  PARAM_SOURCES[name]?.label ?? String(current.paramsLabel ?? "关联参数"),
                  PARAM_SOURCES[name]?.names.length ? PARAM_SOURCES[name]?.names : undefined,
                )
              : null}
            {["WorkPermitRiskCheckItems", "WorkPermitAcceptanceItems"].includes(name) ? fieldSelect("params2", "关联作业等级") : null}
            <AttendanceHrPropertyFields selected={selected} formItems={props.formItems} client={props.client} />
            {!NO_REQUIRED.has(name) ? switchField("required", "必填项") : null}
            {!NO_PRINT.has(name) ? switchField("showPrint", "打印展示") : null}
          </Form>
          <Modal
            open={linkOpen.value}
            title="选项关联"
            width={720}
            onCancel={() => {
              linkOpen.value = false;
            }}
            onOk={saveLinks}
          >
            <p>根据选择的选项，显示其他控件。</p>
            {options().map((option) => (
              <div class={styles.linkRow} key={option}>
                <span>{option}</span>
                <Select
                  allowClear
                  value={links[option]}
                  placeholder="显示以下控件"
                  options={fieldOptions()}
                  style={{ width: "100%" }}
                  onUpdate:value={(value) => {
                    links[option] = value == null ? undefined : String(value);
                  }}
                />
              </div>
            ))}
          </Modal>
        </>
      );
    };
  },
});
