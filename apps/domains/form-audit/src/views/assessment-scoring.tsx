import type { AppraisalRecord, AppraisalRecordGroup, AppraisalRecordStatus, FormGroup } from "@g2-contract/form-audit";
import { Button, Page, PageLayout, Tag, Tree, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getFormAuditClient } from "../domain-context";
import { downloadBlob, errorMessage, formatDateTime, rangePeriod } from "../shared";

interface GroupNode {
  key: string;
  title: string;
  level: number;
  children?: GroupNode[];
}
function groupNodes(items: FormGroup[]): GroupNode[] {
  return items.map((item) => ({
    key: String(item.id),
    title: item.name,
    level: Number(item.level ?? 1),
    children: item.children?.length ? groupNodes(item.children) : undefined,
  }));
}
function findGroup(items: GroupNode[], key: string): GroupNode | undefined {
  for (const item of items) {
    if (item.key === key) {
      return item;
    }
    const child = findGroup(item.children ?? [], key);
    if (child) {
      return child;
    }
  }
  return undefined;
}
function flattenRecords(groups: AppraisalRecordGroup[]): AppraisalRecord[] {
  const rows: AppraisalRecord[] = [];
  for (const first of groups) {
    if (first.children?.length) {
      for (const second of first.children) {
        for (const record of second.records ?? []) {
          rows.push({
            ...record,
            firstLevelFormGroupId: first.formGroupId,
            firstLevelFormGroupName: first.formGroupName,
            secondLevelFormGroupId: second.formGroupId,
            secondLevelFormGroupName: second.formGroupName,
          });
        }
      }
    } else {
      for (const record of first.records ?? []) {
        rows.push({ ...record, firstLevelFormGroupId: first.formGroupId, firstLevelFormGroupName: first.formGroupName });
      }
    }
  }
  return rows;
}

export const AssessmentScoring = defineComponent({
  name: "FormAuditAssessmentScoring",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const groups = ref<GroupNode[]>([]);
    const selectedGroup = ref<GroupNode>();
    const exporting = ref(false);
    const query = reactive<{ keyword: string; inspectionItem: string; generatedTimeRange?: unknown[] }>({
      keyword: "",
      inspectionItem: "",
    });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });

    const fixedFilters = () => ({
      assessmentYear: route.query.assessmentYear ? Number(route.query.assessmentYear) : undefined,
      assessmentPeriod: route.query.assessmentPeriod ? Number(route.query.assessmentPeriod) : undefined,
      periodType: typeof route.query.periodType === "string" ? route.query.periodType : undefined,
      responsibleDepartmentId: typeof route.query.responsibleDepartmentId === "string" ? route.query.responsibleDepartmentId : undefined,
      status: typeof route.query.status === "string" ? (route.query.status as AppraisalRecordStatus) : undefined,
    });
    const makeQuery = () => {
      const generated = rangePeriod(query.generatedTimeRange)?.split(",");
      return {
        pageNumber: page.pageNumber,
        pageSize: page.pageSize,
        keyword: query.keyword || undefined,
        inspectionItem: query.inspectionItem || undefined,
        generatedBeginTime: generated?.[0],
        generatedEndTime: generated?.[1],
        firstLevelFormGroupId: selectedGroup.value?.level === 1 ? selectedGroup.value.key : undefined,
        secondLevelFormGroupId: selectedGroup.value?.level === 2 ? selectedGroup.value.key : undefined,
        ...fixedFilters(),
      };
    };

    const [PcTable, tableApi] = usePcTable({
      tableCode: "FORM_AUDIT_ASSESSMENT_SCORING",
      rowKey: "id",
      columns: [
        { title: "一级目录", dataIndex: "firstLevelFormGroupName", width: 140, ellipsis: true },
        {
          title: "二级目录",
          dataIndex: "secondLevelFormGroupName",
          width: 140,
          ellipsis: true,
          customRender: ({ text }: { text?: string }) => text || "--",
        },
        { title: "名称", dataIndex: "name", width: 170, ellipsis: true },
        { title: "检查项目", dataIndex: "inspectionItem", width: 170, ellipsis: true },
        { title: "责任部门", dataIndex: "responsibleDepartmentNames", width: 160, ellipsis: true },
        { title: "总分", dataIndex: "originTotalScore", width: 90 },
        { title: "得分", dataIndex: "finalTotalScore", width: 90 },
        {
          title: "扣分",
          dataIndex: "deductScore",
          width: 90,
          customRender: ({ record }: { record: AppraisalRecord }) => {
            const score =
              record.finalTotalScore === null ||
              record.finalTotalScore === undefined ||
              record.originTotalScore === null ||
              record.originTotalScore === undefined
                ? undefined
                : Number(record.finalTotalScore) - Number(record.originTotalScore);
            return score === undefined ? "--" : <Tag color={score < 0 ? "red" : "default"}>{score}</Tag>;
          },
        },
        {
          title: "考核时间",
          dataIndex: "assessmentEndTime",
          width: 170,
          customRender: ({ text }: { text?: string }) => formatDateTime(text),
        },
        {
          title: "操作",
          dataIndex: "action",
          width: 90,
          fixed: "right",
          customRender: ({ record }: { record: AppraisalRecord }) => (
            <Button
              type="link"
              size="small"
              disabled={!record.id}
              onClick={() => void router.push(`/d/form-audit/assessment-scoring/detail/${record.id}`)}
            >
              详情
            </Button>
          ),
        },
      ],
      fetchApi: async () => {
        const result = await getFormAuditClient().pageAppraisalRecords(makeQuery());
        return { ...result, records: flattenRecords(result.records) };
      },
      fetchLoaded(data) {
        page.total = data.total;
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      schema: [
        { component: "Input", fieldName: "keyword", label: "名称", defaultValue: "", componentProps: { allowClear: true } },
        { component: "Input", fieldName: "inspectionItem", label: "检查项目", defaultValue: "", componentProps: { allowClear: true } },
        { component: "RangePicker", fieldName: "generatedTimeRange", label: "生成时间", componentProps: { valueFormat: "YYYY-MM-DD" } },
      ],
      handleSubmit(values) {
        query.keyword = String(values.keyword ?? "").trim();
        query.inspectionItem = String(values.inspectionItem ?? "").trim();
        query.generatedTimeRange = Array.isArray(values.generatedTimeRange) ? values.generatedTimeRange : undefined;
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset() {
        Object.assign(query, { keyword: "", inspectionItem: "", generatedTimeRange: undefined });
        page.pageNumber = 1;
        tableApi.query();
      },
    });

    const exportRecords = async (): Promise<void> => {
      exporting.value = true;
      try {
        downloadBlob(await getFormAuditClient().exportAppraisalRecords(makeQuery()), "考核评分.xlsx");
      } catch (error) {
        message.error(errorMessage(error, "导出失败"));
      } finally {
        exporting.value = false;
      }
    };

    void getFormAuditClient()
      .treeFormGroups()
      .then((data) => {
        groups.value = groupNodes(data);
      })
      .catch((error: unknown) => message.error(errorMessage(error, "表单分组加载失败")));

    return () => (
      <PageLayout
        title="考核评分"
        v-slots={{
          "layout-header": () => (
            <Button type="primary" loading={exporting.value} disabled={!page.total} onClick={() => void exportRecords()}>
              导出
            </Button>
          ),
          "layout-content": () => (
            <div class="form-audit-split">
              <aside class="form-audit-side">
                <div class="form-audit-side-title">表单分组</div>
                <Tree
                  blockNode
                  defaultExpandAll
                  treeData={groups.value}
                  selectedKeys={selectedGroup.value ? [selectedGroup.value.key] : []}
                  onSelect={(keys: (string | number)[]) => {
                    selectedGroup.value = keys.length > 0 ? findGroup(groups.value, String(keys[0])) : undefined;
                    page.pageNumber = 1;
                    tableApi.query();
                  }}
                />
              </aside>
              <main class="form-audit-main form-audit-table-page">
                <PcForm />
                <PcTable />
              </main>
            </div>
          ),
          "footer-page": () => (
            <div style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between" }}>
              <Page
                current={page.pageNumber}
                pageSize={page.pageSize}
                total={page.total}
                cachePageQuery={false}
                onPageChange={(pageNumber: number, pageSize: number) => {
                  page.pageNumber = pageNumber;
                  page.pageSize = pageSize;
                  tableApi.query();
                }}
              />
              <Button onClick={() => void router.push("/d/form-audit/assessment-statistics")}>返回</Button>
            </div>
          ),
        }}
      />
    );
  },
});
