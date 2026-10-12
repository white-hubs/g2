import type { FormSchemaItem } from "../form-schema";

export const ATTENDANCE_CONTROLS = [
  { id: "VacationType", title: "请假类型", name: "VacationType", valueType: "String" },
  { id: "VacationBalance", title: "假期余额", name: "VacationBalance", valueType: "Number" },
  { id: "VacationDate", title: "请假时间", name: "VacationDate", valueType: "String" },
  { id: "VacationLength", title: "请假时长", name: "VacationLength", valueType: "Number" },
  { id: "AssociationLeaveForm", title: "关联请假单", name: "AssociationLeaveForm", valueType: "Object" },
  { id: "VacationDate", title: "销假时间", name: "VacationDate", valueType: "String" },
  { id: "DisposeVacationLength", title: "销假时长", name: "DisposeVacationLength", valueType: "Number" },
  { id: "SupplementClass", title: "补卡班次", name: "SupplementClass", valueType: "String" },
  { id: "OvertimeType", title: "加班类型", name: "OvertimeType", valueType: "String" },
  { id: "OvertimeLength", title: "加班时长", name: "OvertimeLength", valueType: "Number" },
  { id: "OvertimeCompensation", title: "加班补偿", name: "OvertimeCompensation", valueType: "String" },
  { id: "DutyType", title: "换班类型", name: "DutyType", valueType: "String" },
  { id: "ChangeClass", title: "换班班次", name: "ChangeClass", valueType: "String" },
  { id: "ChangeClass", title: "被换班次", name: "ChangeClass", valueType: "String" },
  { id: "ChangePerson", title: "换班人员", name: "ChangePerson", valueType: "String" },
  { id: "ChangePerson", title: "被换班人员", name: "ChangePerson", valueType: "String" },
  { id: "DepartureTimeLength", title: "离岗时长", name: "DepartureTimeLength", valueType: "Number" },
  { id: "BusinessTripTimeLength", title: "出差时长", name: "BusinessTripTimeLength", valueType: "Number" },
] as const;

export const HR_CONTROLS = [
  { id: "PositionList", title: "职位列表", name: "PositionList", valueType: "String" },
  { id: "PersonnelCategory", title: "人员类别", name: "PersonnelCategory", valueType: "String" },
  { id: "ServicePeriod", title: "服务期限", name: "ServicePeriod", valueType: "Object" },
  { id: "AccessPermission", title: "门禁权限", name: "AccessPermission", valueType: "Object" },
  { id: "ParkingPermission", title: "停车权限", name: "ParkingPermission", valueType: "Object" },
  { id: "AppointmentList", title: "岗位列表", name: "AppointmentList", valueType: "String" },
  { id: "RoleList", title: "角色列表", name: "RoleList", valueType: "Role" },
  { id: "SickLeaveInput", title: "考勤-病假", name: "SickLeaveInput", valueType: "Object", attr: "SICK_LEAVE" },
  { id: "CompassionLeaveInput", title: "考勤-事假", name: "CompassionLeaveInput", valueType: "Object", attr: "COMPASSIONATE_LEAVE" },
  { id: "lateNumInput", title: "考勤-迟到", name: "lateNumInput", valueType: "Object", attr: "LATE_CHECKED" },
  { id: "earlyNumInput", title: "考勤-早退", name: "earlyNumInput", valueType: "Object", attr: "EARLY_CHECKED" },
  { id: "skipWorkNumInput", title: "考勤-旷工", name: "skipWorkNumInput", valueType: "Object", attr: "NEGLECT_WORK" },
] as const;

export const ATTENDANCE_HR_NAMES = new Set<string>([...ATTENDANCE_CONTROLS, ...HR_CONTROLS].map((item) => item.name));

export function attendanceHrDefaults(control: { id: string; title: string; valueType: string }): Partial<FormSchemaItem> | undefined {
  if (!ATTENDANCE_HR_NAMES.has(control.id)) return undefined;
  const stat = HR_CONTROLS.find((item) => item.id === control.id && "attr" in item);
  const value: unknown =
    control.id === "RoleList"
      ? []
      : control.id === "ServicePeriod"
        ? { radioValue: "limited", date: "" }
        : control.id === "AccessPermission"
          ? { accessControl: true, accessControlRows: [] }
          : control.id === "ParkingPermission"
            ? { parkingControl: true, parkingControlRows: [] }
            : "";
  return {
    value,
    ...(stat && "attr" in stat ? { attr: stat.attr } : {}),
    props: {
      required: false,
      enablePrint: true,
      showPrint: true,
      params: null,
      ...(["VacationBalance", "VacationLength", "DisposeVacationLength", "DepartureTimeLength", "BusinessTripTimeLength"].includes(
        control.id,
      )
        ? { placeholder: "自动填充" }
        : {}),
      ...(["VacationLength", "DisposeVacationLength", "OvertimeLength", "BusinessTripTimeLength", "DepartureTimeLength"].includes(
        control.id,
      )
        ? { params2: null }
        : {}),
      ...(control.id === "ChangeClass" ? { params1: null, params2: null } : {}),
      ...(control.id === "VacationType" ? { relateParams: {}, params2: null } : {}),
      ...(control.id === "RoleList" ? { multiple: false } : {}),
      ...(stat && "attr" in stat ? { attr: stat.attr, disabled: true } : {}),
    },
  };
}

export function validateAttendanceHrControl(item: FormSchemaItem, value: unknown, formValues: Record<string, unknown>): string | undefined {
  const name = String(item.name);
  if (name === "ServicePeriod") {
    const category = formValues[String(item.props?.params ?? "")];
    const code = category && typeof category === "object" ? (category as { value?: unknown }).value : category;
    if (code === "ZCRY") {
      const period = value && typeof value === "object" ? (value as { radioValue?: string; date?: string }) : {};
      if (period.radioValue !== "limited") return "驻场人员必须选择有期限";
      if (!period.date) return "请选择期限时间";
    }
  }
  if (name === "AccessPermission" || name === "ParkingPermission") {
    const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    const enabled = name === "AccessPermission" ? row.accessControl : row.parkingControl;
    const rows =
      name === "AccessPermission" ? (row.accessControlRows ?? row.accessControlList) : (row.parkingControlRows ?? row.parkingControlList);
    if (enabled === true && (!Array.isArray(rows) || !rows.length)) {
      return name === "AccessPermission" ? "开启门禁权限必须选择开启权限的门禁设备" : "开启停车权限必须选择开启权限的停车设备";
    }
  }
  return undefined;
}
