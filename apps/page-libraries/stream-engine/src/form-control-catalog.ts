import { ASSET_CONTROLS } from "./asset-model";
import { ATTENDANCE_CONTROLS, HR_CONTROLS, attendanceHrDefaults } from "./components/attendance-hr-catalog";
import {
  BASIC_CONTROLS,
  COMPLAINT_CONTROLS,
  FAULT_CONTROLS,
  HIDDEN_DANGER_CONTROLS,
  OUTSOURCE_REPAIR_CONTROLS,
  PARKING_CONTROLS,
  PERSONNEL_CONTROLS,
  SMALL_ENGINEERING_CONTROLS,
  WORK_PERMIT_CONTROLS,
  WORK_REPORT_CONTROLS,
} from "./components/control-catalog";
import type { FormSchemaItem } from "./form-schema";
import { OFFICIAL_CONTROLS, RETROFIT_CONTROLS } from "./official-retrofit-model";

export type FormControlDefinition = { id: string; title: string; valueType: string };

export const CONTROL_GROUPS = [
  { title: "基础组件", items: BASIC_CONTROLS },
  { title: "人员档案", items: PERSONNEL_CONTROLS },
  { title: "考勤管理", application: "ATTENDANCE_MANAGEMENT", items: ATTENDANCE_CONTROLS },
  { title: "人事管理", application: "PERSONNELMANAGEMENT", items: HR_CONTROLS },
  { title: "行政管理", application: "OFFICIAL_MANAGEMENT", items: OFFICIAL_CONTROLS },
  { title: "资产管理", application: "PROPERTY_MANAGEMENT", items: ASSET_CONTROLS },
  { title: "作业管理", application: "WORK_PERMIT", items: WORK_PERMIT_CONTROLS },
  { title: "工作汇报", application: "WORK_REPORT", items: WORK_REPORT_CONTROLS },
  { title: "委外维修", application: "OUTSOURCE_REPAIR", items: OUTSOURCE_REPAIR_CONTROLS },
  { title: "小散工程", application: "SMALLENFINEERING", items: SMALL_ENGINEERING_CONTROLS },
  { title: "隐患排查", application: "HIDDENDANGER", items: HIDDEN_DANGER_CONTROLS },
  { title: "故障报修", application: "FAULT", items: FAULT_CONTROLS },
  { title: "停车管理", application: "PARKINGMANAGE", items: PARKING_CONTROLS },
  { title: "投诉建议", application: "COMPLAINT", items: COMPLAINT_CONTROLS },
  { title: "更新改造", application: "RETROFIT", items: RETROFIT_CONTROLS },
] as const;

export function availableFormControlGroups(application?: string) {
  return CONTROL_GROUPS.filter((group) => !("application" in group) || group.application === application);
}

function controlRequired(group: string, id: string): boolean {
  if (group === "资产管理")
    return ["AddAssetTable", "ChooseAssetTable", "WareHouseSelect", "ConsumablesEnter", "ConsumablesOut"].includes(id);
  if (group === "作业管理") return ["WorkPermitTypeSelect", "WorkPermitLevelSelect"].includes(id);
  if (group === "行政管理") return id === "WorkList";
  if (group === "故障报修") return id !== "ConsumablesOut";
  return ["隐患排查", "投诉建议", "工作汇报", "委外维修", "小散工程", "更新改造"].includes(group);
}

export function createFormItem(control: FormControlDefinition, group = "基础组件"): FormSchemaItem {
  const options = ["SelectInput", "MultipleSelect"].includes(control.id) ? ["选项1", "选项2"] : undefined;
  const personnel = PERSONNEL_CONTROLS.find((item) => item.id === control.id);
  const attendanceHr = attendanceHrDefaults(control);
  const table = ["AddAssetTable", "ChooseAssetTable", "ConsumablesEnter", "ConsumablesOut"].includes(control.id);
  const value =
    attendanceHr?.value ??
    ([
      "GroupList",
      "UserPicker",
      "DeptPicker",
      "RelatedDeviceSelect",
      "AlarmRecords",
      "FileUpload",
      "MultipleSelect",
      "RoleList",
      "WorkPermitRiskCheckItems",
      "WorkPermitAcceptanceItems",
      "DeviceStatus",
      "DeviceChangeStatus",
    ].includes(control.id) || table
      ? []
      : ["AssetIsExpired", "WorkPermitTypeSelect"].includes(control.id)
        ? null
        : control.valueType === "Boolean"
          ? false
          : "");
  return {
    id: `field${Date.now()}${Math.floor(Math.random() * 1000)}`,
    title: control.title,
    name: control.id,
    valueType: control.valueType,
    value,
    ...(personnel ? { attr: personnel.attr, placeholder: `默认为发起人${personnel.title}` } : {}),
    width: ["TelPhone", "IDNumber", "CarId"].includes(control.id) ? 50 : 100,
    ...(control.id === "OutsiderConcat" ? { labelWidth: "160px" } : {}),
    ...(table ? { baseOn: "Table" } : {}),
    props: {
      required: controlRequired(group, control.id),
      showPrint: !(group === "行政管理" && ["FocusWorkTypeList", "WorkList"].includes(control.id)),
      enablePrint: true,
      ...(table ? { hideLabel: true, params: null } : {}),
      ...(options ? { options, expanding: false, params: null } : {}),
      ...(control.id === "TextareaInput" ? { rows: 4, defaultValue: "" } : {}),
      ...(control.id === "TextInput" ? { defaultValue: "", useAsBackLogTitle: false } : {}),
      ...(control.id === "NumberInput" ? { precision: 0, minNum: "", maxNum: "", params: null, paramsLabel: "关联附件数量" } : {}),
      ...(control.id === "CarId" ? { params: null } : {}),
      ...(control.id === "AlarmRecords" ? { params: "", params2: "", paramsLabel: "关联设备" } : {}),
      ...(control.id === "AmountInput" ? { precision: 0, showChinese: true } : {}),
      ...(control.id === "FileUpload" ? { maxSize: 100, maxNumber: 10, fileTypes: [], onlyRead: false } : {}),
      ...(control.id === "GroupList" ? { items: [], closeAdd: false, closeAddChild: true, closeDelete: false } : {}),
      ...(control.id === "RateInput" ? { rateNum: 5 } : {}),
      ...(control.id === "Description" ? { color: "#B1B1B1", hideLabel: true } : {}),
      ...(["DateTime", "DateTimeRange"].includes(control.id) ? { format: "yyyy-MM-dd HH:mm:ss" } : {}),
      ...(control.id === "TimePickerRange" ? { format: "HH:mm:ss" } : {}),
      ...(["DateTimeRange", "TimePickerRange"].includes(control.id) ? { placeholder: ["开始时间", "结束时间"], showLength: false } : {}),
      ...(control.id === "AreaList" ? { api: "/mdata/area/list", params: null } : {}),
      ...(["RelatedDeviceSelect", "UserPicker", "DeptPicker"].includes(control.id) ? { multiple: false } : {}),
      ...([
        "TargetObjectSelect",
        "FaultTypeSelect",
        "FaultLevelSelect",
        "FaultComfirmSelect",
        "ProblemTypeSelect",
        "ProblemLevelSelect",
        "ProblemComfirmSelect",
        "SolutionResult",
        "WorKReportSelect",
        "OutSourceCom",
        "OutSourceHandleResult",
        "OutSourceResult",
        "OutSourceMode",
        "ProjectName",
        "RectifyTargetSelect",
      ].includes(control.id)
        ? { params: null }
        : {}),
      ...(control.id === "DeviceSelect" ? { outSource: group === "委外维修" } : {}),
      ...(control.id === "OutSourceCom" ? { paramsLabel: "关联对象" } : {}),
      ...(control.id === "OutSourceMode" ? { paramsLabel: "关联公司" } : {}),
      ...(["WorkPermitLevelSelect", "WorkPermitRiskCheckItems", "WorkPermitAcceptanceItems"].includes(control.id) ? { params: null } : {}),
      ...(["WorkPermitRiskCheckItems", "WorkPermitAcceptanceItems"].includes(control.id) ? { params2: null } : {}),
      ...(control.id === "ConsumablesEnter" || (control.id === "ConsumablesOut" && group === "资产管理")
        ? { paramsLabel: "关联仓库" }
        : {}),
      ...(["FocusWorkRequirement", "WorkList", "DeviceStatus", "DeviceChangeStatus", "ViolatorName", "ViolatorPhone"].includes(control.id)
        ? { params: null }
        : {}),
      ...(control.id === "WorkList" ? { paramsLabel: "关联完成进度" } : {}),
      ...(control.id === "DeviceStatus" || control.id === "DeviceChangeStatus" ? { paramsLabel: "关联设备" } : {}),
      ...(personnel
        ? {
            attr: personnel.attr,
            placeholder: `默认为发起人${personnel.title}`,
            disabled: !["SponsorInput", "OrganizationInput"].includes(control.id),
            params: null,
          }
        : {}),
      ...attendanceHr?.props,
    },
  };
}
