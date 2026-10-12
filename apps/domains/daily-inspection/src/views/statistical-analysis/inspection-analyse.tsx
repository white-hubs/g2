import { Empty, PageLayout, RadioGroup, RangePicker, Select, SelectOption, Spin, Table, type Dayjs } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref } from "vue";

import { FoundationColumnChart } from "./charts/foundation-column";
import { HorizontalBarChart } from "./charts/horizontal-bar";
import { PlanTypePieChart } from "./charts/plan-type-pie";
import { RatioPieChart } from "./charts/ratio-pie";
import { StackedColumnChart } from "./charts/stacked-column";
import { TrendLineChart } from "./charts/trend-line";
import {
  BarList,
  DepartmentStatus,
  PieList,
  PlateList,
  type DepartmentStatusData,
  type PlanTypeItem,
  type PlateItem,
} from "./components/analysis-widgets";
import dayjs from "@/compat/dayjs";
import { getDailyInspectionClient } from "@/domain-context";

import styles from "./inspection-analyse.module.css";

interface ProportionOfPlanTypes {
  planType?: string;
  planNum?: number;
}

interface PatrolSchemeType {
  patrolSchemeTotal?: number;
  proportionOfPlanTypesVOS?: ProportionOfPlanTypes[];
}

interface InspectionTasksType {
  taskTotalNum?: number;
  completeTaskNum?: number;
  abnormalTaskNum?: number;
  expireTaskNum?: number;
  taskTotalNumRatio?: string;
  completeTaskNumRatio?: string;
  completeTaskNumProportion?: string;
  abnormalTaskNumRatio?: string;
  abnormalTaskNumProportion?: string;
  expireTaskNumRatio?: string;
  expireTaskNumProportion?: string;
  periodTaskNumProportion?: string;
  periodTaskNum?: number;
}

interface TrendOfInspectionTimesVOS {
  abscissa?: string;
  taskNum?: number;
  numberOfInspection?: number;
}

interface InspectionsNumber {
  taskTotalNum?: number;
  objNum?: number;
  inspectionTotalNum?: number;
  objCoverageRate?: string;
  objCoverageRateRatio?: string;
  inspectionTotalNumRatio?: string;
  trendOfInspectionTimesVOS?: TrendOfInspectionTimesVOS[];
}

interface TaskExecutionAnalysis {
  totalTaskNum?: number;
  overTimeTaskNum?: number;
  expiredTaskNum?: number;
  abnormalTaskNum?: number;
  totalTaskNumRatio?: string;
  [key: string]: unknown;
}

interface AddDepTask {
  depName?: string;
  totalTaskNum?: string;
  completeTaskNum?: string;
  overTimeTaskNum?: string;
  expireTaskNum?: string;
}

interface DepTaskExecutionAnalysis extends DepartmentStatusData {
  addDepTask?: AddDepTask[];
}

interface TaskTypeTime {
  inspectionType?: string;
  taskTimeRatio?: string;
  taskTime?: number;
  taskTimeHour?: string;
}

interface TaskTimeAnalysis {
  totalElapsedTime?: number;
  totalElapsedTimeRatio?: string;
  taskTypeTime?: TaskTypeTime[];
}

interface AuditMatchRow {
  taskName?: string;
  releaseTime?: string;
  dutyOfficer?: string;
  matchRatio?: string;
  notMatchNum?: string;
}

interface AnalysisOfAuditResults {
  totalCheckTaskNum?: number;
  totalCheckTaskNumRatio?: string;
  top5Match?: AuditMatchRow[];
  last5Match?: AuditMatchRow[];
}

interface InspectionObjTaskAnalysis {
  inspectionTaskTotalNum?: number;
  maxTaskNumObj?: string;
  maxTaskNum?: string;
  maxTaskNumRatio?: string;
  minTaskNumObj?: string;
  minTaskNumRatio?: string;
  minTaskNum?: string;
}

interface InspectionObjAnalysis {
  totalInspectionNum?: number;
  maxNum?: number;
  minNum?: number;
  totalInspectionNumRatio?: string;
  maxNumObj?: string;
  maxNumRatio?: string;
  minNumObj?: string;
  minNumRatio?: string;
}

interface InspectionObjAbnormalAnalysis {
  abnormalObjNum?: number;
  maxAbnormalObjNum?: number;
  minAbnormalObjNum?: number;
  abnormalObjNumRatio?: string;
  maxAbnormalObj?: string;
  maxAbnormalObjNumRatio?: string;
  minAbnormalObj?: string;
  minAbnormalObjNumRatio?: string;
}

interface ObjInspectionNumTop {
  objName?: string;
  inspectionNum?: number;
}

interface CategoryDetail {
  name?: string;
  num?: string;
  proportion?: string;
}

interface TargetCategoryItem {
  name?: string;
  targetCategory?: string;
  details?: CategoryDetail[];
}

type TimeType = "ToDay" | "ThisWeek" | "ThisMonth" | "ThisYear";

const OBJ_TYPE_OPTIONS = [
  { id: "DEVICE", name: "设备" },
  { id: "STALL", name: "档位" },
  { id: "PROPERTY", name: "资产" },
  { id: "SITE_POINT", name: "现场点" },
] as const;

const CATEGORY_NAME_MAP: Record<string, string> = {
  DEVICE: "设备巡检",
  PROPERTY: "资产巡检",
  STALL: "档位巡检",
  SITE_POINT: "现场点巡检",
  RISK_SOURCE: "风险源巡检",
  SMALL_ENGINEERING: "小散工程",
};

const PERFORMANCE_TITLE: Record<string, string> = {
  totalTaskNum: "任务总数（个）",
  overTimeTaskNum: "超时完成任务数（个）",
  expiredTaskNum: "过期未执行任务数",
  abnormalTaskNum: "结果异常任务数",
};

const AUDIT_COLUMNS = [
  { title: "排名", dataIndex: "index", align: "center" as const, width: 70 },
  {
    title: "任务名称",
    dataIndex: "taskName",
    align: "center" as const,
    customRender: ({ text }: { text: unknown }) => text || "-",
  },
  {
    title: "任务发布时间",
    dataIndex: "releaseTime",
    align: "center" as const,
    customRender: ({ text }: { text: unknown }) => text || "-",
  },
  {
    title: "责任人",
    dataIndex: "dutyOfficer",
    align: "center" as const,
    customRender: ({ text }: { text: unknown }) => text || "-",
  },
  {
    title: "稽查结果匹配率",
    dataIndex: "matchRatio",
    align: "center" as const,
    customRender: ({ text }: { text: unknown }) => text || "-",
  },
  {
    title: "不匹配项数",
    dataIndex: "notMatchNum",
    align: "center" as const,
    customRender: ({ text }: { text: unknown }) => text || "-",
  },
];

function todayPeriod(): [Dayjs, Dayjs] {
  return [dayjs().startOf("day"), dayjs()];
}

function formatPeriod(period: [Dayjs, Dayjs] | [string, string]): string {
  return period.map((item) => (item ? dayjs(item).format("YYYY-MM-DD HH:mm:ss") : "")).join(",");
}

function rankingStyle(index: number): Record<string, string> | undefined {
  if (index === 0) return { background: "#F53F3F" };
  if (index === 1) return { background: "#FBA33F" };
  if (index === 3) return { background: "#3662EC" };
  return undefined;
}

function resolveObjType(name: string | undefined): string {
  if (!name) return "";
  return OBJ_TYPE_OPTIONS.find((item) => item.name === name)?.id ?? "";
}

async function fetchAnalysis<T>(name: string, params: Record<string, unknown>): Promise<T> {
  return getDailyInspectionClient().request<T>("GET", `/inspection-analysis/${name}`, params);
}

export const InspectionAnalysis = defineComponent({
  name: "InspectionAnalysis",
  setup() {
    const timeType = ref<TimeType>("ToDay");
    const period = ref<[Dayjs, Dayjs]>(todayPeriod());

    const inspectionAnalysisData = ref<InspectionTasksType | null>(null);
    const inspectionPlanAnalysisData = ref<PatrolSchemeType | null>(null);
    const inspectionsNumberData = ref<InspectionsNumber | null>(null);
    const inspectionNumDataList = reactive<{ xData: string[]; yData1: number[]; yData2: number[] }>({
      xData: ["0"],
      yData1: [0],
      yData2: [0],
    });

    const inspectPerformanceInfo = ref<PlateItem[]>([]);
    const inspectPerformanceData = ref<TaskExecutionAnalysis | null>(null);

    const inspectLoading = reactive({
      taskAnalysisSpinning: false,
      performanceAnalysisSpinning: false,
      PatrolObjectsSpinning: false,
    });

    const departmentTasks = reactive<{
      obj?: DepTaskExecutionAnalysis | null;
      departmentTasksxData: string[];
      departmentTasks: Array<{ name: string; data: string[]; color: string }>;
    }>({
      departmentTasksxData: [],
      departmentTasks: [],
    });

    const departmentTasksData = reactive<{
      xData: string[];
      yData: Array<{ name: string; color: string; data: string[] }>;
    }>({
      xData: [],
      yData: [],
    });

    const taskTimeConsumptionData = reactive<TaskTimeAnalysis>({
      totalElapsedTime: 0,
      totalElapsedTimeRatio: "0",
      taskTypeTime: [{ inspectionType: "", taskTimeRatio: "", taskTime: 0, taskTimeHour: "" }],
    });
    const taskTimeConsumptionCharData = reactive<{ xData: string[]; yData: string[] }>({
      xData: [],
      yData: [],
    });

    const analysisOfAuditResultsData = reactive<AnalysisOfAuditResults>({
      totalCheckTaskNum: 0,
      totalCheckTaskNumRatio: "",
      top5Match: [],
      last5Match: [],
    });

    const objectAnalysisData = reactive<InspectionObjTaskAnalysis>({
      inspectionTaskTotalNum: 0,
      maxTaskNumObj: "",
      maxTaskNum: "",
      maxTaskNumRatio: "",
      minTaskNumObj: "",
      minTaskNumRatio: "",
      minTaskNum: "",
    });
    const objectCountData = reactive<InspectionObjAnalysis>({
      totalInspectionNum: 0,
      maxNum: 0,
      minNum: 0,
      totalInspectionNumRatio: "",
      maxNumObj: "",
      maxNumRatio: "",
      minNumObj: "",
      minNumRatio: "",
    });
    const abnormalItemData = reactive<InspectionObjAbnormalAnalysis>({
      abnormalObjNum: 0,
      maxAbnormalObjNum: 0,
      minAbnormalObjNum: 0,
      abnormalObjNumRatio: "",
      maxAbnormalObj: "",
      maxAbnormalObjNumRatio: "",
      minAbnormalObj: "",
      minAbnormalObjNumRatio: "",
    });

    const inspectionsNumber = reactive<{ xData: string[]; yData: number[] }>({ xData: [], yData: [] });
    const abnormalItemEchar = reactive<{ xData: string[]; yData: number[] }>({ xData: [], yData: [] });
    const inspectionTasksEcahr = reactive<{ xData: string[]; yData: number[] }>({ xData: [], yData: [] });
    const inspectionTaskLastEcahr = reactive<{ xData: string[]; yData: number[] }>({ xData: [], yData: [] });
    const inspectCategoryData = ref<TargetCategoryItem[]>([]);

    const patrolObjectsParame = reactive<{
      timesNumber?: string;
      abnormal?: string;
      taskNumberTop?: string;
      taskNumberLast?: string;
      optionList: Array<{ id: string; name: string }>;
    }>({
      timesNumber: undefined,
      abnormal: undefined,
      taskNumberTop: undefined,
      taskNumberLast: undefined,
      optionList: [...OBJ_TYPE_OPTIONS],
    });

    const periodParams = (): { period: string } => ({ period: formatPeriod(period.value) });

    const getTaskAnalysis = async (): Promise<void> => {
      inspectionAnalysisData.value = await fetchAnalysis<InspectionTasksType>("inspectionTaskAnalysis", periodParams());
    };

    const getPlanAnalysis = async (): Promise<void> => {
      inspectionPlanAnalysisData.value = await fetchAnalysis<PatrolSchemeType>("inspectionPlanAnalysis", periodParams());
    };

    const getInspectNum = async (): Promise<void> => {
      inspectionNumDataList.xData = [];
      inspectionNumDataList.yData1 = [];
      inspectionNumDataList.yData2 = [];
      const data = await fetchAnalysis<InspectionsNumber>("inspectionFrequencyAnalysis", periodParams());
      inspectionsNumberData.value = data;
      for (const element of data?.trendOfInspectionTimesVOS ?? []) {
        inspectionNumDataList.xData.push(String(element.abscissa ?? ""));
        inspectionNumDataList.yData1.push(Number(element.taskNum ?? 0));
        inspectionNumDataList.yData2.push(Number(element.numberOfInspection ?? 0));
      }
    };

    const getPerformanceAnalysis = async (): Promise<void> => {
      const data = await fetchAnalysis<TaskExecutionAnalysis>("taskExecutionAnalysis", periodParams());
      inspectPerformanceData.value = data;
      const plates: PlateItem[] = [];
      for (const key of Object.keys(data ?? {})) {
        if (key === "totalTaskNumRatio") continue;
        const title = PERFORMANCE_TITLE[key];
        if (!title) continue;
        plates.push({ value: Number(data?.[key] ?? 0), name: title });
      }
      inspectPerformanceInfo.value = plates;
    };

    const departmentTaskSituation = async (): Promise<void> => {
      departmentTasksData.xData = [];
      departmentTasksData.yData = [];
      departmentTasks.departmentTasks = [];
      departmentTasks.departmentTasksxData = [];
      const data = await fetchAnalysis<DepTaskExecutionAnalysis>("depTaskExecutionAnalysis", periodParams());
      departmentTasks.obj = data;
      const completeTaskNum: string[] = [];
      const totalTaskNum: string[] = [];
      const overTimeTaskNum: string[] = [];
      const expireTaskNum: string[] = [];
      for (const item of data?.addDepTask ?? []) {
        departmentTasksData.xData.push(String(item.depName ?? ""));
        departmentTasks.departmentTasksxData.push(String(item.depName ?? ""));
        completeTaskNum.push(String(item.completeTaskNum ?? "0"));
        totalTaskNum.push(String(item.totalTaskNum ?? "0"));
        expireTaskNum.push(String(item.expireTaskNum ?? "0"));
        overTimeTaskNum.push(String(item.overTimeTaskNum ?? "0"));
      }
      departmentTasksData.yData = [
        { name: "已完成任务数", color: "#1AD598", data: completeTaskNum },
        { name: "任务数", color: "#1890FF", data: totalTaskNum },
      ];
      departmentTasks.departmentTasks = [
        { name: "任务总数", data: totalTaskNum, color: "#1AD598" },
        { name: "正常完成任务数", data: completeTaskNum, color: "#1890FF" },
        { name: "超时完成任务数", data: overTimeTaskNum, color: "#FBA33F" },
        { name: "过期未执行数", data: expireTaskNum, color: "#FBA33F" },
      ];
    };

    const taskTimeConsumption = async (): Promise<void> => {
      taskTimeConsumptionCharData.xData = [];
      taskTimeConsumptionCharData.yData = [];
      const data = await fetchAnalysis<TaskTimeAnalysis>("taskTimeAnalysis", periodParams());
      for (const item of data?.taskTypeTime ?? []) {
        if (!item.taskTime) continue;
        taskTimeConsumptionCharData.xData.push(String(item.inspectionType ?? ""));
        taskTimeConsumptionCharData.yData.push(String(item.taskTimeHour ?? ""));
      }
      Object.assign(taskTimeConsumptionData, data ?? {});
      if (!taskTimeConsumptionData.taskTypeTime?.length) {
        taskTimeConsumptionData.taskTypeTime = [{ inspectionType: "", taskTimeRatio: "", taskTime: 0, taskTimeHour: "" }];
      }
    };

    const auditAnalysis = async (): Promise<void> => {
      const data = await fetchAnalysis<AnalysisOfAuditResults>("analysisOfAuditResults", periodParams());
      Object.assign(analysisOfAuditResultsData, data ?? {});
    };

    const objectAnalysis = async (): Promise<void> => {
      const data = await fetchAnalysis<InspectionObjTaskAnalysis>("inspectionObjTaskAnalysis", periodParams());
      Object.assign(objectAnalysisData, data ?? {});
    };

    const objectCount = async (): Promise<void> => {
      const data = await fetchAnalysis<InspectionObjAnalysis>("inspectionObjAnalysis", periodParams());
      Object.assign(objectCountData, data ?? {});
    };

    const abnormalAnalysis = async (): Promise<void> => {
      const data = await fetchAnalysis<InspectionObjAbnormalAnalysis>("inspectionObjAbnormalAnalysis", periodParams());
      Object.assign(abnormalItemData, data ?? {});
    };

    const getInspectionNumTop = async (): Promise<void> => {
      inspectionsNumber.xData = [];
      inspectionsNumber.yData = [];
      const data = await fetchAnalysis<ObjInspectionNumTop[]>("objInspectionNumTop", {
        ...periodParams(),
        objType: resolveObjType(patrolObjectsParame.timesNumber),
      });
      inspectionsNumber.xData = (data ?? []).map((item) => String(item.objName ?? ""));
      inspectionsNumber.yData = (data ?? []).map((item) => Number(item.inspectionNum ?? 0));
    };

    const getAbnormalItemNumTop = async (): Promise<void> => {
      abnormalItemEchar.xData = [];
      abnormalItemEchar.yData = [];
      const data = await fetchAnalysis<ObjInspectionNumTop[]>("objAbnormalNumTop", {
        ...periodParams(),
        objType: resolveObjType(patrolObjectsParame.abnormal),
      });
      abnormalItemEchar.xData = (data ?? []).map((item) => String(item.objName ?? ""));
      abnormalItemEchar.yData = (data ?? []).map((item) => Number(item.inspectionNum ?? 0));
    };

    const inspectionTaskTop = async (): Promise<void> => {
      inspectionTasksEcahr.xData = [];
      inspectionTasksEcahr.yData = [];
      const data = await fetchAnalysis<ObjInspectionNumTop[]>("objInspectionTaskTop", {
        ...periodParams(),
        objType: resolveObjType(patrolObjectsParame.taskNumberTop),
      });
      inspectionTasksEcahr.xData = (data ?? []).map((item) => String(item.objName ?? ""));
      inspectionTasksEcahr.yData = (data ?? []).map((item) => Number(item.inspectionNum ?? 0));
    };

    const inspectionTasksLast = async (): Promise<void> => {
      inspectionTaskLastEcahr.xData = [];
      inspectionTaskLastEcahr.yData = [];
      const data = await fetchAnalysis<ObjInspectionNumTop[]>("objInspectionTaskLast", {
        ...periodParams(),
        objType: resolveObjType(patrolObjectsParame.taskNumberLast),
      });
      inspectionTaskLastEcahr.xData = (data ?? []).map((item) => String(item.objName ?? ""));
      inspectionTaskLastEcahr.yData = (data ?? []).map((item) => Number(item.inspectionNum ?? 0));
    };

    const getInspectCategory = async (): Promise<void> => {
      const data = await fetchAnalysis<TargetCategoryItem[]>("getTargetCategory", periodParams());
      inspectCategoryData.value = (data ?? []).map((item) => ({
        ...item,
        name: CATEGORY_NAME_MAP[String(item.targetCategory ?? "")] ?? item.name,
      }));
    };

    const changePatroObjects = async (key: "timesNumber" | "abnormal" | "taskNumberTop" | "taskNumberLast"): Promise<void> => {
      if (key === "timesNumber") await getInspectionNumTop();
      else if (key === "abnormal") await getAbnormalItemNumTop();
      else if (key === "taskNumberTop") await inspectionTaskTop();
      else await inspectionTasksLast();
    };

    const searchEvent = async (): Promise<void> => {
      inspectLoading.taskAnalysisSpinning = true;
      inspectLoading.performanceAnalysisSpinning = true;
      inspectLoading.PatrolObjectsSpinning = true;
      try {
        await getPerformanceAnalysis();
        await departmentTaskSituation();
        await taskTimeConsumption();
        await auditAnalysis();
        await objectAnalysis();
        await objectCount();
        await getInspectCategory();
        inspectLoading.performanceAnalysisSpinning = false;
        await abnormalAnalysis();
        await getInspectionNumTop();
        await getAbnormalItemNumTop();
        await inspectionTaskTop();
        await inspectionTasksLast();
        inspectLoading.PatrolObjectsSpinning = false;
        await getTaskAnalysis();
        await getPlanAnalysis();
        await getInspectNum();
      } finally {
        inspectLoading.taskAnalysisSpinning = false;
        inspectLoading.performanceAnalysisSpinning = false;
        inspectLoading.PatrolObjectsSpinning = false;
      }
    };

    const changeTime = (value: TimeType): void => {
      timeType.value = value;
      const now = dayjs();
      if (value === "ToDay") period.value = [now.startOf("day"), now];
      else if (value === "ThisWeek") period.value = [now.startOf("week"), now];
      else if (value === "ThisMonth") period.value = [now.startOf("month"), now];
      else period.value = [now.startOf("year"), now];
      void searchEvent();
    };

    onMounted(() => {
      void searchEvent();
    });

    const planTypes = (): PlanTypeItem[] => inspectionPlanAnalysisData.value?.proportionOfPlanTypesVOS ?? [];

    const firstPlan = (): ProportionOfPlanTypes | undefined => planTypes()[0];

    const taskTypeTimeList = (): TaskTypeTime[] => taskTimeConsumptionData.taskTypeTime ?? [];

    const firstTaskType = (): TaskTypeTime | undefined => taskTypeTimeList()[0];

    const lastTaskType = (): TaskTypeTime | undefined => {
      const list = taskTypeTimeList();
      return list.length ? list[list.length - 1] : undefined;
    };

    const topMatch = (): AuditMatchRow | undefined => analysisOfAuditResultsData.top5Match?.[0];
    const lastMatch = (): AuditMatchRow | undefined => analysisOfAuditResultsData.last5Match?.[0];

    const sliceSeries = (xData: string[], yData: Array<{ name: string; color: string; data: string[] }>, start: number, end?: number) => {
      const slicedX = xData.slice(start, end);
      return {
        xData: slicedX,
        yData: yData.map((item) => ({
          ...item,
          data: (item.data ?? []).slice(start, end),
        })),
      };
    };

    const renderAuditTable = (rows: AuditMatchRow[] | undefined) => (
      <Table
        dataSource={rows ?? []}
        columns={AUDIT_COLUMNS}
        pagination={false}
        rowKey={(_, index) => String(index)}
        v-slots={{
          bodyCell: ({ column, index }: { column: { dataIndex?: string }; index: number }) => {
            if (column.dataIndex !== "index") return null;
            const style = rankingStyle(index);
            return style ? (
              <span class={styles.ranking} style={style}>
                {index + 1}
              </span>
            ) : (
              <span>{index + 1}</span>
            );
          },
        }}
      />
    );

    const renderCategoryDetail = (details: CategoryDetail | undefined) => {
      if (!details) return null;
      if (details.name === "inspection") {
        return (
          <div class={styles.inspectTypeItemContent}>
            <div>巡检次数：{details.num}</div>
            <div class={styles.inspectTypeItemContentRight}>次数占比：{details.proportion}</div>
          </div>
        );
      }
      if (details.name === "task") {
        return (
          <div class={styles.inspectTypeItemContent}>
            <div>任务数：{details.num}</div>
            <div class={styles.inspectTypeItemContentRight}>任务数占比：{details.proportion}</div>
          </div>
        );
      }
      return (
        <div class={styles.inspectTypeItemContent}>
          <div>异常次数：{details.num}</div>
          <div class={styles.inspectTypeItemContentRight}>异常次数占比：{details.proportion}</div>
        </div>
      );
    };

    const objTypeSelect = (field: "timesNumber" | "abnormal" | "taskNumberTop" | "taskNumberLast", value: string | undefined) => (
      <div class={styles.selectRight}>
        <Select
          value={value}
          placeholder="请选择类型"
          style={{ width: "120px" }}
          allowClear
          getPopupContainer={(triggerNode) => triggerNode.parentElement ?? document.body}
          onChange={(next) => {
            patrolObjectsParame[field] = next == null ? undefined : String(next);
            void changePatroObjects(field);
          }}
        >
          {patrolObjectsParame.optionList.map((item) => (
            <SelectOption key={item.id} value={item.name}>
              <div style={{ textAlign: "center" }}>{item.name}</div>
            </SelectOption>
          ))}
        </Select>
      </div>
    );

    return () => {
      const top5 = sliceSeries(departmentTasksData.xData, departmentTasksData.yData, 0, 5);
      const last5 = sliceSeries(departmentTasksData.xData, departmentTasksData.yData, Math.max(0, departmentTasksData.xData.length - 5));
      const planList = planTypes();
      const plan0 = firstPlan();
      const task0 = firstTaskType();
      const taskLast = lastTaskType();
      const auditTop = topMatch();
      const auditLast = lastMatch();

      return (
        <PageLayout
          title="巡检分析"
          showFooter={false}
          v-slots={{
            "layout-header": () => (
              <div class={styles.headerBtn}>
                <RadioGroup
                  value={timeType.value}
                  optionType="button"
                  buttonStyle="solid"
                  options={[
                    { label: "今日", value: "ToDay" },
                    { label: "本周", value: "ThisWeek" },
                    { label: "本月", value: "ThisMonth" },
                    { label: "今年", value: "ThisYear" },
                  ]}
                  onChange={(event) => changeTime(String(event.target.value) as TimeType)}
                />
                <RangePicker
                  value={period.value}
                  allowClear={false}
                  showTime
                  format="YYYY-MM-DD HH:mm:ss"
                  onChange={(value) => {
                    if (value?.[0] && value[1]) {
                      period.value = [dayjs(value[0]), dayjs(value[1])];
                    }
                  }}
                  onOk={(value) => {
                    if (value?.[0] && value[1]) {
                      period.value = [dayjs(value[0]), dayjs(value[1])];
                      void searchEvent();
                    }
                  }}
                />
              </div>
            ),
            "layout-content": () => (
              <div class={styles.box}>
                <div class={styles.taskAnalysis}>
                  <div class={styles.sectionTitle}>巡检任务分析</div>
                  <Spin spinning={inspectLoading.taskAnalysisSpinning}>
                    <div class={styles.taskAnalysisBox}>
                      <div class={styles.taskAnalysisLeft}>
                        <div class={styles.taskAnalysisTop}>
                          共<span class={[styles.blue1, styles.textNum]}>{inspectionPlanAnalysisData.value?.patrolSchemeTotal}</span>
                          个巡检计划在正常使用中，其中
                          <span class={styles.blue1}>{plan0?.planType}</span>
                          的巡检计划最多，有
                          <span class={[styles.blue1, styles.textNum]}>{plan0?.planNum}</span>个
                        </div>
                        {planList.length > 0 ? (
                          <div class={styles.taskAnalysisBottom}>
                            <div class={styles.barChar}>
                              <PlanTypePieChart data={planList} />
                            </div>
                            <BarList data={planList} />
                          </div>
                        ) : (
                          <div class={styles.taskAnalysisBottom}>
                            <Empty />
                          </div>
                        )}
                      </div>
                      <div class={styles.taskAnalysisRight}>
                        <div class={styles.taskAnalysisTop}>
                          截止到目前，一共下发了
                          <span class={[styles.blue1, styles.textNum]}>{inspectionAnalysisData.value?.taskTotalNum}</span>
                          个巡检任务，环比下降了 <span class={styles.green1}>{inspectionAnalysisData.value?.taskTotalNumRatio}</span>
                          ;其中有
                          <span class={[styles.blue1, styles.textNum]}>{inspectionAnalysisData.value?.completeTaskNum}</span>
                          个任务正常执行完成，环比上升
                          <span class={styles.red1}>{inspectionAnalysisData.value?.completeTaskNumRatio}</span>
                          ;结果异常的有
                          <span class={[styles.blue1, styles.textNum]}>{inspectionAnalysisData.value?.abnormalTaskNum}</span>
                          个，环比下降
                          <span class={styles.green1}>{inspectionAnalysisData.value?.abnormalTaskNumRatio}</span>
                        </div>
                        <div class={styles.taskAnalysisBottom}>
                          <div class={styles.contentBox}>
                            <div class={styles.pieChar}>
                              <RatioPieChart color="#1AD598" data={inspectionAnalysisData.value?.periodTaskNumProportion ?? "0%"} />
                            </div>
                            <PieList
                              value={inspectionAnalysisData.value?.periodTaskNum ?? 0}
                              name="期间巡检占比"
                              ratio={inspectionAnalysisData.value?.completeTaskNumRatio ?? "0"}
                            />
                          </div>
                          <div class={styles.contentBox}>
                            <div class={styles.pieChar}>
                              <RatioPieChart color="#1AD598" data={inspectionAnalysisData.value?.completeTaskNumProportion ?? "0%"} />
                            </div>
                            <PieList
                              value={inspectionAnalysisData.value?.completeTaskNum ?? 0}
                              name="已完成占比"
                              ratio={inspectionAnalysisData.value?.completeTaskNumRatio ?? "0"}
                            />
                          </div>
                          <div class={styles.contentBox}>
                            <div class={styles.pieChar}>
                              <RatioPieChart color="#1890FF" data={inspectionAnalysisData.value?.abnormalTaskNumProportion ?? "0%"} />
                            </div>
                            <PieList
                              value={inspectionAnalysisData.value?.abnormalTaskNum ?? 0}
                              name="结果异常占比"
                              ratio={inspectionAnalysisData.value?.abnormalTaskNumRatio ?? "0"}
                            />
                          </div>
                          <div class={styles.contentBox}>
                            <div class={styles.pieChar}>
                              <RatioPieChart color="#FE6BBA" data={inspectionAnalysisData.value?.expireTaskNumProportion ?? "0%"} />
                            </div>
                            <PieList
                              value={inspectionAnalysisData.value?.expireTaskNum ?? 0}
                              name="过期未执行占比"
                              ratio={inspectionAnalysisData.value?.expireTaskNumRatio ?? "0"}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class={styles.taskAnalysisTop}>
                      截止到目前，一共下发了
                      <span class={[styles.blue1, styles.textNum]}>{inspectionsNumberData.value?.taskTotalNum}</span>
                      个巡检任务，覆盖对象有 <span class={[styles.blue1, styles.textNum]}>{inspectionsNumberData.value?.objNum}</span>
                      个，对象覆盖率
                      <span class={[styles.blue1, styles.textNum]}>{inspectionsNumberData.value?.objCoverageRate}</span>
                      环比下降
                      <span class={styles.blue1}>{inspectionsNumberData.value?.objCoverageRateRatio}</span>
                      ，巡检次数共有
                      <span class={[styles.blue1, styles.textNum]}>{inspectionsNumberData.value?.inspectionTotalNum}</span>
                      次，环比下降
                      <span class={styles.green1}>{inspectionsNumberData.value?.inspectionTotalNumRatio}</span>
                    </div>
                    <div class={styles.lineChar}>
                      <TrendLineChart
                        xData={inspectionNumDataList.xData}
                        yData1={inspectionNumDataList.yData1}
                        yData2={inspectionNumDataList.yData2}
                      />
                    </div>
                  </Spin>
                </div>

                <Spin spinning={inspectLoading.performanceAnalysisSpinning}>
                  <div class={styles.performanceAnalysis}>
                    <div class={styles.sectionTitle}>任务执行分析</div>
                    <div style={{ marginBottom: "12px" }}>
                      <PlateList data={inspectPerformanceInfo.value} />
                    </div>
                    {departmentTasks.departmentTasksxData.length ? (
                      <div class={styles.columBox}>
                        <StackedColumnChart xData={departmentTasks.departmentTasksxData} yData={departmentTasks.departmentTasks} />
                      </div>
                    ) : (
                      <Empty />
                    )}
                    <div class={styles.taskAnalysisTop} style={{ marginBottom: "10px" }}>
                      截止到目前，一共下发了
                      <span class={[styles.blue1, styles.textNum]}>{inspectPerformanceData.value?.totalTaskNum}</span>
                      个巡检任务，环比下降了 <span class={styles.green1}>{inspectPerformanceData.value?.totalTaskNumRatio}</span>;其中:
                    </div>
                    <DepartmentStatus data={departmentTasks.obj} />
                    <div class={styles.taskCharts}>
                      <div class={styles.taskChartItem}>
                        <HorizontalBarChart title="部门巡检任务Top5" data={top5.yData} xData={top5.xData} />
                      </div>
                      <div class={styles.taskChartItem}>
                        <HorizontalBarChart title="部门巡检任务last5" data={last5.yData} xData={last5.xData} />
                      </div>
                    </div>
                    <div class={styles.taskAnalysisTop}>
                      截止到目前，在巡检一共花了
                      <span class={[styles.blue1, styles.textNum]}>{taskTimeConsumptionData.totalElapsedTime}</span>
                      个小时，环比下降 <span class={styles.green1}>{taskTimeConsumptionData.totalElapsedTimeRatio}</span>;其中有
                      <span class={[styles.blue1, styles.textNum]}>{task0?.inspectionType}</span>
                      任务耗时最多，一共有
                      <span class={styles.blue1}>{task0?.taskTimeHour}个小时</span>,环比上升
                      <span class={styles.red1}>{task0?.taskTimeRatio}</span>，
                      <span class={[styles.blue1, styles.textNum]}>{taskLast?.inspectionType}</span>
                      任务耗时最少，一共有
                      <span class={styles.blue1}>{taskLast?.taskTimeHour}个小时</span>环比上升
                      <span class={styles.red1}>{taskLast?.taskTimeRatio}</span>
                    </div>
                    <div class={styles.columnBox}>
                      <FoundationColumnChart xData={taskTimeConsumptionCharData.xData} yData={taskTimeConsumptionCharData.yData} />
                    </div>
                    <div class={styles.taskAnalysisTop} style={{ marginBottom: "10px" }}>
                      截止到目前，一共下发了
                      <span class={[styles.blue1, styles.textNum]}>{analysisOfAuditResultsData.totalCheckTaskNum}</span>
                      个稽查任务，环比下降了 <span class={styles.green1}>{analysisOfAuditResultsData.totalCheckTaskNumRatio}</span>;其中：
                    </div>
                    <div class={styles.inspectInfo}>
                      <div class={styles.inspectInfoLeft}>
                        <div class={styles.inspectInfoTop}>
                          由 <span>{auditTop?.dutyOfficer || "--"}</span> （人员姓名）负责的
                          <span>{auditTop?.taskName || "--"}</span> （任务名称）,稽查结果匹配率最高，稽查结果匹配率为
                          <span class={styles.blue1}>{auditTop?.matchRatio || "--"}</span>
                        </div>
                        <div class={styles.tableTitle}>稽查匹配率Top5</div>
                        {renderAuditTable(analysisOfAuditResultsData.top5Match)}
                      </div>
                      <div class={styles.inspectInfoRight}>
                        <div class={styles.inspectInfoTop}>
                          由 <span>{auditLast?.dutyOfficer || "--"}</span> （人员姓名）负责的
                          <span>{auditLast?.taskName || "--"}</span> （任务名称）,稽查结果匹配率最低，稽查结果匹配率为
                          <span class={styles.blue1}>{auditLast?.matchRatio || "--"}</span>
                        </div>
                        <div class={styles.tableTitle}>稽查匹配率Last5</div>
                        {renderAuditTable(analysisOfAuditResultsData.last5Match)}
                      </div>
                    </div>
                  </div>
                </Spin>

                <Spin spinning={inspectLoading.PatrolObjectsSpinning}>
                  <div class={styles.patrolObjects}>
                    <div class={styles.sectionTitle}>巡检对象分析</div>
                    <div class={styles.inspectType}>
                      {inspectCategoryData.value.map((item) => (
                        <div class={styles.inspectTypeItem} key={String(item.targetCategory ?? item.name)}>
                          <div class={styles.inspectTypeItemTitle}>{item.name}</div>
                          {(item.details ?? []).map((detail, index) => (
                            <div key={`${detail.name}-${index}`}>{renderCategoryDetail(detail)}</div>
                          ))}
                        </div>
                      ))}
                    </div>
                    <div class={styles.patrolObjectsBox} style={{ marginTop: "24px" }}>
                      <div class={styles.patrolObjectsList}>
                        <div class={styles.taskAnalysisTop}>
                          在此期间，巡检次数一共 有<span class={[styles.blue1, styles.textNum]}>{objectCountData.totalInspectionNum}</span>
                          次，环比上升 <span class={styles.red1}>{objectCountData.totalInspectionNumRatio}</span>; 其中
                          <span class={[styles.blue1, styles.textNum]}>{objectCountData.maxNumObj}</span>
                          巡检次数最多有
                          <span class={styles.red1}>{objectCountData.maxNum}</span>; 次，环比下降
                          <span class={[styles.blue1, styles.textNum]}>{objectCountData.maxNumRatio}</span>，
                          <span class={styles.blue1}>{objectCountData.minNumObj}</span>
                          巡检次数最少，有
                          <span class={styles.blue1}>{objectCountData.minNum}</span>次，环比
                          <span class={styles.blue1}>{objectCountData.minNumRatio}</span>
                        </div>
                        {objTypeSelect("timesNumber", patrolObjectsParame.timesNumber)}
                        <div class={styles.columnBox}>
                          <HorizontalBarChart
                            title="对象巡检次数Top10"
                            xData={inspectionsNumber.xData}
                            data={[{ color: "#1890FF", name: "", data: inspectionsNumber.yData }]}
                          />
                        </div>
                      </div>
                      <div class={styles.patrolObjectsList}>
                        <div class={styles.taskAnalysisTop}>
                          在此期间，对象异常项一共有
                          <span class={[styles.blue1, styles.textNum]}>{abnormalItemData.abnormalObjNum}</span>
                          个，环比下降 <span class={styles.blue1}>{abnormalItemData.abnormalObjNumRatio}</span>
                          ；其中 ，<span class={[styles.blue1, styles.textNum]}>{abnormalItemData.maxAbnormalObj}</span>
                          巡检异常项最多有
                          <span class={[styles.blue1, styles.textNum]}>{abnormalItemData.maxAbnormalObjNum}</span>
                          个，环比下降
                          <span class={[styles.blue1, styles.textNum]}>{abnormalItemData.maxAbnormalObjNumRatio}</span>;
                          <span class={[styles.blue1, styles.textNum]}>{abnormalItemData.minAbnormalObj}</span>
                          巡检异常项最少，有
                          <span class={[styles.blue1, styles.textNum]}>{abnormalItemData.minAbnormalObjNum}</span>
                          次，环比下降
                          <span class={[styles.blue1, styles.textNum]}>{abnormalItemData.minAbnormalObjNumRatio}</span>
                        </div>
                        {objTypeSelect("abnormal", patrolObjectsParame.abnormal)}
                        <div class={styles.columnBox}>
                          <HorizontalBarChart
                            title="对象异常项数排名Top10"
                            xData={abnormalItemEchar.xData}
                            data={[{ color: "#FBA33F", name: "", data: abnormalItemEchar.yData }]}
                          />
                        </div>
                      </div>
                    </div>
                    <div class={styles.taskAnalysisTop} style={{ marginBottom: "20px" }}>
                      在此期间，巡检任务一共
                      <span class={[styles.blue1, styles.textNum]}>{objectAnalysisData.inspectionTaskTotalNum}</span>
                      个，其中针对
                      <span class={[styles.blue1, styles.textNum]}>{objectAnalysisData.maxTaskNumObj}</span>
                      下发的巡检任务数最多，有
                      <span class={[styles.blue1, styles.textNum]}>{objectAnalysisData.maxTaskNum}</span>
                      个，环比下降
                      <span class={styles.red1}>{objectAnalysisData.maxTaskNumRatio}</span>
                      针对
                      <span class={[styles.blue1, styles.textNum]}>{objectAnalysisData.minTaskNumObj}</span>
                      下发的巡检任务数最少，有
                      <span class={styles.blue1}>{objectAnalysisData.minTaskNum}</span>个，环比下降
                      <span class={styles.blue1}>{objectAnalysisData.minTaskNumRatio}</span>
                    </div>
                    <div class={styles.patrolObjectsBox}>
                      <div class={styles.patrolObjectsList}>
                        {objTypeSelect("taskNumberTop", patrolObjectsParame.taskNumberTop)}
                        <div class={styles.columnBox}>
                          <HorizontalBarChart
                            title="对象巡检任务数Top10"
                            xData={inspectionTasksEcahr.xData}
                            data={[{ color: "#5654F5", name: "", data: inspectionTasksEcahr.yData }]}
                          />
                        </div>
                      </div>
                      <div class={styles.patrolObjectsList}>
                        {objTypeSelect("taskNumberLast", patrolObjectsParame.taskNumberLast)}
                        <div class={styles.columnBox}>
                          <HorizontalBarChart
                            title="对象巡检任务数Last10"
                            xData={inspectionTaskLastEcahr.xData}
                            data={[{ color: "#FD683E", name: "", data: inspectionTaskLastEcahr.yData }]}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Spin>
              </div>
            ),
          }}
        />
      );
    };
  },
});

export { InspectionAnalysis as InspectionAnalyse };
export default InspectionAnalysis;
