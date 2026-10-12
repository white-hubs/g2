import type { AttendanceHrClient } from "@g2-client/stream-engine/client";
import { Button, Form, FormItem, Input, Modal, Select, Spin, message } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref, type PropType } from "vue";

import { ATTENDANCE_HR_NAMES, HR_CONTROLS } from "./components/attendance-hr-catalog";
import { flattenFormItems, formFieldPathOptions, type FormSchemaItem } from "./form-schema";

export type AttendanceHrLink = { key: "params" | "params1" | "params2"; label: string };

export function attendanceHrLinks(name: string, title = ""): AttendanceHrLink[] {
  switch (name) {
    case "VacationBalance":
      return [{ key: "params", label: "请假类型" }];
    case "VacationDate":
      return [{ key: "params", label: title.includes("销假") ? "关联请假单" : "请假类型" }];
    case "VacationLength":
    case "DisposeVacationLength":
      return [
        { key: "params", label: "请假类型" },
        { key: "params2", label: "请假时间" },
      ];
    case "SupplementClass":
      return [{ key: "params", label: "补卡日期" }];
    case "OvertimeLength":
      return [
        { key: "params", label: "加班类型" },
        { key: "params2", label: "加班时间" },
      ];
    case "OvertimeCompensation":
      return [{ key: "params", label: "加班类型" }];
    case "ChangeClass":
      return [
        { key: "params1", label: "换班类型" },
        { key: "params", label: title.includes("被换") ? "被换班人员" : "换班人员" },
        { key: "params2", label: title.includes("被换") ? "被换班日期" : "换班日期" },
      ];
    case "DepartureTimeLength":
    case "BusinessTripTimeLength":
      return [
        { key: "params", label: "开始时间" },
        { key: "params2", label: "结束时间" },
      ];
    case "ServicePeriod":
      return [{ key: "params", label: "关联参数" }];
    default:
      return HR_CONTROLS.some((entry) => entry.name === name && "attr" in entry) ? [{ key: "params", label: "考勤时间" }] : [];
  }
}

type HolidayRule = { id: string; name: string; unit?: string };
type LinkRow = { opt: HolidayRule; contactComponent: string };

export const AttendanceHrPropertyFields = defineComponent({
  name: "AttendanceHrPropertyFields",
  props: {
    selected: { type: Object as PropType<FormSchemaItem>, required: true },
    formItems: { type: Array as PropType<FormSchemaItem[]>, required: true },
    client: { type: Object as PropType<AttendanceHrClient | undefined>, default: undefined },
  },
  setup(props) {
    const open = ref(false);
    const loading = ref(false);
    const linkRows = ref<LinkRow[]>([]);
    const pending = reactive<Record<string, string>>({});
    let version = 0;
    const allItems = () => flattenFormItems(props.formItems);
    const otherOptions = () =>
      allItems()
        .filter((item) => item.id !== props.selected.id)
        .map((item) => ({ label: String(item.title ?? item.name ?? ""), value: String(item.id) }));
    const set = (key: string, value: unknown) => {
      (props.selected.props ??= {})[key] = value;
    };
    const showLinks = () => {
      if (!props.client) {
        message.error("请假类型服务未就绪");
        return;
      }
      const current = ++version;
      open.value = true;
      loading.value = true;
      void props.client
        .listHolidayRules()
        .then((rows) => {
          if (current !== version) return;
          const saved = Array.isArray(props.selected.props?.optionRelateParams)
            ? (props.selected.props.optionRelateParams as Array<{ optId?: unknown; contactComponent?: unknown }>)
            : [];
          linkRows.value = rows
            .filter((row): row is HolidayRule => row !== null && typeof row === "object" && "id" in row && "name" in row)
            .map((opt) => ({
              opt,
              contactComponent: String(saved.find((entry) => String(entry.optId) === String(opt.id))?.contactComponent ?? ""),
            }));
          for (const key of Object.keys(pending)) delete pending[key];
          for (const row of linkRows.value) pending[row.opt.id] = row.contactComponent;
        })
        .catch((error: unknown) => {
          if (current === version) message.error(error instanceof Error ? error.message : "请假类型加载失败");
        })
        .finally(() => {
          if (current === version) loading.value = false;
        });
    };
    const saveLinks = () => {
      const selectedTargets = linkRows.value.map((row) => pending[row.opt.id]).filter(Boolean);
      if (new Set(selectedTargets).size !== selectedTargets.length) {
        message.warning("一个控件只能关联一个请假类型");
        return;
      }
      const sourceId = String(props.selected.id);
      set(
        "optionRelateParams",
        linkRows.value.map(({ opt }) => ({ opt, optId: opt.id, contactComponent: pending[opt.id] ?? "" })),
      );
      for (const item of allItems()) {
        if (item.id === sourceId) continue;
        item.props ??= {};
        const current =
          item.props.relateParams && typeof item.props.relateParams === "object"
            ? { ...(item.props.relateParams as Record<string, string>) }
            : {};
        delete current[sourceId];
        const matched = linkRows.value.find((row) => pending[row.opt.id] === item.id);
        if (matched) current[sourceId] = matched.opt.id;
        item.props.relateParams = Object.keys(current).length ? current : null;
      }
      open.value = false;
      version++;
      message.success("选项关联已更新");
    };
    return () => {
      const name = String(props.selected.name ?? "");
      if (!ATTENDANCE_HR_NAMES.has(name)) return null;
      const links = attendanceHrLinks(name, String(props.selected.title ?? ""));
      return (
        <>
          {["VacationType", "OvertimeType", "ChangePerson"].includes(name) ? (
            <FormItem label="提示文字">
              <Input
                value={String(props.selected.props?.placeholder ?? "")}
                maxlength={20}
                placeholder="请设置提示语"
                onUpdate:value={(next: string) => set("placeholder", next)}
              />
            </FormItem>
          ) : null}
          {links.map(({ key, label }) => (
            <FormItem key={key} label={label}>
              <Select
                allowClear
                value={props.selected.props?.[key] == null ? undefined : String(props.selected.props[key])}
                options={
                  ["OvertimeLength", "OvertimeCompensation"].includes(name)
                    ? formFieldPathOptions(props.formItems, String(props.selected.id), ",")
                    : otherOptions()
                }
                placeholder="请选择"
                style={{ width: "100%" }}
                onUpdate:value={(next) => set(key, next ?? null)}
              />
            </FormItem>
          ))}
          {name === "RoleList" ? (
            <FormItem label="是否多选">
              <Select
                value={props.selected.props?.multiple ? "multiple" : "single"}
                options={[
                  { label: "单选", value: "single" },
                  { label: "多选", value: "multiple" },
                ]}
                style={{ width: "100%" }}
                onUpdate:value={(next) => set("multiple", next === "multiple")}
              />
            </FormItem>
          ) : null}
          {name === "VacationType" ? (
            <FormItem label="选项关联">
              <Button type="link" onClick={showLinks}>
                关联参数
              </Button>
            </FormItem>
          ) : null}
          <Form.ItemRest>
            <Modal
              open={open.value}
              title="请假类型选项关联"
              width={720}
              confirmLoading={loading.value}
              okText="确定"
              cancelText="取消"
              onCancel={() => {
                open.value = false;
                version++;
              }}
              onOk={saveLinks}
            >
              {loading.value ? (
                <div style={{ minHeight: "80px", display: "grid", placeItems: "center" }}>
                  <Spin />
                </div>
              ) : (
                linkRows.value.map(({ opt }) => (
                  <div
                    key={opt.id}
                    style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: "12px", alignItems: "center", marginBottom: "10px" }}
                  >
                    <span>
                      {opt.name}
                      {opt.unit ? `（${opt.unit}）` : ""}
                    </span>
                    <Select
                      allowClear
                      value={pending[opt.id] || undefined}
                      options={otherOptions()}
                      placeholder="显示以下控件"
                      onUpdate:value={(next) => {
                        pending[opt.id] = next == null ? "" : String(next);
                      }}
                    />
                  </div>
                ))
              )}
            </Modal>
          </Form.ItemRest>
        </>
      );
    };
  },
});
