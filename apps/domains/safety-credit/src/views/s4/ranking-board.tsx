import type {
  CreditGrade,
  SafetyCreditIndustryType,
  SafetyCreditRankingPageQuery,
  SafetyCreditRankingSummaryQuery,
  SafetyCreditRankingSummaryVO,
  SafetyCreditRankingVO,
} from "@g2-contract/safety-credit";
import { type PcTableColumn, usePcTable } from "@g2-platform/pc-ui";
import { Page, PageLayout, PopOver, Select, Tag } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref, watchEffect } from "vue";

import { creditGradeColor, creditGradeLabel, displayText, gradeOptions, industryTypeLabel, industryTypeOptions } from "../s2/shared";
import { getSafetyCreditClient } from "@/domain-context";

import "../s2/s2.less";
import "./s4.less";

type OptionalIndustryType = SafetyCreditIndustryType | "";
type OptionalCreditGrade = CreditGrade | "";

interface RankingQueryForm {
  pageNumber: number;
  pageSize: number;
  industryType: OptionalIndustryType;
  creditGrade: OptionalCreditGrade;
}

interface GradeSummaryItem {
  grade: CreditGrade;
  description: string;
  className: string;
}

const gradeSummaryItems: GradeSummaryItem[] = [
  { grade: "A", description: "示范商户", className: "grade-a" },
  { grade: "B", description: "良好商户", className: "grade-b" },
  { grade: "C", description: "关注商户", className: "grade-c" },
  { grade: "D", description: "高风险商户", className: "grade-d" },
];

const gradeFilterOptions: { label: string; value: OptionalCreditGrade }[] = [{ label: "全部", value: "" }, ...gradeOptions];

export const RankingBoard = defineComponent({
  name: "RankingBoard",
  setup: () => {
    const loading = ref(false);
    const rows = ref<SafetyCreditRankingVO[]>([]);
    const total = ref(0);
    const summary = ref<SafetyCreditRankingSummaryVO>({});

    const query = reactive<RankingQueryForm>({
      pageNumber: 1,
      pageSize: 10,
      industryType: "",
      creditGrade: "",
    });

    function buildPageQuery(): SafetyCreditRankingPageQuery {
      const payload: SafetyCreditRankingPageQuery = {
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
      };
      if (query.industryType !== "") {
        payload.industryType = query.industryType;
      }
      if (query.creditGrade !== "") {
        payload.creditGrade = query.creditGrade;
      }
      return payload;
    }

    function buildSummaryQuery(): SafetyCreditRankingSummaryQuery {
      return {};
    }

    async function load(): Promise<void> {
      loading.value = true;
      try {
        const [pageResult, summaryResult] = await Promise.all([
          getSafetyCreditClient().pageRankings(buildPageQuery()),
          getSafetyCreditClient().getRankingSummary(buildSummaryQuery()),
        ]);
        rows.value = pageResult.records ?? [];
        total.value = pageResult.total ?? 0;
        summary.value = summaryResult ?? {};
      } finally {
        loading.value = false;
      }
    }

    function selectGrade(value: OptionalCreditGrade): void {
      query.pageNumber = 1;
      query.creditGrade = value;
      void load();
    }

    function selectIndustry(value: OptionalIndustryType | undefined): void {
      query.pageNumber = 1;
      query.industryType = value ?? "";
      void load();
    }

    function changePage(pageNumber: number, pageSize: number): void {
      query.pageNumber = pageNumber;
      query.pageSize = pageSize;
      void load();
    }

    function gradeCount(grade: CreditGrade): number {
      return summary.value.gradeCounts?.[grade] ?? 0;
    }

    const columns: PcTableColumn[] = [
      {
        title: "排名",
        dataIndex: "rankNo",
        align: "center" as const,
        width: 90,
        customRender: ({ text }: { text?: number }): JSX.Element => <span class="s4-rank-badge">{displayText(text)}</span>,
      },
      {
        title: "商户名称",
        dataIndex: "merchantName",
        align: "left" as const,
        width: 180,
        customRender: ({ text }: { text?: string }): JSX.Element => <PopOver content={displayText(text)}>{displayText(text)}</PopOver>,
      },
      {
        title: "园区",
        dataIndex: "parkName",
        align: "center" as const,
        width: 140,
        customRender: ({ text }: { text?: string }): string => displayText(text),
      },
      {
        title: "行业",
        dataIndex: "industryType",
        align: "center" as const,
        width: 120,
        customRender: ({ text }: { text?: string }): string => industryTypeLabel(text),
      },
      {
        title: "信用分",
        dataIndex: "currentScore",
        align: "center" as const,
        width: 100,
        customRender: ({ text }: { text?: number }): JSX.Element => <span class="s4-score-value">{displayText(text)}</span>,
      },
      {
        title: "等级",
        dataIndex: "creditGrade",
        align: "center" as const,
        width: 90,
        customRender: ({ text }: { text?: CreditGrade }): JSX.Element => <Tag color={creditGradeColor(text)}>{creditGradeLabel(text)}</Tag>,
      },
    ];
    const [DataTable, dataTableApi] = usePcTable({
      rowKey: "merchantId",
      tableCode: "SAFETY_CREDIT_ranking-board",
      columns,
      dataSource: [],
    });
    watchEffect(() => {
      dataTableApi.setState({ dataSource: rows.value });
      dataTableApi.loading.value = loading.value;
    });

    onMounted(() => {
      void load();
    });

    const layoutSlots = {
      "layout-content": (): JSX.Element => (
        <div class="safety-credit-s2 s4-ranking-board">
          <section class="s4-summary-grid">
            {gradeSummaryItems.map((item) => (
              <div class={["summary-card", item.className]}>
                <div class="summary-grade">{item.grade}</div>
                <strong>{gradeCount(item.grade)}</strong>
                <span>{item.description}</span>
              </div>
            ))}
          </section>

          <section class="s4-ranking-panel">
            <div class="s4-ranking-toolbar">
              <div class="s4-grade-tabs">
                {gradeFilterOptions.map((option) => (
                  <button
                    type="button"
                    class={["s4-grade-tab", query.creditGrade === option.value ? "active" : ""]}
                    onClick={() => selectGrade(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div class="s4-industry-filter">
                <span>行业：</span>
                <Select
                  value={query.industryType || undefined}
                  allowClear
                  placeholder="全部行业"
                  options={industryTypeOptions}
                  onChange={(inputValue) => {
                    const value = inputValue as OptionalIndustryType | undefined;
                    return selectIndustry(value);
                  }}
                />
              </div>
            </div>
            <DataTable />
          </section>
        </div>
      ),
      "footer-page": (): JSX.Element => (
        <Page cachePageQuery={false} current={query.pageNumber} pageSize={query.pageSize} total={total.value} onPageChange={changePage} />
      ),
    };

    return (): JSX.Element => <PageLayout title="评分排名看板" v-slots={layoutSlots} />;
  },
});
