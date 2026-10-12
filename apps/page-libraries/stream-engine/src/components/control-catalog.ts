/** 隐患排查控件组（对齐旧 ComponentsConfigExport groupId=HIDDENDANGER） */
export const HIDDEN_DANGER_CONTROLS = [
  { id: "TargetObjectSelect", title: "隐患对象", name: "TargetObjectSelect", valueType: "Object" },
  { id: "ProblemTypeSelect", title: "隐患类型", name: "ProblemTypeSelect", valueType: "String" },
  { id: "ProblemLevelSelect", title: "隐患级别", name: "ProblemLevelSelect", valueType: "String" },
  { id: "ProblemComfirmSelect", title: "隐患确认", name: "ProblemComfirmSelect", valueType: "String" },
  { id: "SolutionResult", title: "解决结果", name: "SolutionResult", valueType: "String" },
] as const;

export const BASIC_CONTROLS = [
  { id: "TextInput", title: "单行文本输入", name: "TextInput", valueType: "String" },
  { id: "SwitchSelect", title: "开关", name: "SwitchSelect", valueType: "Boolean" },
  { id: "RelatedDeviceSelect", title: "关联设备", name: "RelatedDeviceSelect", valueType: "Array" },
  { id: "AlarmRecords", title: "预警记录", name: "AlarmRecords", valueType: "Array" },
  { id: "TextareaInput", title: "多行文本输入", name: "TextareaInput", valueType: "String" },
  { id: "NumberInput", title: "数字输入框", name: "NumberInput", valueType: "Number" },
  { id: "AmountInput", title: "金额输入框", name: "AmountInput", valueType: "Number" },
  { id: "SelectInput", title: "单选框", name: "SelectInput", valueType: "String" },
  { id: "MultipleSelect", title: "多选框", name: "MultipleSelect", valueType: "Array" },
  { id: "DateTime", title: "日期时间点", name: "DateTime", valueType: "Date" },
  { id: "DateTimeRange", title: "日期时间区间", name: "DateTimeRange", valueType: "DateRange" },
  { id: "TimePickerRange", title: "时间选择区间", name: "TimePickerRange", valueType: "DateRange" },
  { id: "FileUpload", title: "上传附件", name: "FileUpload", valueType: "Array" },
  { id: "UserPicker", title: "人员选择", name: "UserPicker", valueType: "getStaffList" },
  { id: "DeptPicker", title: "部门选择", name: "DeptPicker", valueType: "FormDept" },
  { id: "AreaList", title: "区域选择", name: "AreaList", valueType: "Object" },
  { id: "Description", title: "说明文字", name: "Description", valueType: "String" },
  { id: "RateInput", title: "评分", name: "RateInput", valueType: "Number" },
  { id: "GroupList", title: "组合容器", name: "GroupList", valueType: "Array" },
  { id: "TelPhone", title: "电话号码", name: "TelPhone", valueType: "Number" },
  { id: "IDNumber", title: "身份证号", name: "IDNumber", valueType: "String" },
  { id: "CarId", title: "车牌号码", name: "CarId", valueType: "String" },
  { id: "OutsiderConcat", title: "外部人员联系方式", name: "OutsiderConcat", valueType: "Array" },
] as const;

/** 旧设计器的 base 分组还包含人员档案，不能并入基础控件。 */
export const PERSONNEL_CONTROLS = [
  { id: "SponsorInput", title: "发起人", name: "SponsorInput", valueType: "Object", attr: "name" },
  { id: "GenderInput", title: "性别", name: "GenderInput", valueType: "Object", attr: "gender" },
  { id: "OrganizationInput", title: "部门", name: "OrganizationInput", valueType: "Object", attr: "organizationId" },
  { id: "PositionInput", title: "职位", name: "PositionInput", valueType: "Object", attr: "positionIds" },
  { id: "jobNumberInput", title: "工号", name: "jobNumberInput", valueType: "Object", attr: "jobNumber" },
  { id: "idCardInput", title: "身份证号码", name: "idCardInput", valueType: "Object", attr: "idCard" },
  { id: "typeInput", title: "员工类型", name: "typeInput", valueType: "Object", attr: "type" },
  { id: "mobileInput", title: "联系电话", name: "mobileInput", valueType: "Object", attr: "mobile" },
  { id: "dateOfBirthInput", title: "出生日期", name: "dateOfBirthInput", valueType: "Object", attr: "dateOfBirth" },
  { id: "educationInput", title: "学历", name: "educationInput", valueType: "Object", attr: "education" },
  { id: "universityInput", title: "毕业院校", name: "universityInput", valueType: "Object", attr: "university" },
  { id: "specialityInput", title: "专业", name: "specialityInput", valueType: "Object", attr: "speciality" },
  { id: "politicalStatusInput", title: "政治面貌", name: "politicalStatusInput", valueType: "Object", attr: "politicalStatus" },
  { id: "nationInput", title: "民族", name: "nationInput", valueType: "Object", attr: "nation" },
  { id: "appointmentIdInput", title: "岗位", name: "appointmentIdInput", valueType: "Object", attr: "appointmentId" },
  { id: "probationPeriodInput", title: "试用期", name: "probationPeriodInput", valueType: "Object", attr: "probationPeriod" },
  { id: "regularWorkerDateInput", title: "转正日期", name: "regularWorkerDateInput", valueType: "Object", attr: "regularWorkerDate" },
  { id: "inductionDateInput", title: "入职日期", name: "inductionDateInput", valueType: "Object", attr: "inductionDate" },
  { id: "quitDateInput", title: "离职日期", name: "quitDateInput", valueType: "Object", attr: "quitDate" },
  { id: "statusInput", title: "员工状态", name: "statusInput", valueType: "Object", attr: "status" },
] as const;

/** 故障报修配置与旧 ComponentsConfigExport 的 FAULT 分组一致。 */
export const FAULT_CONTROLS = [
  { id: "TargetObjectSelect", title: "故障对象", name: "TargetObjectSelect", valueType: "Object" },
  { id: "FaultTypeSelect", title: "故障类型", name: "FaultTypeSelect", valueType: "String" },
  { id: "FaultLevelSelect", title: "紧急程度", name: "FaultLevelSelect", valueType: "String" },
  { id: "FaultComfirmSelect", title: "故障确认", name: "FaultComfirmSelect", valueType: "String" },
  { id: "SolutionResult", title: "解决结果", name: "SolutionResult", valueType: "String" },
  { id: "ConsumablesOut", title: "耗材领用", name: "ConsumablesOut", valueType: "Array" },
] as const;

/** 投诉建议复用旧版的故障类型、级别、确认与结果控件，仅标题不同。 */
export const COMPLAINT_CONTROLS = [
  { id: "FaultTypeSelect", title: "投诉类型", name: "FaultTypeSelect", valueType: "String" },
  { id: "FaultLevelSelect", title: "紧急程度", name: "FaultLevelSelect", valueType: "String" },
  { id: "FaultComfirmSelect", title: "投诉确认", name: "FaultComfirmSelect", valueType: "String" },
  { id: "SolutionResult", title: "解决结果", name: "SolutionResult", valueType: "String" },
] as const;

export const WORK_REPORT_CONTROLS = [{ id: "WorKReportSelect", title: "汇报类型", name: "WorKReportSelect", valueType: "String" }] as const;

export const OUTSOURCE_REPAIR_CONTROLS = [
  { id: "DeviceSelect", title: "改造对象", name: "DeviceSelect", valueType: "Object" },
  { id: "OutSourceCom", title: "委外公司", name: "OutSourceCom", valueType: "String" },
  { id: "OutSourceHandleResult", title: "处理结果", name: "OutSourceHandleResult", valueType: "String" },
  { id: "OutSourceResult", title: "确认结果", name: "OutSourceResult", valueType: "String" },
  { id: "OutSourceMode", title: "委外模式", name: "OutSourceMode", valueType: "String" },
] as const;

export const SMALL_ENGINEERING_CONTROLS = [
  { id: "ProjectName", title: "工程名称", name: "ProjectName", valueType: "String" },
  { id: "RectifyTargetSelect", title: "工程整改对象", name: "RectifyTargetSelect", valueType: "Object" },
  { id: "TargetObjectSelect", title: "整改对象", name: "TargetObjectSelect", valueType: "Object" },
] as const;

export const WORK_PERMIT_CONTROLS = [
  { id: "WorkPermitTypeSelect", title: "作业类型", name: "WorkPermitTypeSelect", valueType: "Object" },
  { id: "WorkPermitLevelSelect", title: "作业等级", name: "WorkPermitLevelSelect", valueType: "String" },
  { id: "WorkPermitRiskCheckItems", title: "作业检查项", name: "WorkPermitRiskCheckItems", valueType: "Array" },
  { id: "WorkPermitAcceptanceItems", title: "作业验收项", name: "WorkPermitAcceptanceItems", valueType: "Array" },
] as const;

export const PARKING_CONTROLS = [
  { id: "ParkingLevelSelect", title: "违停程度", name: "ParkingLevelSelect", valueType: "String" },
  { id: "ViolatorCarNumber", title: "车主车牌号码", name: "ViolatorCarNumber", valueType: "String" },
  { id: "ViolatorName", title: "车主姓名", name: "ViolatorName", valueType: "String" },
  { id: "ViolatorPhone", title: "车主联系方式", name: "ViolatorPhone", valueType: "String" },
  { id: "ParkingLotSelect", title: "停车场选择", name: "ParkingLotSelect", valueType: "String" },
  { id: "CarPlateColorSelect", title: "车牌颜色选择", name: "CarPlateColorSelect", valueType: "String" },
] as const;
