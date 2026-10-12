import type {
  AppealRecord,
  EnterpriseRecord,
  InterviewRecord,
  OperationRecord,
  RentalRecord,
  RoomRecord,
} from "@g2-contract/factory-management";
import { Image, ImagePreviewGroup, type PcFormSchemaProp, type PcTableColumn } from "@g2-platform/pc-ui";
import { type DefineComponent, ref } from "vue";

import { type ParkListRow, createParkListPage } from "../components/list-page";
import { getFactoryManagementClient } from "../domain-context";
import { type CascaderOption, type SelectOption, cascaderOptions, formatDateTime, options, text } from "../shared";

const BASE = "/d/factory-management";

function textColumn(title: string, dataIndex: string, width = 150): PcTableColumn {
  return { title, dataIndex, width, ellipsis: true, customRender: ({ text: value }: { text: unknown }) => text(value) };
}

function dateColumn(title: string, dataIndex: string, width = 180): PcTableColumn {
  return { title, dataIndex, width, customRender: ({ text: value }: { text: unknown }) => formatDateTime(value) };
}

function selectSchema(fieldName: string, label: string, placeholder: string, values: { value: SelectOption[] }): PcFormSchemaProp {
  return {
    component: "Select",
    fieldName,
    label,
    componentProps: { allowClear: true, options: values, showSearch: true, optionFilterProp: "label", placeholder },
  };
}

function keywordSchema(placeholder: string): PcFormSchemaProp {
  return { component: "Input", fieldName: "keyword", label: "", defaultValue: "", componentProps: { allowClear: true, placeholder } };
}

export const EnterpriseInformationPage = createParkListPage<EnterpriseRecord>(() => {
  const industry = ref<SelectOption[]>([]);
  const enterpriseTypes = ref<SelectOption[]>([]);
  const scales = ref<SelectOption[]>([]);
  return {
    title: "企业信息",
    tableCode: "FACTORY_MANAGEMENT_ENTERPRISE",
    initialQuery: { keyword: "" },
    schema: () => [
      keywordSchema("请输入企业名称搜索"),
      selectSchema("industryTypeId", "行业类型", "请选择行业类型", industry),
      selectSchema("type", "企业类型", "请选择企业类型", enterpriseTypes),
      selectSchema("scale", "企业规模", "请选择企业规模", scales),
    ],
    columns: [
      textColumn("企业名称", "name", 220),
      textColumn("企业法人", "corporation"),
      textColumn("企业类型", "typeName"),
      textColumn("企业规模", "scaleName"),
      textColumn("企业行业", "industryTypeName"),
    ],
    fetch: (query) => getFactoryManagementClient().pageEnterprises(query as never),
    loadReferences: async () => {
      const client = getFactoryManagementClient();
      const [industryRows, typeRows, scaleRows] = await Promise.all([
        client.listTypes("INDUSTRY"),
        client.listEnterpriseTypes(),
        client.listEnterpriseScales(),
      ]);
      industry.value = options(industryRows);
      enterpriseTypes.value = options(typeRows);
      scales.value = options(scaleRows);
    },
    formPath: `${BASE}/enterprise-information/form`,
    allowDetail: true,
    remove: (id) => getFactoryManagementClient().deleteEnterprise(id),
    removeBatch: (ids) => getFactoryManagementClient().deleteEnterprises(ids),
  };
});

export const EnterpriseDirectoryPage = createParkListPage<EnterpriseRecord>(() => {
  const industry = ref<SelectOption[]>([]);
  const enterpriseTypes = ref<SelectOption[]>([]);
  const scales = ref<SelectOption[]>([]);
  return {
    title: "企业名录",
    tableCode: "FACTORY_MANAGEMENT_ENTERPRISE_DIRECTORY",
    initialQuery: { keyword: "" },
    schema: () => [
      keywordSchema("请输入企业名称搜索"),
      selectSchema("industryTypeId", "行业类型", "请选择行业类型", industry),
      selectSchema("type", "企业类型", "请选择企业类型", enterpriseTypes),
      selectSchema("scale", "企业规模", "请选择企业规模", scales),
    ],
    columns: [
      textColumn("企业名称", "name", 220),
      textColumn("租赁房间", "corporation", 200),
      textColumn("企业类型", "typeName"),
      textColumn("行业类型", "industryTypeName"),
      textColumn("企业规模", "scaleName"),
    ],
    fetch: (query) => getFactoryManagementClient().pageEnterpriseDirectory(query as never),
    loadReferences: async () => {
      const client = getFactoryManagementClient();
      const [industryRows, typeRows, scaleRows] = await Promise.all([
        client.listTypes("INDUSTRY"),
        client.listEnterpriseTypes(),
        client.listEnterpriseScales(),
      ]);
      industry.value = options(industryRows);
      enterpriseTypes.value = options(typeRows);
      scales.value = options(scaleRows);
    },
  };
});

export const RoomInformationPage = createParkListPage<RoomRecord>(() => {
  const areas = ref<CascaderOption[]>([]);
  const roomTypes = ref<SelectOption[]>([]);
  const statuses = ref<SelectOption[]>([]);
  return {
    title: "房间信息",
    tableCode: "FACTORY_MANAGEMENT_ROOM",
    initialQuery: { keyword: "" },
    schema: () => [
      keywordSchema("请输入房间名称搜索"),
      {
        component: "Cascader",
        fieldName: "areaList",
        label: "所属区域",
        componentProps: { allowClear: true, options: areas, placeholder: "请选择区域" },
      },
      selectSchema("roomTypeId", "房间类型", "请选择房间类型", roomTypes),
      selectSchema("status", "使用状态", "请选择使用状态", statuses),
    ],
    columns: [
      textColumn("房间名称", "name", 200),
      textColumn("房间类型", "roomTypeName"),
      textColumn("所属区域", "areaName", 180),
      textColumn("建筑面积（㎡）", "floorage"),
      textColumn("计费面积（㎡）", "floorageBilling"),
      textColumn("使用状态", "statusName"),
    ],
    fetch: (query) => getFactoryManagementClient().pageRooms(query as never),
    transformQuery: (query) => {
      const areaList = Array.isArray(query.areaList) ? query.areaList : [];
      const { areaList: _areaList, ...rest } = query;
      return { ...rest, areaId: areaList.at(-1) };
    },
    loadReferences: async () => {
      const client = getFactoryManagementClient();
      const [areaRows, typeRows, statusRows] = await Promise.all([client.listAreas(), client.listTypes("ROOM"), client.listRoomStatuses()]);
      areas.value = cascaderOptions(areaRows);
      roomTypes.value = options(typeRows);
      statuses.value = options(statusRows);
    },
    formPath: `${BASE}/room-information/form`,
    remove: (id) => getFactoryManagementClient().deleteRoom(id),
    removeBatch: (ids) => getFactoryManagementClient().deleteRooms(ids),
  };
});

export const EnterpriseVisitPage = createParkListPage<InterviewRecord>(() => ({
  title: "企业走访",
  tableCode: "FACTORY_MANAGEMENT_INTERVIEW",
  initialQuery: { keyword: "" },
  schema: () => [
    keywordSchema("请输入企业名称搜索"),
    { component: "RangePicker", fieldName: "period", label: "走访时间", componentProps: { allowClear: true, valueFormat: "YYYY-MM-DD" } },
  ],
  columns: [dateColumn("走访时间", "time"), textColumn("企业名称", "enterpriseName", 220), textColumn("走访人员", "person")],
  fetch: (query) => getFactoryManagementClient().pageInterviews(query as never),
  transformQuery: (query) => ({ ...query, period: Array.isArray(query.period) ? query.period.join(",") : query.period }),
  formPath: `${BASE}/enterprise-visit/form`,
  allowDetail: true,
  remove: (id) => getFactoryManagementClient().deleteInterview(id),
  removeBatch: (ids) => getFactoryManagementClient().deleteInterviews(ids),
}));

export const EnterpriseDemandsPage = createParkListPage<AppealRecord>(() => {
  const appealTypes = ref<SelectOption[]>([]);
  return {
    title: "企业诉求",
    tableCode: "FACTORY_MANAGEMENT_APPEAL",
    initialQuery: { keyword: "" },
    schema: () => [
      keywordSchema("请输入诉求名称搜索"),
      selectSchema("appealTypeId", "诉求类型", "请选择诉求类型", appealTypes),
      { component: "RangePicker", fieldName: "period", label: "诉求时间", componentProps: { allowClear: true, valueFormat: "YYYY-MM-DD" } },
    ],
    columns: [
      dateColumn("诉求时间", "time"),
      textColumn("诉求名称", "name", 220),
      textColumn("诉求类型", "appealTypeName"),
      textColumn("诉求企业", "enterpriseName", 200),
      textColumn("反馈人员", "username"),
    ],
    fetch: (query) => getFactoryManagementClient().pageAppeals(query as never),
    transformQuery: (query) => ({ ...query, period: Array.isArray(query.period) ? query.period.join(",") : query.period }),
    loadReferences: async () => {
      appealTypes.value = options(await getFactoryManagementClient().listTypes("APPEAL"));
    },
    formPath: `${BASE}/enterprise-demands/form`,
    allowDetail: true,
    remove: (id) => getFactoryManagementClient().deleteAppeal(id),
    removeBatch: (ids) => getFactoryManagementClient().deleteAppeals(ids),
  };
});

export const RoomRentalPage = createParkListPage<RentalRecord>(() => ({
  title: "房间租赁",
  tableCode: "FACTORY_MANAGEMENT_RENTAL",
  initialQuery: { keyword: "" },
  schema: () => [
    keywordSchema("请输入房间名称搜索"),
    {
      component: "RangePicker",
      fieldName: "signTimePeriod",
      label: "签订时间",
      componentProps: { allowClear: true, valueFormat: "YYYY-MM-DD" },
    },
  ],
  columns: [
    dateColumn("签订时间", "signTime"),
    textColumn("租赁房间", "roomNames", 240),
    textColumn("租赁企业", "enterpriseName", 220),
    dateColumn("结束时间", "endTime"),
  ],
  fetch: (query) => getFactoryManagementClient().pageRentals(query as never),
  transformQuery: (query) => ({
    ...query,
    signTimePeriod: Array.isArray(query.signTimePeriod) ? query.signTimePeriod.join(",") : query.signTimePeriod,
  }),
  formPath: `${BASE}/room-rental/form`,
  allowDetail: true,
  remove: (id) => getFactoryManagementClient().deleteRental(id),
  removeBatch: (ids) => getFactoryManagementClient().deleteRentals(ids),
}));

type OperationRow = ParkListRow & OperationRecord;

function operationRow(record: OperationRecord, index: number): OperationRow {
  return { ...record, id: String(record.id ?? `${index}`) };
}

function operationPage(config: {
  title: string;
  tableCode: string;
  initialQuery: Record<string, unknown>;
  schema: () => PcFormSchemaProp[];
  columns: PcTableColumn[];
  fetch(query: Record<string, unknown>): Promise<{ records: OperationRecord[]; total: number; pages: number }>;
  transformQuery?: (query: Record<string, unknown>) => Record<string, unknown>;
}) {
  return createParkListPage<OperationRow>(() => ({
    ...config,
    fetch: async (query) => {
      const result = await config.fetch(query);
      return {
        ...result,
        records: result.records.map(operationRow),
      };
    },
  }));
}

const targetTypeOptions = ref<SelectOption[]>([
  { label: "购地", value: "1" },
  { label: "租赁", value: "2" },
  { label: "销售", value: "3" },
]);

export const InvestmentPlanPage = operationPage({
  title: "招商计划",
  tableCode: "FACTORY_MANAGEMENT_INVESTMENT_PLAN",
  initialQuery: {},
  schema: () => [
    selectSchema("targetType", "目标类型", "请选择目标类型", targetTypeOptions),
    {
      component: "DatePicker",
      fieldName: "planMonth",
      label: "计划月份",
      componentProps: { allowClear: true, picker: "month", valueFormat: "YYYY-MM" },
    },
  ],
  columns: [
    textColumn("计划月份", "planMonth"),
    textColumn("计划完成目标", "planTotal"),
    {
      title: "目标类型",
      dataIndex: "targetType",
      width: 140,
      customRender: ({ text: value }: { text: unknown }) =>
        targetTypeOptions.value.find((item) => item.value === String(value))?.label ?? "--",
    },
    {
      title: "完成结果",
      dataIndex: "planResult",
      width: 140,
      customRender: ({ text: value }: { text: unknown }) =>
        value === undefined || value === null ? "--" : Number(value) === 1 ? "不达标" : "达标",
    },
    textColumn("完成百分比", "planPercent"),
  ],
  fetch: (query) => getFactoryManagementClient().pageInvestmentPlans(query as never),
});

const foundStatusOptions = ref<SelectOption[]>([
  { label: "未立项", value: "0" },
  { label: "已立项", value: "1" },
]);

export const ProjectManagePage = operationPage({
  title: "项目管理",
  tableCode: "FACTORY_MANAGEMENT_PROJECT",
  initialQuery: {},
  schema: () => [
    { component: "RangePicker", fieldName: "period", label: "选择日期", componentProps: { allowClear: true, valueFormat: "YYYY-MM-DD" } },
    selectSchema("foundStatus", "是否立项", "请选择是否立项", foundStatusOptions),
  ],
  columns: [
    textColumn("项目名称", "projectName", 220),
    dateColumn("开始时间", "startDate"),
    dateColumn("结束时间", "endDate"),
    textColumn("项目类型", "projectType"),
    {
      title: "是否立项",
      dataIndex: "departmentName",
      width: 130,
      customRender: ({ text: value }: { text: unknown }) =>
        value === undefined || value === null ? "--" : Number(value) === 1 ? "已立项" : "未立项",
    },
    {
      title: "是否结项",
      dataIndex: "endStatus",
      width: 130,
      customRender: ({ text: value }: { text: unknown }) =>
        value === undefined || value === null ? "--" : Number(value) === 1 ? "已结" : "未结",
    },
  ],
  transformQuery: (query) => ({ ...query, period: Array.isArray(query.period) ? query.period.join(",") : query.period }),
  fetch: (query) => getFactoryManagementClient().pageProjects(query as never),
});

const conditionOptions = ref<SelectOption[]>([
  { label: "大于", value: "GT" },
  { label: "大于等于", value: "GE" },
  { label: "等于", value: "EQ" },
  { label: "小于等于", value: "LE" },
  { label: "小于", value: "LT" },
]);

export const EstateManagePage = operationPage({
  title: "物业管理",
  tableCode: "FACTORY_MANAGEMENT_ESTATE",
  initialQuery: {},
  schema: () => [
    { component: "RangePicker", fieldName: "period", label: "签订日期", componentProps: { allowClear: true, valueFormat: "YYYY-MM-DD" } },
    selectSchema("warnCondition", "合同预警天数", "预警条件", conditionOptions),
    {
      component: "InputNumber",
      fieldName: "warnDay",
      label: "",
      componentProps: { min: 0, max: 999999999, placeholder: "请输入预警天数" },
    },
    selectSchema("overdueCondition", "合同逾期天数", "逾期条件", conditionOptions),
    {
      component: "InputNumber",
      fieldName: "overdueDay",
      label: "",
      componentProps: { min: 0, max: 999999999, placeholder: "请输入逾期天数" },
    },
  ],
  columns: [
    textColumn("合同编号", "contractNo"),
    textColumn("合同名称", "contractName", 200),
    textColumn("经营类型", "businessType"),
    textColumn("装修期", "zxq"),
    {
      title: "装修期是否免租",
      dataIndex: "isZxqCharge",
      width: 150,
      customRender: ({ text: value }: { text: unknown }) => (value === undefined || value === null ? "--" : value ? "是" : "否"),
    },
    dateColumn("签订日期", "signDate"),
    dateColumn("起租日期", "startDate"),
    dateColumn("止租日期", "endDate"),
    textColumn("合同预警天数", "warnDay"),
    {
      title: "是否预定",
      dataIndex: "isReserve",
      width: 120,
      customRender: ({ text: value }: { text: unknown }) => (value === undefined || value === null ? "--" : value ? "是" : "否"),
    },
    {
      title: "是否续签",
      dataIndex: "isContinue",
      width: 120,
      customRender: ({ text: value }: { text: unknown }) => (value === undefined || value === null ? "--" : value ? "是" : "否"),
    },
    textColumn("预警状态", "warnStatus"),
    textColumn("合同类型", "contractType"),
    textColumn("合同逾期天数", "overdueDay"),
  ],
  transformQuery: (query) => ({ ...query, period: Array.isArray(query.period) ? query.period.join(",") : query.period }),
  fetch: (query) => getFactoryManagementClient().pageEstateContracts(query as never),
});

const complaintStatusOptions = ref<SelectOption[]>([
  { label: "未处理", value: "1" },
  { label: "处理中", value: "2" },
  { label: "处理完成", value: "3" },
]);
const PreviewGroup = ImagePreviewGroup as DefineComponent;

export const EnterpriseComplaintPage = operationPage({
  title: "企业投诉",
  tableCode: "FACTORY_MANAGEMENT_COMPLAINT",
  initialQuery: {},
  schema: () => [
    { component: "RangePicker", fieldName: "period", label: "提交时间", componentProps: { allowClear: true, valueFormat: "YYYY-MM-DD" } },
    selectSchema("status", "处理状态", "请选择处理状态", complaintStatusOptions),
  ],
  columns: [
    textColumn("用户类型", "userType"),
    textColumn("用户名称", "username"),
    textColumn("内容", "content", 220),
    textColumn("投诉建议", "sortType"),
    dateColumn("提交时间", "createTime"),
    textColumn("回复内容", "contentReply", 220),
    dateColumn("回复时间", "replyTime"),
    textColumn("状态", "status"),
    {
      title: "图片",
      dataIndex: "imgUrl",
      width: 150,
      customRender: ({ text: value }: { text: unknown }) => {
        const images = Array.isArray(value) ? value : [];
        return images.length > 0 ? (
          <PreviewGroup>
            {images.map((image, index) => {
              const path =
                typeof image === "string" ? image : image && typeof image === "object" && "path" in image ? String(image.path) : "";
              return path ? <Image src={path} width={54} height={54} key={`${path}-${index}`} /> : null;
            })}
          </PreviewGroup>
        ) : (
          "--"
        );
      },
    },
  ],
  transformQuery: (query) => ({ ...query, period: Array.isArray(query.period) ? query.period.join(",") : query.period }),
  fetch: (query) => getFactoryManagementClient().pageComplaints(query as never),
});

const roomStatusOptions = ref<SelectOption[]>([
  { label: "闲置", value: "0" },
  { label: "已租", value: "1" },
  { label: "预定", value: "2" },
  { label: "已售", value: "16" },
]);

export const RentControlRecordPage = operationPage({
  title: "租控记录",
  tableCode: "FACTORY_MANAGEMENT_RENT_CONTROL",
  initialQuery: {},
  schema: () => [selectSchema("status", "房间状态", "请选择房间状态", roomStatusOptions)],
  columns: [
    textColumn("房间ID", "roomId"),
    textColumn("出售面积", "roomAreaCalculate"),
    textColumn("房间单位名", "roomUnitName"),
    {
      title: "房间状态",
      dataIndex: "status",
      width: 120,
      customRender: ({ text: value }: { text: unknown }) =>
        roomStatusOptions.value.find((item) => item.value === String(value))?.label ?? "--",
    },
    {
      title: "预定状态",
      dataIndex: "reserveStatus",
      width: 120,
      customRender: ({ text: value }: { text: unknown }) =>
        value === undefined || value === null ? "--" : Number(value) === 1 ? "已预定" : "未预定",
    },
    {
      title: "锁定状态",
      dataIndex: "lockedStatus",
      width: 120,
      customRender: ({ text: value }: { text: unknown }) =>
        value === undefined || value === null ? "--" : Number(value) === 1 ? "已锁定" : "未锁定",
    },
    {
      title: "房间缴费状态",
      dataIndex: "payStatus",
      width: 140,
      customRender: ({ text: value }: { text: unknown }) =>
        value === undefined || value === null ? "--" : Number(value) === 1 ? "欠费" : "正常缴费",
    },
    textColumn("合同类型", "contractType"),
  ],
  fetch: (query) => getFactoryManagementClient().pageRentRecords(query as never),
});
