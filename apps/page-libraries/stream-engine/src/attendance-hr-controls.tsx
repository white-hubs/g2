import type { AttendanceHrClient, AttendanceHrPage } from "@g2-client/stream-engine/client";
import {
  Button,
  Cascader,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Radio,
  RadioGroup,
  RangePicker,
  Select,
  Space,
  Switch,
  Table,
  dayjs,
  message,
} from "@g2-platform/pc-ui";
import { defineComponent, onMounted, ref, watch, type PropType, type VNode } from "vue";

import { attendanceLinkedValue } from "./attendance-hr-links";
import { ATTENDANCE_HR_NAMES, HR_CONTROLS } from "./components/attendance-hr-catalog";
import { UserPickerControl, type FormControlHost } from "./form-controls";
import type { FormSchemaItem } from "./form-schema";

type Option = { id: string; name: string; [key: string]: unknown };
type AttendanceHost = FormControlHost & { client: FormControlHost["client"] & AttendanceHrClient };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function id(value: unknown): string {
  if (value == null) return "";
  return typeof value === "object" ? String(record(value).id ?? record(value).value ?? "") : String(value);
}

function name(value: unknown): string {
  if (value == null || value === "") return "";
  return typeof value === "object"
    ? String(record(value).name ?? record(value).label ?? record(value).flowInstanceName ?? "")
    : String(value);
}

function option(value: unknown): Option | undefined {
  const row = record(value);
  const key = row.id ?? row.value ?? row.code;
  if (key == null) return undefined;
  return { ...row, id: String(key), name: String(row.name ?? row.label ?? row.doorTypeName ?? key) };
}

function options(value: unknown[]): Option[] {
  return value.map(option).filter((row): row is Option => Boolean(row));
}

function display(value: unknown): string {
  if (Array.isArray(value)) return value.map(name).filter(Boolean).join("、") || "--";
  return name(value) || "--";
}

function rootValues(host: AttendanceHost): Record<string, unknown> {
  return host.rootFormValues ?? host.formValues ?? {};
}

function linked(host: AttendanceHost, item: FormSchemaItem, key = "params", fallbackName = ""): unknown {
  return attendanceLinkedValue(item.props?.[key], host, fallbackName);
}

const AsyncOption = defineComponent({
  props: {
    value: { type: null as unknown as PropType<unknown>, required: true },
    load: { type: Function as PropType<() => Promise<unknown[]>>, required: true },
    dependency: { type: String, default: "" },
    placeholder: { type: String, default: "请选择" },
    readonly: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    multiple: { type: Boolean, default: false },
    category: { type: Boolean, default: false },
    clock: { type: Boolean, default: false },
    autoSelectSingle: { type: Boolean, default: false },
    clearOnDependencyChange: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const rows = ref<Option[]>([]);
    const loading = ref(false);
    let version = 0;
    watch(
      () => [props.dependency, props.readonly, props.disabled] as const,
      async (_, previous) => {
        const current = ++version;
        if (previous && previous[0] !== props.dependency && !props.readonly && props.clearOnDependencyChange) emit("update:value", null);
        if (props.readonly || props.disabled) {
          rows.value = [];
          loading.value = false;
          return;
        }
        loading.value = true;
        try {
          const result = await props.load();
          if (current === version) {
            const fresh = props.clock
              ? clockOptions(result)
              : props.category
                ? result.map((row) => option({ ...record(row), id: record(row).code })).filter((row): row is Option => Boolean(row))
                : options(result);
            if (props.autoSelectSingle && fresh.length === 1 && !props.value) emit("update:value", fresh[0]);
            const persisted = (Array.isArray(props.value) ? props.value : [props.value])
              .map(option)
              .filter((row): row is Option => Boolean(row));
            rows.value = [...fresh, ...persisted.filter((row) => !fresh.some((entry) => entry.id === row.id))];
          }
        } catch (error) {
          if (current === version) message.error(error instanceof Error ? error.message : "选项加载失败");
        } finally {
          if (current === version) loading.value = false;
        }
      },
      { immediate: true },
    );
    return () =>
      props.readonly ? (
        <span>{display(props.value)}</span>
      ) : (
        <Select
          value={
            props.multiple
              ? Array.isArray(props.value)
                ? props.value.map(id)
                : []
              : id(Array.isArray(props.value) ? props.value[0] : props.value) || undefined
          }
          mode={props.multiple ? "multiple" : undefined}
          loading={loading.value}
          disabled={props.disabled}
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder={props.placeholder}
          style={{ width: "100%" }}
          options={rows.value.map((row) => ({ label: row.name, value: row.id, disabled: row.enabled === false }))}
          onUpdate:value={(next) => {
            if (props.multiple) {
              const selected = Array.isArray(next) ? next : [];
              emit(
                "update:value",
                rows.value.filter((row) => selected.some((entry: unknown) => id(entry) === row.id)),
              );
              return;
            }
            const selected = rows.value.find((row) => row.id === String(next));
            emit("update:value", !selected ? null : props.category ? { label: selected.name, value: selected.id } : selected);
          }}
        />
      );
  },
});

const ServicePeriodControl = defineComponent({
  props: {
    value: { type: null as unknown as PropType<unknown>, required: true },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    onMounted(() => {
      if (!props.readonly && !props.value) emit("update:value", { radioValue: "limited", date: "" });
    });
    return () => {
      const current = record(props.value);
      const mode = String(current.radioValue ?? "limited");
      const date = String(current.date ?? "");
      if (props.readonly)
        return <span>{mode === "limited" ? `有期限${date ? `：${date}` : ""}` : mode === "unlimited" ? "无期限" : "--"}</span>;
      return (
        <RadioGroup
          value={mode}
          onUpdate:value={(next) => emit("update:value", { radioValue: next, date: next === "limited" ? date : "" })}
        >
          <Space>
            <Radio value="limited">有期限</Radio>
            {mode === "limited" ? (
              <DatePicker
                value={date as never}
                valueFormat="YYYY-MM-DD"
                format="YYYY-MM-DD"
                placeholder="请选择期限时间"
                onUpdate:value={(next) => emit("update:value", { radioValue: "limited", date: next ?? "" })}
              />
            ) : null}
            <Radio value="unlimited">无期限</Radio>
          </Space>
        </RadioGroup>
      );
    };
  },
});

const AttendanceHrControl = defineComponent({
  name: "StreamEngineAttendanceHrControl",
  props: {
    item: { type: Object as PropType<FormSchemaItem>, required: true },
    value: { type: null as unknown as PropType<unknown>, required: true },
    host: { type: Object as PropType<AttendanceHost>, required: true },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const change = (next: unknown) => emit("update:value", next);
    const field = (key = "params", fallbackName = "") => linked(props.host, props.item, key, fallbackName);
    const deps = (...values: unknown[]) =>
      values
        .map((value) => (value == null || value === "" ? "\u0000" : typeof value === "object" ? JSON.stringify(value) : String(value)))
        .join("|");
    return (): VNode => {
      const type = String(props.item.name);
      const readonly = Boolean(props.host.readonly);
      const client = props.host.client;
      const sponsorId = id(rootValues(props.host).sponsorId);
      switch (type) {
        case "VacationType":
          return (
            <AsyncOption
              value={props.value}
              readonly={readonly}
              placeholder={String(props.item.props?.placeholder || "请选择请假类型")}
              load={() => client.listHolidayRules()}
              onUpdate:value={change}
            />
          );
        case "VacationBalance": {
          const holiday = field();
          return (
            <ComputedField
              value={props.value}
              readonly={readonly}
              suffix={[-1, "-1", "NO_LIMITED", "NOT_CONFIGURED"].includes(props.value as string) ? "" : "小时"}
              dependency={deps(sponsorId, id(holiday))}
              placeholder="自动填充"
              format={(value) =>
                value === -1 || value === "-1" || value === "NO_LIMITED" ? "不限制" : value === "NOT_CONFIGURED" ? "-" : String(value ?? "")
              }
              load={async () => {
                const balance = record(await client.getVacationBalance({ staffId: sponsorId, holidayRuleId: id(holiday), unit: "小时" }));
                return balance.notLimit ? "-1" : (balance.total ?? null);
              }}
              onUpdate:value={change}
            />
          );
        }
        case "VacationDate":
          return (
            <VacationDateControl
              value={props.value}
              readonly={readonly}
              cancellation={props.host.businessType === "CANCEL_LEAVE"}
              linkedLeave={field()}
              client={client}
              onUpdate:value={change}
            />
          );
        case "VacationLength":
        case "DisposeVacationLength": {
          const holiday = field();
          const selectedPeriod = period(field("params2"));
          return (
            <ComputedField
              value={props.value}
              readonly={readonly}
              dependency={deps(sponsorId, id(holiday), selectedPeriod)}
              format={durationText}
              load={() =>
                client.calculateVacationDuration({
                  businessType: props.host.businessType,
                  staffId: sponsorId,
                  holidayRuleId: type === "DisposeVacationLength" ? String(record(holiday).holidayRuleId ?? "") : id(holiday),
                  period: selectedPeriod,
                })
              }
              onUpdate:value={change}
            />
          );
        }
        case "AssociationLeaveForm":
          return <LeaveFormPicker value={props.value} client={client} readonly={readonly} onUpdate:value={change} />;
        case "SupplementClass": {
          const selectedDate = dateString(field());
          return (
            <AsyncOption
              value={props.value}
              readonly={readonly}
              disabled={!selectedDate}
              dependency={deps(sponsorId, selectedDate)}
              clock
              autoSelectSingle
              clearOnDependencyChange
              placeholder="请选择补卡班次"
              load={() => client.listClockInLogs({ userId: sponsorId, clockInDate: selectedDate, abnormal: true })}
              onUpdate:value={change}
            />
          );
        }
        case "OvertimeType": {
          const rows = [
            { label: "工作日", value: "WORK" },
            { label: "休息日", value: "REST" },
            { label: "节假日", value: "FESTIVAL" },
          ];
          return readonly ? (
            <span>{rows.find((row) => row.value === props.value)?.label ?? "--"}</span>
          ) : (
            <Select
              value={props.value == null ? undefined : String(props.value)}
              options={rows}
              allowClear
              placeholder={String(props.item.props?.placeholder || "请选择加班类型")}
              style={{ width: "100%" }}
              onUpdate:value={change}
            />
          );
        }
        case "OvertimeLength": {
          const overtimeType = id(field("params", "OvertimeType"));
          const selectedPeriod = overtimePeriod(field("params2", "DateTimeRange"));
          return (
            <OvertimeLengthControl
              value={props.value}
              readonly={readonly}
              workOvertimeType={overtimeType}
              period={selectedPeriod}
              client={client}
              onUpdate:value={change}
            />
          );
        }
        case "OvertimeCompensation": {
          const overtimeType = id(field("params", "OvertimeType"));
          return (
            <AsyncOption
              value={props.value}
              readonly={readonly}
              disabled={!overtimeType}
              dependency={overtimeType}
              autoSelectSingle
              clearOnDependencyChange
              placeholder="请选择加班补偿"
              load={() =>
                client.listOvertimeCompensations({
                  workOvertimeType: overtimeType,
                  processInstanceId: props.host.processInstanceId || String(rootValues(props.host).processInstanceId ?? "") || undefined,
                })
              }
              onUpdate:value={change}
            />
          );
        }
        case "DutyType": {
          const rows = [
            { id: "ARRANGE", name: "排班制" },
            { id: "DUTY", name: "值班制" },
          ];
          return readonly ? (
            <span>{display(props.value)}</span>
          ) : (
            <Select
              value={id(props.value) || undefined}
              options={rows.map((row) => ({ label: row.name, value: row.id }))}
              allowClear
              placeholder="请选择换班类型"
              style={{ width: "100%" }}
              onUpdate:value={(next) => change(rows.find((row) => row.id === String(next)) ?? null)}
            />
          );
        }
        case "ChangeClass": {
          const user = props.item.props?.params ? id(field()) : sponsorId;
          const workType = id(field("params1"));
          const day = String(field("params2") ?? "");
          return (
            <AsyncOption
              value={props.value}
              readonly={readonly}
              disabled={!user || !workType || !day}
              dependency={deps(user, workType, day)}
              clearOnDependencyChange
              placeholder="请选择换班班次"
              load={() => client.listExchangeClasses({ staffId: user, workType, day })}
              onUpdate:value={change}
            />
          );
        }
        case "ChangePerson": {
          const selected = props.value && typeof props.value === "object" ? [props.value as { id: string; name: string }] : [];
          return (
            <UserPickerControl
              value={selected}
              client={client}
              getOuaaClient={props.host.getOuaaClient}
              readonly={readonly}
              placeholder={String(props.item.props?.placeholder || "请选择人员")}
              onUpdate:value={(next) => change(next[0] ?? null)}
            />
          );
        }
        case "DepartureTimeLength":
        case "BusinessTripTimeLength": {
          const start = field();
          const end = field("params2");
          return (
            <ComputedField
              value={props.value}
              readonly={readonly}
              editable={type === "BusinessTripTimeLength"}
              suffix="小时"
              dependency={deps(sponsorId, start, end)}
              load={() =>
                type === "DepartureTimeLength"
                  ? client.getLeavePostDuration({
                      businessType: props.host.businessType,
                      staffId: sponsorId,
                      postStartTime: start,
                      postEndTime: end,
                    })
                  : client.getAwayBusinessDuration({ staffId: sponsorId, startTime: start, endTime: end })
              }
              onUpdate:value={change}
            />
          );
        }
        case "PositionList":
          return (
            <AsyncOption
              value={props.value}
              readonly={readonly}
              placeholder="请选择职位"
              load={() => client.listPositions()}
              onUpdate:value={change}
            />
          );
        case "PersonnelCategory":
          return (
            <AsyncOption
              value={props.value}
              readonly={readonly}
              category
              placeholder="请选择人员类别"
              load={() => client.listPersonnelCategories()}
              onUpdate:value={change}
            />
          );
        case "ServicePeriod":
          return <ServicePeriodControl value={props.value} readonly={readonly} onUpdate:value={change} />;
        case "AccessPermission":
          return <PermissionTable kind="access" value={props.value} readonly={readonly} client={client} onUpdate:value={change} />;
        case "ParkingPermission":
          return <PermissionTable kind="parking" value={props.value} readonly={readonly} client={client} onUpdate:value={change} />;
        case "AppointmentList":
          return (
            <AsyncOption
              value={props.value}
              readonly={readonly}
              placeholder="请选择岗位"
              load={async () => (await client.pageAppointments()).records}
              onUpdate:value={change}
            />
          );
        case "RoleList":
          return (
            <AsyncOption
              value={props.value}
              readonly={readonly}
              multiple={Boolean(props.item.props?.multiple)}
              placeholder="请选择角色"
              load={() => client.listRoles()}
              onUpdate:value={(next) => change(Array.isArray(next) ? next : next ? [next] : [])}
            />
          );
        default: {
          const stat = HR_CONTROLS.find((row) => row.name === type && "attr" in row);
          const selectedPeriod = period(field());
          if (stat && "attr" in stat) {
            const suffix = ["SICK_LEAVE", "COMPASSIONATE_LEAVE"].includes(stat.attr) ? "天" : "次";
            return (
              <ComputedField
                value={props.value}
                readonly={readonly}
                suffix={suffix}
                dependency={deps(sponsorId, selectedPeriod)}
                load={() => client.getAttendanceStatistic({ type: stat.attr, userId: sponsorId, period: selectedPeriod })}
                onUpdate:value={change}
              />
            );
          }
          return <span>--</span>;
        }
      }
    };
  },
});

export function renderAttendanceHrControl(
  item: FormSchemaItem,
  value: unknown,
  onChange: (next: unknown) => void,
  host: FormControlHost,
): VNode | undefined {
  if (!ATTENDANCE_HR_NAMES.has(String(item.name))) return undefined;
  return <AttendanceHrControl item={item} value={value} host={host as AttendanceHost} onUpdate:value={onChange} />;
}

const ComputedField = defineComponent({
  props: {
    value: { type: null as unknown as PropType<unknown>, required: true },
    dependency: { type: String, required: true },
    load: { type: Function as PropType<() => Promise<unknown>>, required: true },
    readonly: { type: Boolean, default: false },
    suffix: { type: String, default: "" },
    placeholder: { type: String, default: "系统自动计算" },
    format: { type: Function as PropType<(value: unknown) => string>, default: undefined },
    editable: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const loading = ref(false);
    let version = 0;
    watch(
      () => [props.dependency, props.readonly] as const,
      async (_, previous) => {
        const current = ++version;
        if (props.readonly) {
          loading.value = false;
          return;
        }
        if (!props.dependency || props.dependency.includes("\u0000")) {
          loading.value = false;
          if (previous) emit("update:value", null);
          return;
        }
        loading.value = true;
        try {
          const result = await props.load();
          if (current === version) emit("update:value", result);
        } catch (error) {
          if (current === version) message.error(error instanceof Error ? error.message : "计算失败");
        } finally {
          if (current === version) loading.value = false;
        }
      },
      { immediate: true },
    );
    const valueText = () => (props.format ? props.format(props.value) : String(props.value ?? ""));
    return () =>
      props.readonly ? (
        <span>{valueText() ? `${valueText()}${props.suffix}` : "--"}</span>
      ) : props.editable ? (
        <Input
          value={valueText()}
          suffix={props.suffix}
          placeholder={loading.value ? "正在计算" : props.placeholder}
          onUpdate:value={(next: string) => {
            const numeric = next.replace(/[^0-9.]/g, "");
            const [integer, ...decimals] = numeric.split(".");
            emit("update:value", decimals.length ? `${integer}.${decimals.join("")}` : integer);
          }}
        />
      ) : (
        <Input
          value={valueText() ? `${valueText()}${props.suffix}` : ""}
          disabled
          placeholder={loading.value ? "正在计算" : props.placeholder}
        />
      );
  },
});

const OvertimeLengthControl = defineComponent({
  props: {
    value: { type: null as unknown as PropType<unknown>, required: true },
    workOvertimeType: { type: String, required: true },
    period: { type: String, required: true },
    client: { type: Object as PropType<AttendanceHrClient>, required: true },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const loading = ref(false);
    let version = 0;
    watch(
      [() => props.workOvertimeType, () => props.period, () => props.readonly],
      async (_, previous) => {
        const current = ++version;
        const changed = previous?.[0] !== undefined;
        if (props.readonly) {
          loading.value = false;
          return;
        }
        if (!props.workOvertimeType || !props.period) {
          loading.value = false;
          if (changed) emit("update:value", null);
          return;
        }
        if (!changed && props.value) return;
        loading.value = true;
        try {
          const result = record(await props.client.getOvertimeDuration({ workOvertimeType: props.workOvertimeType, period: props.period }));
          if (current === version) emit("update:value", { name: String(result.name ?? ""), id: String(result.id ?? "") });
        } catch (error) {
          if (current === version) message.error(error instanceof Error ? error.message : "加班时长计算失败");
        } finally {
          if (current === version) loading.value = false;
        }
      },
      { immediate: true },
    );
    return () => {
      const current = record(props.value);
      const hours = current.name == null ? "" : String(current.name);
      if (props.readonly) return <span>{hours ? `${hours}小时` : "--"}</span>;
      return (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <InputNumber
            value={hours === "" ? undefined : Number(hours)}
            min={0}
            style={{ width: "100%" }}
            placeholder={loading.value ? "正在计算" : "系统自动计算"}
            onUpdate:value={(next) => emit("update:value", next == null ? null : { name: String(next), id: "" })}
          />
          <span style={{ whiteSpace: "nowrap" }}>小时</span>
        </div>
      );
    };
  },
});

function durationText(value: unknown): string {
  const row = record(value);
  if (row.value != null) return `${row.value}${row.unit === "DAY" ? "天" : "小时"}`;
  return value == null || value === "" ? "" : String(value);
}

function period(value: unknown): string {
  return Array.isArray(value) && value[0] && value[1] ? `${value[0]},${value[1]}` : "";
}

function overtimePeriod(value: unknown): string {
  if (!Array.isArray(value) || !value[0] || !value[1]) return "";
  const start = dayjs(value[0]);
  const end = dayjs(value[1]);
  return start.isValid() && end.isValid() ? `${start.format("YYYY-MM-DD HH:mm:ss")},${end.format("YYYY-MM-DD HH:mm:ss")}` : "";
}

function dateString(value: unknown): string {
  if (!value) return "";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.valueOf())) return String(value).slice(0, 10);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function statusLabel(value: unknown): string {
  const labels: Record<string, string> = {
    NORMAL: "正常",
    REST: "休息",
    NEGLECT_WORK: "旷工",
    ABNORMAL_WORK: "异常",
    NOT_CHECKED: "未打卡",
    EARLY_CHECKED: "早退",
    LATE_CHECKED: "迟到",
    LACK_CHECKED: "缺卡",
  };
  return labels[String(value)] ?? "";
}

function flowStatusLabel(value: unknown): string {
  const labels: Record<string, string> = {
    SUBMIT: "提交",
    UNDO: "撤销",
    REPEAT: "重新提交",
    APPROVAL: "审批",
    BACK: "撤回",
    COPY: "抄送",
    REJECT: "驳回",
    FINISHED: "完成",
  };
  return labels[String(value)] ?? String(value ?? "--");
}

function clockOptions(value: unknown[]): Option[] {
  return value
    .map((entry) => {
      const row = record(entry);
      const time = new Date(Number(row.requireClockInTime));
      const clockTime = Number.isNaN(time.valueOf())
        ? ""
        : `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`;
      return { id: String(row.id ?? ""), name: `${clockTime} ${row.clockType === "START" ? "上班" : "下班"}${statusLabel(row.state)}` };
    })
    .filter((row) => row.id);
}

const VacationDateControl = defineComponent({
  props: {
    value: { type: null as unknown as PropType<unknown>, required: true },
    linkedLeave: { type: null as unknown as PropType<unknown>, required: true },
    client: { type: Object as PropType<AttendanceHrClient>, required: true },
    cancellation: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const halfDay = ref(false);
    const loading = ref(false);
    const startDate = ref("");
    const startPart = ref("");
    const endDate = ref("");
    const endPart = ref("");
    let version = 0;
    watch(
      () => props.value,
      (next) => {
        const values = Array.isArray(next) ? next : typeof next === "string" ? [next, next] : [];
        if (!values.some((entry) => /,(AM|PM)$/.test(String(entry)))) return;
        halfDay.value = true;
        [startDate.value, startPart.value] = String(values[0] ?? "").split(",");
        [endDate.value, endPart.value] = String(values[1] ?? "").split(",");
      },
      { immediate: true },
    );
    watch(
      () => [id(props.linkedLeave), props.readonly, props.cancellation] as const,
      async ([next], previous) => {
        const current = ++version;
        if (previous && previous[0] !== next && !props.readonly) {
          startDate.value = startPart.value = endDate.value = endPart.value = "";
          emit("update:value", null);
        }
        if (props.readonly || props.cancellation || !next) {
          loading.value = false;
          return;
        }
        const linkedRule = record(props.linkedLeave);
        const knownUnit = record(linkedRule.minimumLeaveTimeUnitConvert).minimumLeaveTimeUnit ?? linkedRule.minimumLeaveTimeUnit;
        if (knownUnit) {
          halfDay.value = knownUnit === "HALF_DAY";
          return;
        }
        loading.value = true;
        try {
          const detail = record(await props.client.getHolidayDetailType(next));
          const detailUnit = record(detail.minimumLeaveTimeUnitConvert).minimumLeaveTimeUnit ?? detail.minimumLeaveTimeUnit;
          if (current === version && detailUnit) halfDay.value = detailUnit === "HALF_DAY";
        } catch (error) {
          if (current === version) message.error(error instanceof Error ? error.message : "请假时间类型加载失败");
        } finally {
          if (current === version) loading.value = false;
        }
      },
      { immediate: true },
    );
    const commitHalfDay = () => {
      if (!startDate.value || !startPart.value || !endDate.value || !endPart.value) {
        emit("update:value", null);
        return;
      }
      const start = `${startDate.value},${startPart.value}`;
      const end = `${endDate.value},${endPart.value}`;
      if (start > end) {
        message.error("开始时间不能大于结束时间");
        return;
      }
      emit("update:value", [start, end]);
    };
    return () => {
      const range = Array.isArray(props.value) && props.value.length === 2 ? (props.value as [string, string]) : undefined;
      if (props.readonly)
        return <span>{(range?.join(" ~ ") ?? String(props.value ?? "")).replaceAll("AM", "上午").replaceAll("PM", "下午") || "--"}</span>;
      const leave = record(props.linkedLeave);
      const earliest = String(leave.leaveStartTime ?? "");
      const latest = String(leave.leaveEndTime ?? "");
      const disabled = !id(props.linkedLeave) || loading.value || (props.cancellation && (!earliest || !latest));
      if (halfDay.value) {
        const parts = [
          { date: startDate, part: startPart },
          { date: endDate, part: endPart },
        ];
        return (
          <Space wrap>
            {parts.map(({ date, part }, index) => (
              <Space key={index}>
                {index ? <span>至</span> : null}
                <DatePicker
                  value={date.value || undefined}
                  valueFormat="YYYY-MM-DD"
                  format="YYYY-MM-DD"
                  disabled={disabled}
                  onUpdate:value={(next) => {
                    date.value = String(next ?? "");
                    commitHalfDay();
                  }}
                />
                <Select
                  value={part.value || undefined}
                  options={[
                    { label: "上午", value: "AM" },
                    { label: "下午", value: "PM" },
                  ]}
                  placeholder="时段"
                  style={{ width: "90px" }}
                  disabled={disabled}
                  onUpdate:value={(next) => {
                    part.value = String(next ?? "");
                    commitHalfDay();
                  }}
                />
              </Space>
            ))}
          </Space>
        );
      }
      return (
        <RangePicker
          value={range as never}
          showTime={{ format: "HH:mm" }}
          valueFormat="YYYY-MM-DD HH:mm"
          format="YYYY-MM-DD HH:mm"
          style={{ width: "100%" }}
          disabled={disabled}
          disabledDate={
            props.cancellation && earliest && latest
              ? (current) => {
                  const day = dateString(current);
                  return day < earliest.slice(0, 10) || day > latest.slice(0, 10);
                }
              : undefined
          }
          onUpdate:value={(next) => {
            if (props.cancellation && Array.isArray(next) && next.some((date) => date < earliest || date > latest)) {
              message.error("销假时间必须在请假时间内");
              return;
            }
            emit("update:value", next?.[0] && next?.[1] ? next : null);
          }}
        />
      );
    };
  },
});

const LeaveFormPicker = defineComponent({
  props: {
    value: { type: null as unknown as PropType<unknown>, required: true },
    client: { type: Object as PropType<AttendanceHrClient>, required: true },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const open = ref(false);
    const loading = ref(false);
    const rows = ref<Record<string, unknown>[]>([]);
    const page = ref(1);
    const total = ref(0);
    const selected = ref<Record<string, unknown> | null>(null);
    let version = 0;
    const load = async () => {
      const current = ++version;
      loading.value = true;
      try {
        const result = await props.client.pageCancellationLeaveForms({ date: null, pageNumber: page.value, pageSize: 10 });
        if (current === version) {
          rows.value = result.records;
          total.value = result.total;
        }
      } catch (error) {
        if (current === version) message.error(error instanceof Error ? error.message : "请假单加载失败");
      } finally {
        if (current === version) loading.value = false;
      }
    };
    const show = () => {
      selected.value = Object.keys(record(props.value)).length ? record(props.value) : null;
      page.value = 1;
      open.value = true;
      void load();
    };
    return () =>
      props.readonly ? (
        <span>{String(record(props.value).flowInstanceName ?? "--")}</span>
      ) : (
        <div>
          <Space>
            <Input readonly value={String(record(props.value).flowInstanceName ?? "")} placeholder="请选择请假单" />
            <Button type="primary" onClick={show}>
              选择
            </Button>
            {props.value ? <Button onClick={() => emit("update:value", null)}>清除</Button> : null}
          </Space>
          <Form.ItemRest>
            <Modal
              open={open.value}
              title="请假单列表"
              width={1100}
              okText="确定"
              cancelText="取消"
              confirmLoading={loading.value}
              onCancel={() => {
                open.value = false;
                version++;
              }}
              onOk={() => {
                emit("update:value", selected.value);
                open.value = false;
                version++;
              }}
            >
              <Table
                rowKey="id"
                size="small"
                loading={loading.value}
                dataSource={rows.value}
                pagination={false}
                scroll={{ x: 850, y: 420 }}
                rowSelection={{
                  type: "radio",
                  selectedRowKeys: selected.value ? [String(selected.value.id)] : [],
                  onChange: (_keys: Array<string | number>, picked: Record<string, unknown>[]) => {
                    selected.value = picked[0] ?? null;
                  },
                }}
                columns={[
                  { title: "编号", dataIndex: "flowFromNo", width: 150 },
                  { title: "请假单名称", dataIndex: "flowInstanceName", width: 180 },
                  { title: "发起时间", dataIndex: "flowSubmitTime", width: 170 },
                  { title: "请假开始时间", dataIndex: "leaveStartTime", width: 170 },
                  { title: "请假结束时间", dataIndex: "leaveEndTime", width: 170 },
                  {
                    title: "处理状态",
                    dataIndex: "flowStatus",
                    width: 100,
                    customRender: ({ text }: { text: string }) => flowStatusLabel(text),
                  },
                ]}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "12px" }}>
                <Pagination
                  current={page.value}
                  pageSize={10}
                  total={total.value}
                  showSizeChanger={false}
                  onChange={(next: number) => {
                    page.value = next;
                    void load();
                  }}
                />
              </div>
            </Modal>
          </Form.ItemRest>
        </div>
      );
  },
});

type PermissionKind = "access" | "parking";
const PermissionTable = defineComponent({
  props: {
    kind: { type: String as PropType<PermissionKind>, required: true },
    value: { type: null as unknown as PropType<unknown>, required: true },
    client: { type: Object as PropType<AttendanceHrClient>, required: true },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const rows = ref<Record<string, unknown>[]>([]);
    const types = ref<Option[]>([]);
    const areas = ref<Record<string, unknown>[]>([]);
    const keyword = ref("");
    const doorType = ref<string>();
    const area = ref<Array<string | number>>([]);
    const page = ref(1);
    const pageSize = ref(10);
    const total = ref(0);
    const loading = ref(false);
    let version = 0;
    const enabledKey = () => (props.kind === "access" ? "accessControl" : "parkingControl");
    const rowsKey = () => (props.kind === "access" ? "accessControlRows" : "parkingControlRows");
    const selectedRows = (): Record<string, unknown>[] => {
      const current = record(props.value);
      const chosenRows = current[rowsKey()] ?? current[props.kind === "access" ? "accessControlList" : "parkingControlList"];
      return Array.isArray(chosenRows) ? (chosenRows as Record<string, unknown>[]) : [];
    };
    const enabled = () => record(props.value)[enabledKey()] !== false;
    const update = (next: Record<string, unknown>) =>
      emit("update:value", { ...record(props.value), [enabledKey()]: enabled(), [rowsKey()]: selectedRows(), ...next });
    onMounted(() => {
      if (!props.readonly && !props.value) update({});
    });
    const load = async () => {
      if (props.readonly || !enabled()) return;
      const current = ++version;
      loading.value = true;
      try {
        const params = {
          pageNumber: page.value,
          pageSize: pageSize.value,
          keyword: keyword.value,
          ...(props.kind === "access" ? { type: doorType.value ?? "", doorArea: String(area.value.at(-1) ?? "") } : {}),
        };
        const result: AttendanceHrPage =
          props.kind === "access" ? await props.client.pageDoorDevices(params) : await props.client.pageParkingLots(params);
        if (current === version) {
          rows.value = result.records;
          total.value = result.total;
        }
      } catch (error) {
        if (current === version) message.error(error instanceof Error ? error.message : "权限设备加载失败");
      } finally {
        if (current === version) loading.value = false;
      }
    };
    watch(
      [() => props.kind, () => props.readonly, () => enabled()],
      async () => {
        if (props.readonly || !enabled()) return;
        if (props.kind === "access") {
          try {
            const [typeRows, areaRows] = await Promise.all([props.client.listDoorTypes(), props.client.listPermissionAreas()]);
            types.value = options(typeRows);
            areas.value = areaRows.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object") as Record<
              string,
              unknown
            >[];
          } catch (error) {
            message.error(error instanceof Error ? error.message : "门禁筛选项加载失败");
          }
        }
        await load();
      },
      { immediate: true },
    );
    const search = () => {
      page.value = 1;
      void load();
    };
    const reset = () => {
      keyword.value = "";
      doorType.value = undefined;
      area.value = [];
      search();
    };
    return () => (
      <div>
        <Switch
          checked={enabled()}
          disabled={props.readonly}
          onUpdate:checked={(checked) => update({ [enabledKey()]: Boolean(checked) })}
        />
        {enabled() ? (
          <div style={{ marginTop: "12px", border: "1px solid #d9d9d9" }}>
            <div style={{ padding: "8px", borderBottom: "1px solid #d9d9d9", fontWeight: 600 }}>
              {props.kind === "access" ? "门禁设备列表" : "停车场列表"}
            </div>
            {!props.readonly ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "8px" }}>
                {props.kind === "access" ? (
                  <>
                    <Select
                      value={doorType.value}
                      options={types.value.map((row) => ({ label: row.name, value: row.id }))}
                      allowClear
                      placeholder="门禁类型"
                      style={{ width: "130px" }}
                      onUpdate:value={(next) => {
                        doorType.value = next == null ? undefined : String(next);
                      }}
                    />
                    <Cascader
                      value={area.value}
                      options={areas.value}
                      fieldNames={{ label: "name", value: "id", children: "children" }}
                      changeOnSelect
                      allowClear
                      placeholder="所属区域"
                      style={{ width: "160px" }}
                      onUpdate:value={(next) => {
                        area.value = (next as Array<string | number>) ?? [];
                      }}
                    />
                  </>
                ) : null}
                <Input
                  value={keyword.value}
                  style={{ width: "190px" }}
                  placeholder={props.kind === "access" ? "设备编码/名称" : "停车场编码/名称"}
                  onUpdate:value={(next: string) => {
                    keyword.value = next;
                  }}
                  onPressEnter={search}
                />
                <Button type="primary" loading={loading.value} onClick={search}>
                  查询
                </Button>
                <Button onClick={reset}>重置</Button>
              </div>
            ) : null}
            <Table
              rowKey="id"
              size="small"
              loading={loading.value}
              pagination={false}
              dataSource={props.readonly ? selectedRows() : rows.value}
              scroll={{ x: props.kind === "access" ? 680 : 420, y: 220 }}
              rowSelection={
                props.readonly
                  ? undefined
                  : {
                      selectedRowKeys: selectedRows().map((row) => String(row.id)),
                      preserveSelectedRowKeys: true,
                      onChange: (keys: Array<string | number>, picked: Record<string, unknown>[]) => {
                        const selected = [
                          ...selectedRows().filter((row) => !rows.value.some((visible) => String(visible.id) === String(row.id))),
                          ...picked,
                        ];
                        update({ [rowsKey()]: selected.filter((row) => keys.includes(String(row.id))) });
                      },
                    }
              }
              columns={
                props.kind === "access"
                  ? [
                      { title: "设备编码", dataIndex: "doorCode", width: 170 },
                      { title: "设备名称", dataIndex: "name", width: 170 },
                      { title: "门禁类型", dataIndex: "typeName", width: 160 },
                      { title: "所属区域", dataIndex: "areaName", width: 180 },
                    ]
                  : [
                      { title: "停车场编码", dataIndex: "code", width: 200 },
                      { title: "停车场名称", dataIndex: "name", width: 220 },
                    ]
              }
            />
            {!props.readonly ? (
              <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px" }}>
                <Pagination
                  current={page.value}
                  pageSize={pageSize.value}
                  total={total.value}
                  showSizeChanger
                  onChange={(next: number, size: number) => {
                    page.value = next;
                    pageSize.value = size;
                    void load();
                  }}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  },
});
