import type { SecureEduUpstreamPath } from "@g2-contract/secure-edu";
import { defineComponent, onMounted, reactive } from "vue";

import { PageFrame } from "../components/page-frame";
import { displayValue } from "../components/page-utils";
import { StatChart } from "../components/stat-chart";
import { getSecureEduClient } from "../domain-context";
import { AntRangePicker, Button, Card, getDayjs } from "../pc-ui-runtime";

const dayjs = getDayjs();
import {
  type AttendanceDatum,
  type DistributionDatum,
  type TrendDatum,
  buildAttendanceOption,
  buildThemeDistributionOption,
  buildTrendOption,
  buildTypeDistributionOption,
} from "./overview-options";

import styles from "./over-view.module.css";

const paths = {
  cultivateSummary: "/api/safety-education/cultivate-task/stat",
  cultivateUsers: "/api/safety-education/cultivate-task/trainUser/stat",
  examSummary: "/api/safety-education/exam-task-statistics",
  examTypes: "/api/safety-education/exam-task-statistics/type-ratio",
  cultivateTargets: "/api/safety-education/cultivate-task/target/stat",
  cultivateThemes: "/api/safety-education/cultivate-task/theme/stat",
  examThemes: "/api/safety-education/exam-task-statistics/theme-ratio",
  examAttendance: "/api/safety-education/exam-task-statistics/attendance",
  cultivateAttendance: "/api/safety-education/cultivate-task/userSign/stat",
  cultivateTrend: "/api/safety-education/cultivate-task/trend/stat",
  examTrend: "/api/safety-education/exam-task-statistics/trend",
} as const satisfies Record<string, SecureEduUpstreamPath>;

const quickPeriods = [
  { key: "today", label: "今日" },
  { key: "week", label: "本周" },
  { key: "month", label: "本月" },
  { key: "year", label: "今年" },
] as const;

type QuickPeriod = (typeof quickPeriods)[number]["key"];

function periodRange(period: QuickPeriod): [string, string] {
  const now = dayjs();
  const unit = period === "today" ? "day" : period;
  return [now.startOf(unit).format("YYYY-MM-DD HH:mm:ss"), now.endOf(unit).format("YYYY-MM-DD HH:mm:ss")];
}

function numberValue(record: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = Number(record[key]);
    if (Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
}

function countValue(record: Record<string, unknown>, ...keys: string[]): string {
  return String(numberValue(record, ...keys));
}

function distribution(rows: Record<string, unknown>[], ...valueKeys: string[]): DistributionDatum[] {
  return rows.map((row) => ({ name: displayValue(row.name), value: numberValue(row, ...valueKeys) }));
}

function hasValues(rows: { value: number }[]): boolean {
  return rows.some((row) => row.value > 0);
}

export const OverView = defineComponent({
  name: "SecureEduOverView",
  setup() {
    const client = getSecureEduClient();
    const state = reactive({
      loading: true,
      error: "",
      activePeriod: "today" as QuickPeriod | "custom",
      period: periodRange("today"),
      themeMode: "exam" as "exam" | "training",
      attendanceMode: "exam" as "exam" | "training",
      cultivateSummary: {} as Record<string, unknown>,
      cultivateUsers: {} as Record<string, unknown>,
      examSummary: {} as Record<string, unknown>,
      examTypes: [] as DistributionDatum[],
      cultivateTargets: [] as DistributionDatum[],
      cultivateThemes: [] as DistributionDatum[],
      examThemes: [] as DistributionDatum[],
      examAttendance: [] as AttendanceDatum[],
      cultivateAttendance: [] as AttendanceDatum[],
      cultivateTrend: [] as TrendDatum[],
      examTrend: [] as TrendDatum[],
    });

    const load = async (): Promise<void> => {
      state.loading = true;
      state.error = "";
      let failures = 0;
      const currentQuery = { period: state.period.join(",") };
      const yearQuery = {
        period: `${dayjs().startOf("year").format("YYYY-MM-DD HH:mm:ss")},${dayjs().endOf("year").format("YYYY-MM-DD HH:mm:ss")}`,
      };
      const safeGet = async <T,>(path: SecureEduUpstreamPath, query: Record<string, unknown>): Promise<T | undefined> => {
        try {
          return await client.get<T>(path, query);
        } catch {
          failures += 1;
          return undefined;
        }
      };

      const [
        cultivateSummary,
        cultivateUsers,
        examSummary,
        examTypes,
        cultivateTargets,
        cultivateThemes,
        examThemes,
        examAttendance,
        cultivateAttendance,
        cultivateTrend,
        examTrend,
      ] = await Promise.all([
        safeGet<Record<string, unknown>>(paths.cultivateSummary, currentQuery),
        safeGet<Record<string, unknown>>(paths.cultivateUsers, currentQuery),
        safeGet<Record<string, unknown>>(paths.examSummary, currentQuery),
        safeGet<Record<string, unknown>[]>(paths.examTypes, currentQuery),
        safeGet<Record<string, unknown>[]>(paths.cultivateTargets, currentQuery),
        safeGet<Record<string, unknown>[]>(paths.cultivateThemes, currentQuery),
        safeGet<Record<string, unknown>[]>(paths.examThemes, currentQuery),
        safeGet<Record<string, unknown>[]>(paths.examAttendance, currentQuery),
        safeGet<Record<string, unknown>[]>(paths.cultivateAttendance, currentQuery),
        safeGet<Record<string, unknown>[]>(paths.cultivateTrend, yearQuery),
        safeGet<Record<string, unknown>[]>(paths.examTrend, yearQuery),
      ]);

      state.cultivateSummary = cultivateSummary ?? {};
      state.cultivateUsers = cultivateUsers ?? {};
      state.examSummary = examSummary ?? {};
      state.examTypes = distribution(examTypes ?? [], "totalNum", "num", "value");
      state.cultivateTargets = distribution(cultivateTargets ?? [], "num", "totalNum", "value");
      state.cultivateThemes = distribution(cultivateThemes ?? [], "num", "totalNum", "value");
      state.examThemes = distribution(examThemes ?? [], "totalNum", "num", "value");
      state.examAttendance = (examAttendance ?? []).map((row) => ({
        name: displayValue(row.name),
        primary: numberValue(row, "examUserNumber"),
        secondary: numberValue(row, "noPassedUserNumber"),
        tertiary: numberValue(row, "missExamUserNumber"),
      }));
      state.cultivateAttendance = (cultivateAttendance ?? []).map((row) => ({
        name: displayValue(row.name),
        primary: numberValue(row, "trainNum"),
        secondary: numberValue(row, "unsignedNum"),
        tertiary: numberValue(row, "belatedNum"),
      }));
      state.cultivateTrend = distribution(cultivateTrend ?? [], "num", "value");
      state.examTrend = distribution(examTrend ?? [], "num", "value");
      state.error = failures === 0 ? "" : failures === 11 ? "统计数据读取失败，请稍后重试" : "部分统计数据读取失败，已展示可用数据";
      state.loading = false;
    };

    const selectPeriod = (period: QuickPeriod): void => {
      state.activePeriod = period;
      state.period = periodRange(period);
      void load();
    };

    onMounted(() => void load());

    return () => {
      const cards = [
        { title: "培训任务数", value: countValue(state.cultivateSummary, "cultivateNum"), compare: state.cultivateSummary.qoq },
        { title: "考试任务数", value: countValue(state.examSummary, "totalNum"), compare: state.examSummary.chainRatio },
        { title: "培训缺勤人次", value: countValue(state.cultivateUsers, "unsignedNum") },
        { title: "考试不及格人次", value: countValue(state.examSummary, "noPassedUserNumber") },
        { title: "缺考人次", value: countValue(state.examSummary, "missExamUserNumber") },
      ];
      const themeData = state.themeMode === "exam" ? state.examThemes : state.cultivateThemes;
      const themeTitle = state.themeMode === "exam" ? "考试主题" : "培训主题";
      const attendanceData = state.attendanceMode === "exam" ? state.examAttendance : state.cultivateAttendance;
      const attendanceTitle = state.attendanceMode === "exam" ? "考试出勤情况统计" : "培训出勤情况统计";

      return (
        <PageFrame title="数据总览">
          {{
            actions: () => (
              <div class={styles.toolbar}>
                <div class={styles.quickPeriods}>
                  {quickPeriods.map((item) => (
                    <Button
                      key={item.key}
                      type={state.activePeriod === item.key ? "primary" : "default"}
                      onClick={() => selectPeriod(item.key)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
                <AntRangePicker
                  value={state.period}
                  valueFormat="YYYY-MM-DD HH:mm:ss"
                  showTime
                  placeholder={["开始时间", "结束时间"]}
                  allowClear={false}
                  onUpdate:value={(value: unknown) => {
                    if (!Array.isArray(value) || value.length !== 2) {
                      return;
                    }
                    state.activePeriod = "custom";
                    state.period = [String(value[0]), String(value[1])];
                    void load();
                  }}
                />
                <Button loading={state.loading} onClick={() => void load()}>
                  刷新
                </Button>
              </div>
            ),
            default: () => (
              <div class={styles.overviewContent}>
                {state.error ? (
                  <div class={styles.error} role="alert">
                    {state.error}
                  </div>
                ) : null}
                <div class={styles.summaryGrid}>
                  {cards.map((item) => (
                    <Card key={item.title} class={styles.summaryCard} loading={state.loading}>
                      <div class={styles.summaryTitle}>{item.title}</div>
                      <div class={styles.summaryValue}>{item.value}</div>
                      {item.compare === undefined || item.compare === null ? null : (
                        <div class={styles.summaryCompare}>环比 {displayValue(item.compare)}%</div>
                      )}
                    </Card>
                  ))}
                </div>

                <div class={styles.chartGrid}>
                  <section class={styles.chartPanel}>
                    <header class={styles.chartHeader}>
                      <span class={styles.chartTitle}>考试/培训类型占比</span>
                    </header>
                    <StatChart
                      option={buildTypeDistributionOption(state.examTypes, state.cultivateTargets)}
                      empty={!hasValues(state.examTypes) && !hasValues(state.cultivateTargets)}
                      emptyText="暂无考试或培训类型数据"
                    />
                  </section>
                  <section class={styles.chartPanel}>
                    <header class={styles.chartHeader}>
                      <span class={styles.chartTitle}>培训/考试主题占比</span>
                      <div class={styles.chartSwitch}>
                        <Button
                          size="small"
                          type={state.themeMode === "exam" ? "primary" : "default"}
                          onClick={() => (state.themeMode = "exam")}
                        >
                          考试
                        </Button>
                        <Button
                          size="small"
                          type={state.themeMode === "training" ? "primary" : "default"}
                          onClick={() => (state.themeMode = "training")}
                        >
                          培训
                        </Button>
                      </div>
                    </header>
                    <StatChart
                      option={buildThemeDistributionOption(themeData, themeTitle)}
                      empty={!hasValues(themeData)}
                      emptyText={`暂无${themeTitle}数据`}
                    />
                  </section>
                </div>

                <section class={styles.chartPanel}>
                  <header class={styles.chartHeader}>
                    <span class={styles.chartTitle}>{attendanceTitle}</span>
                    <div class={styles.chartSwitch}>
                      <Button
                        size="small"
                        type={state.attendanceMode === "exam" ? "primary" : "default"}
                        onClick={() => (state.attendanceMode = "exam")}
                      >
                        考试
                      </Button>
                      <Button
                        size="small"
                        type={state.attendanceMode === "training" ? "primary" : "default"}
                        onClick={() => (state.attendanceMode = "training")}
                      >
                        培训
                      </Button>
                    </div>
                  </header>
                  <StatChart
                    option={buildAttendanceOption(attendanceData, state.attendanceMode)}
                    empty={attendanceData.length === 0}
                    emptyText={`暂无${attendanceTitle.replace("统计", "")}数据`}
                  />
                </section>

                <section class={styles.chartPanel}>
                  <header class={styles.chartHeader}>
                    <span class={styles.chartTitle}>考试/培训专题数趋势</span>
                  </header>
                  <StatChart
                    option={buildTrendOption(state.cultivateTrend, state.examTrend)}
                    empty={!hasValues(state.cultivateTrend) && !hasValues(state.examTrend)}
                    emptyText="暂无年度专题趋势数据"
                  />
                </section>
              </div>
            ),
          }}
        </PageFrame>
      );
    };
  },
});
