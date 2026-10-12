import type {
  DutyId,
  DutyReportDetailVO,
  DutyReportGapDetailVO,
  DutyReportMappingDetailVO,
  DutyReportMappingVO,
  DutyTemplateItemVO,
  DutyReportVO,
} from "@g2-contract/safety-personnel";
import { computed, defineComponent, nextTick, onMounted, reactive, ref, watch } from "vue";
import type { JSX } from "vue/jsx-runtime";

import { useAuthRequest } from "@/api/request";
import {
  createDutyReport,
  getDutyReport,
  getDutyReportGapDetail,
  getDutyReportMapping,
  pageDutyTemplateItems,
  pageDutyReports,
} from "@/api/server";
import { PeriodValuePicker, currentPeriodValue, periodRangeFromValue } from "@/components/period-value-picker";
import { PERIOD_OPTIONS, REPORT_METHOD_OPTIONS, TABLE_PAGE_SIZE } from "@/constants";
import { PageLayout, usePcForm, usePcTable, Button, Drawer, Empty, Page, Space, Tag, message } from "@/pc-ui-runtime";
import { formatText, methodLabel, showApiError } from "@/utils";
import { downloadPDF, usePageName } from "@/utils/page";

import styles from "./index.module.css";

const extractArray = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) {
    return payload as T[];
  }
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const object = payload as Record<string, unknown>;
  for (const key of ["records", "list", "rows", "data"]) {
    const value = object[key];
    if (Array.isArray(value)) {
      return value as T[];
    }
    if (value && typeof value === "object") {
      const nested = extractArray<T>(value);
      if (nested.length > 0) {
        return nested;
      }
    }
  }
  return [];
};

interface ReportTypeOption {
  lawNameCode: string;
  lawNameLabel: string;
}

const normalizeTemplateItems = (payload: unknown): DutyTemplateItemVO[] => extractArray<DutyTemplateItemVO>(payload);

const groupReportTypes = (items: DutyTemplateItemVO[]): ReportTypeOption[] => {
  const groups = new Map<string, ReportTypeOption>();
  items.forEach((item) => {
    const lawNameCode = item.lawNameCode || item.lawNameLabel || "";
    const lawNameLabel = item.lawNameLabel || item.lawNameCode || "";
    if (!lawNameCode && !lawNameLabel) {
      return;
    }
    const key = lawNameLabel || lawNameCode;
    const current = groups.get(key);
    if (current) {
      return;
    }
    groups.set(key, {
      lawNameCode,
      lawNameLabel,
    });
  });
  return Array.from(groups.values());
};

export const DutyReportsPage = defineComponent({
  setup() {
    const { pageTitle } = usePageName();
    const generating = ref(false);
    const exportingReportId = ref<DutyId>();
    const records = ref<DutyReportVO[]>([]);
    const total = ref(0);
    const pageNumber = ref(1);
    const pageSize = ref(TABLE_PAGE_SIZE);
    const reportTypes = ref<ReportTypeOption[]>([]);
    const detailOpen = ref(false);
    const mappingOpen = ref(false);
    const detail = ref<DutyReportDetailVO>();
    const pdfDetail = ref<DutyReportDetailVO>();
    const pdfOutputRef = ref<HTMLElement>();
    const mappingDetail = ref<DutyReportMappingDetailVO>();
    const gapDetail = ref<DutyReportGapDetailVO>();
    const wizardStep = ref(1);
    const filters = reactive({
      periodType: "",
      lawNameCode: "",
      generateMethod: "",
    });
    const initialPeriodValue = currentPeriodValue("MONTH");
    const initialPeriodRange = periodRangeFromValue("MONTH", initialPeriodValue);
    const form = reactive({
      periodType: "MONTH",
      periodValue: initialPeriodValue,
      periodStartTime: initialPeriodRange.startTime,
      periodEndTime: initialPeriodRange.endTime,
      lawNameCode: "",
    });
    const selectedPeriodRange = computed(() => periodRangeFromValue(form.periodType, form.periodValue));
    const selectedReportType = computed(() => reportTypes.value.find((item) => item.lawNameCode === form.lawNameCode));

    const loadReportTypeItems = async (): Promise<DutyTemplateItemVO[]> => {
      const typePageSize = 1000;
      const items: DutyTemplateItemVO[] = [];
      let pageNumberForTypes = 1;
      while (true) {
        const page = await useAuthRequest(() =>
          pageDutyTemplateItems({
            pageNumber: pageNumberForTypes,
            pageSize: typePageSize,
          }),
        );
        const pageRecords = normalizeTemplateItems(page.records ?? page);
        items.push(...pageRecords);
        const totalCount = Number(page.total ?? 0);
        const hasLoadedAllByTotal = totalCount > 0 && items.length >= totalCount;
        const hasLoadedLastPage = pageRecords.length < typePageSize;
        if (hasLoadedAllByTotal || hasLoadedLastPage) {
          break;
        }
        pageNumberForTypes += 1;
      }
      return items;
    };

    const loadOptions = async (): Promise<void> => {
      try {
        const normalizedTypes = groupReportTypes(await loadReportTypeItems());
        reportTypes.value = normalizedTypes;
        if (!form.lawNameCode && normalizedTypes[0]) {
          form.lawNameCode = normalizedTypes[0].lawNameCode;
        }
      } catch (e) {
        showApiError(e, "查询报告类型失败");
        reportTypes.value = [];
      }
    };

    onMounted(() => {
      void loadOptions();
    });

    const syncReportPeriodRange = (): void => {
      const range = periodRangeFromValue(form.periodType, form.periodValue);
      form.periodStartTime = range.startTime;
      form.periodEndTime = range.endTime;
    };

    const changeReportPeriodType = (periodType: string): void => {
      form.periodType = periodType;
      form.periodValue = currentPeriodValue(periodType);
      syncReportPeriodRange();
    };

    const changeReportPeriodValue = (periodValue?: string): void => {
      if (!periodValue) {
        return;
      }
      form.periodValue = periodValue;
      syncReportPeriodRange();
    };

    const submitGenerate = async (): Promise<void> => {
      if (!form.lawNameCode) {
        message.warning("请选择报告类型");
        return;
      }
      generating.value = true;
      try {
        await useAuthRequest(() =>
          createDutyReport({
            periodType: form.periodType,
            periodStartTime: form.periodStartTime,
            periodEndTime: form.periodEndTime,
            lawNameCode: form.lawNameCode,
          }),
        );
        message.success("已生成报告记录");
        loadList();
      } catch (e) {
        showApiError(e, "生成失败");
      } finally {
        generating.value = false;
      }
    };

    const openDetail = async (id?: DutyId): Promise<void> => {
      if (!id) {
        return;
      }
      try {
        detail.value = await useAuthRequest(() => getDutyReport(id));
        detailOpen.value = true;
      } catch (e) {
        showApiError(e, "查询详情失败");
      }
    };

    const openMappingDetail = async (mapping: DutyReportMappingVO): Promise<void> => {
      const { reportId, id } = mapping;
      if (!reportId || !id) {
        return;
      }
      try {
        const [mappingData, gapData] = await useAuthRequest(() =>
          Promise.all([
            getDutyReportMapping(reportId, id),
            mapping.mappingStatus === "INCOMPLETE" ? getDutyReportGapDetail(reportId, id) : Promise.resolve({} as DutyReportGapDetailVO),
          ]),
        );
        mappingDetail.value = mappingData;
        gapDetail.value = gapData;
        mappingOpen.value = true;
      } catch (e) {
        showApiError(e, "查询对标详情失败");
      }
    };

    const sourceLabel = (sourceType?: string): string => {
      const map: Record<string, string> = { SYSTEM_COLLECT: "系统采集", MANUAL: "手动填报" };
      return sourceType ? (map[sourceType] ?? sourceType) : "--";
    };

    const methodTag = (method?: string): JSX.Element => <Tag color={method === "AUTO" ? "blue" : "green"}>{methodLabel(method)}</Tag>;

    const safeFileName = (value?: string): string => (value || "合规报告").replace(/[\\/:*?"<>|]/g, "_");

    const loadReportDetail = async (id?: DutyId): Promise<DutyReportDetailVO | undefined> => {
      if (!id) {
        return undefined;
      }
      return await useAuthRequest(() => getDutyReport(id));
    };

    const downloadReportPdf = async (record?: DutyReportVO): Promise<void> => {
      const reportId = record?.id ?? detail.value?.report?.id;
      if (!reportId) {
        message.warning("请选择需要下载的报告");
        return;
      }
      exportingReportId.value = reportId;
      try {
        const reportDetail = detail.value?.report?.id === reportId ? detail.value : await loadReportDetail(reportId);
        if (!reportDetail?.report) {
          message.warning("暂无可导出的报告内容");
          return;
        }
        pdfDetail.value = reportDetail;
        await nextTick();
        if (!pdfOutputRef.value) {
          message.error("PDF 渲染容器未找到");
          return;
        }
        await downloadPDF(pdfOutputRef.value, safeFileName(reportDetail.report.reportName));
      } catch (e) {
        showApiError(e, "下载 PDF 失败");
      } finally {
        exportingReportId.value = undefined;
      }
    };

    const columns = [
      { key: "名称", title: "名称", dataIndex: "reportName", width: 260, ellipsis: true },
      { key: "报告周期", title: "报告周期", dataIndex: "periodLabel", width: 170, ellipsis: true },
      { key: "责任人", title: "责任人", dataIndex: "responsibleUserName", width: 120, ellipsis: true },
      {
        key: "部门",
        title: "部门",
        dataIndex: "deptName",
        width: 140,
        ellipsis: true,
        customRender: ({ text }: { text?: string }) => formatText(text),
      },
      {
        key: "生成时间",
        title: "生成时间",
        dataIndex: "generatedTime",
        width: 170,
        ellipsis: true,
        customRender: ({ text }: { text?: string | number }) => formatText(text),
      },
      {
        key: "生成方式",
        title: "生成方式",
        dataIndex: "generateMethod",
        width: 120,
        customRender: ({ text }: { text?: string }) => methodTag(text),
      },
      {
        key: "操作",
        title: "操作",
        width: 150,
        fixed: "right" as const,
        customRender: ({ record }: { record: DutyReportVO }) => (
          <Space size={4}>
            <Button type="link" size="small" onClick={() => void openDetail(record.id)}>
              查看
            </Button>
            <Button type="link" size="small" loading={exportingReportId.value === record.id} onClick={() => void downloadReportPdf(record)}>
              下载 PDF
            </Button>
          </Space>
        ),
      },
    ];

    const reportFilterSchema = () => [
      {
        component: "Select",
        label: "类型",
        fieldName: "lawNameCode",
        defaultValue: "",
        componentProps: {
          allowClear: true,
          style: { width: "180px" },
          options: reportTypes.value.map((item) => ({ value: item.lawNameCode, label: item.lawNameLabel })),
        },
      },
      {
        component: "Select",
        label: "周期",
        fieldName: "periodType",
        defaultValue: "",
        componentProps: {
          allowClear: true,
          style: { width: "120px" },
          options: PERIOD_OPTIONS,
        },
      },
      {
        component: "Select",
        label: "方式",
        fieldName: "generateMethod",
        defaultValue: "",
        componentProps: {
          style: { width: "120px" },
          options: REPORT_METHOD_OPTIONS,
        },
      },
    ];

    const [QueryForm, formApi] = usePcForm({
      cache: false,
      layout: "horizontal",
      syncStateRef: filters,
      schema: reportFilterSchema(),
      handleSubmit: (values) => {
        filters.lawNameCode = String(values.lawNameCode ?? "");
        filters.periodType = String(values.periodType ?? "");
        filters.generateMethod = String(values.generateMethod ?? "");
        pageNumber.value = 1;
        loadList();
      },
      handleReset: () => {
        filters.periodType = "";
        filters.lawNameCode = "";
        filters.generateMethod = "";
        pageNumber.value = 1;
        loadList();
      },
    });

    watch(
      reportTypes,
      () => {
        formApi.updateSchema(reportFilterSchema());
      },
      { deep: true },
    );

    const [DutyTable, tableApi] = usePcTable({
      tableCode: "safety-duty-reports-1",
      autoScrollY: false,
      columns,
      rowKey: "id",
      fetchApi: async () =>
        useAuthRequest(() =>
          pageDutyReports({
            pageNumber: pageNumber.value,
            pageSize: pageSize.value,
            periodType: filters.periodType || undefined,
            lawNameCode: filters.lawNameCode || undefined,
            generateMethod: filters.generateMethod || undefined,
          }),
        ),
      fetchLoaded: (page) => {
        records.value = (page.records ?? []) as DutyReportVO[];
        total.value = page.total ?? 0;
      },
    });

    const loadList = (): void => {
      tableApi.query();
    };

    const handleChange = (page: number, size: number): void => {
      if (pageNumber.value === page && pageSize.value === size) {
        return;
      }
      pageNumber.value = page;
      pageSize.value = size;
      loadList();
    };

    const stepDotClass = (step: number): string => {
      if (step < wizardStep.value) {
        return styles.stepDone;
      }
      if (step === wizardStep.value) {
        return styles.stepActive;
      }
      return styles.stepTodo;
    };

    const stepLabelClass = (step: number): string => (step <= wizardStep.value ? styles.stepLabelActive : styles.stepLabelTodo);

    const goWizardStep = (step: number): void => {
      wizardStep.value = step;
    };

    const renderWizardStepContent = (): JSX.Element => {
      if (wizardStep.value === 1) {
        return (
          <div class={styles.wizardContent}>
            <h3>选择报告周期</h3>
            <div class={styles.periodControl}>
              <Space size={10}>
                {PERIOD_OPTIONS.map((item) => (
                  <button
                    type="button"
                    key={item.value}
                    class={[styles.wizardButton, form.periodType === item.value ? styles.wizardButtonPrimary : styles.wizardButtonDefault]}
                    onClick={() => changeReportPeriodType(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </Space>
              <div class={styles.periodValueControl}>
                <PeriodValuePicker periodType={form.periodType} value={form.periodValue} onUpdate:value={changeReportPeriodValue} />
              </div>
              <span class={styles.periodRangeText}>覆盖 {selectedPeriodRange.value.label}</span>
            </div>
            <div class={[styles.wizardActions, styles.wizardActionsEnd]}>
              <button type="button" class={[styles.wizardButton, styles.wizardButtonPrimary]} onClick={() => goWizardStep(2)}>
                下一步：选择报告类型
              </button>
            </div>
          </div>
        );
      }
      if (wizardStep.value === 2) {
        return (
          <div class={styles.wizardContent}>
            <h3>选择报告类型</h3>
            <div class={styles.typeNotice}>
              <strong>报告条款来源：责任清单模板</strong>
              <span>系统将引用当前生效的责任清单模板条款，按法规名称过滤生成报告条目。</span>
            </div>
            <p class={styles.wizardHint}>按法规名称过滤生成报告：</p>
            <div class={styles.typeGrid}>
              {reportTypes.value.length === 0 ? (
                <Empty description="暂无报告类型" />
              ) : (
                reportTypes.value.map((item) => (
                  <button
                    type="button"
                    key={item.lawNameCode || item.lawNameLabel}
                    class={[styles.typeCard, form.lawNameCode === item.lawNameCode ? styles.typeCardActive : ""]}
                    onClick={() => {
                      form.lawNameCode = item.lawNameCode || "";
                    }}
                  >
                    <strong>{formatText(item.lawNameLabel)}</strong>
                  </button>
                ))
              )}
            </div>
            <div class={styles.wizardActions}>
              <button type="button" class={[styles.wizardButton, styles.wizardButtonDefault]} onClick={() => goWizardStep(1)}>
                上一步
              </button>
              <button
                type="button"
                class={[styles.wizardButton, styles.wizardButtonPrimary]}
                disabled={!form.lawNameCode}
                onClick={() => goWizardStep(3)}
              >
                下一步：确认生成
              </button>
            </div>
          </div>
        );
      }
      return (
        <div class={styles.wizardContent}>
          <h3>确认生成</h3>
          <div class={styles.confirmBox}>
            <div class={styles.confirmRows}>
              <div class={styles.confirmRow}>
                <span>报告周期：</span>
                <strong>{selectedPeriodRange.value.label}</strong>
              </div>
              <div class={styles.confirmRow}>
                <span>报告类型：</span>
                <strong>{formatText(selectedReportType.value?.lawNameLabel)}</strong>
              </div>
              <div class={styles.confirmRow}>
                <span>对标法规：</span>
                <strong>{formatText(selectedReportType.value?.lawNameLabel)}</strong>
              </div>
            </div>
            <div class={styles.confirmHint}>系统将自动调取本周期内的全量履职记录，逐条对标法规条款核验。</div>
          </div>
          <div class={styles.wizardActions}>
            <button type="button" class={[styles.wizardButton, styles.wizardButtonDefault]} onClick={() => goWizardStep(2)}>
              上一步
            </button>
            <Button type="primary" loading={generating.value} onClick={() => void submitGenerate()}>
              确认生成报告
            </Button>
          </div>
        </div>
      );
    };

    const renderGenerateWizard = (): JSX.Element => (
      <div class={styles.wizard}>
        <div class={styles.stepBar}>
          <div class={styles.stepItem}>
            <span class={stepDotClass(1)}>1</span>
            <strong class={stepLabelClass(1)}>选择周期</strong>
          </div>
          <i />
          <div class={styles.stepItem}>
            <span class={stepDotClass(2)}>2</span>
            <strong class={stepLabelClass(2)}>选择类型</strong>
          </div>
          <i />
          <div class={styles.stepItem}>
            <span class={stepDotClass(3)}>3</span>
            <strong class={stepLabelClass(3)}>确认生成</strong>
          </div>
        </div>
        {renderWizardStepContent()}
      </div>
    );

    const renderPdfReport = (): JSX.Element | null => {
      const report = pdfDetail.value?.report;
      if (!report) {
        return null;
      }
      return (
        <div class={styles.pdfOutput} ref={pdfOutputRef}>
          <h1 class={styles.pdfTitle}>{formatText(report.reportName)}</h1>
          <div class={styles.pdfMeta}>
            <span>报告周期：{formatText(report.periodLabel)}</span>
            <span>法规名称：{formatText(report.lawNameLabel)}</span>
            <span>责任人：{formatText(report.responsibleUserName)}</span>
            <span>部门：{formatText(report.deptName)}</span>
            <span>生成方式：{methodLabel(report.generateMethod)}</span>
            <span>生成时间：{formatText(report.generatedTime)}</span>
            <span>
              完成/待完善：{report.completedCount ?? 0} / {report.incompleteCount ?? 0}
            </span>
          </div>
          <section class={styles.pdfSection}>
            <div class={styles.pdfSectionTitle}>法规条款对标明细</div>
            <table class={styles.pdfTable}>
              <thead>
                <tr>
                  <th>条款编号</th>
                  <th>法规名称</th>
                  <th>对标内容</th>
                  <th>状态</th>
                  <th>证据/缺口</th>
                </tr>
              </thead>
              <tbody>
                {(pdfDetail.value?.mappings ?? []).map((mapping) => (
                  <tr key={mapping.id ?? `${mapping.clauseNo}-${mapping.taskDescription}`}>
                    <td>{formatText(mapping.clauseNo)}</td>
                    <td>{formatText(mapping.lawNameLabel)}</td>
                    <td>{formatText(mapping.taskDescription)}</td>
                    <td>{mapping.mappingStatus === "COMPLETED" ? "已完成" : "待完善"}</td>
                    <td>
                      {mapping.mappingStatus === "COMPLETED" ? `证据 ${mapping.evidenceCount ?? 0} 条` : formatText(mapping.gapDescription)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <div class={styles.pdfFooter}>
            <span>本报告由安全履职系统基于责任清单履职记录自动生成。</span>
            <span>导出时间：{formatText(Date.now())}</span>
          </div>
        </div>
      );
    };

    const layoutSlots = {
      "layout-header": (): null => null,
      "layout-content": (): JSX.Element => (
        <>
          {renderGenerateWizard()}
          <div class={styles.historyHeader}>
            <div class={styles.sectionTitle}>生成历史</div>
            <span>系统自动生成：月末/季末/年末 次日00:00</span>
          </div>
          <QueryForm />
          <div class="tableWrap">
            <DutyTable />
          </div>
        </>
      ),
      "footer-page": (): JSX.Element => (
        <Page
          current={pageNumber.value}
          pageSize={pageSize.value}
          total={total.value}
          onPageChange={handleChange}
          onShowSizeChange={handleChange}
        />
      ),
    };

    return (): JSX.Element => (
      <>
        <PageLayout title={pageTitle} v-slots={layoutSlots} />
        <Drawer open={detailOpen.value} title="报告详情" width={920} onUpdate:open={(v: boolean) => (detailOpen.value = v)}>
          {detail.value?.report ? (
            <>
              <div class={styles.detailActions}>
                <Button
                  type="primary"
                  loading={exportingReportId.value === detail.value?.report?.id}
                  onClick={() => void downloadReportPdf()}
                >
                  下载 PDF
                </Button>
              </div>
              <div class={styles.summary}>
                <div class={styles.summaryItem}>报告：{formatText(detail.value.report.reportName)}</div>
                <div class={styles.summaryItem}>生成方式：{methodLabel(detail.value.report.generateMethod)}</div>
                <div class={styles.summaryItem}>责任人：{formatText(detail.value.report.responsibleUserName)}</div>
              </div>
              <div class={styles.mappingList}>
                {(detail.value.mappings ?? []).map((mapping) => (
                  <div class={styles.mappingItem} key={mapping.id}>
                    <div class={styles.mappingTitle}>
                      <strong>
                        {mapping.clauseNo} {mapping.lawNameLabel}
                      </strong>
                      <Tag color={mapping.mappingStatus === "COMPLETED" ? "green" : "orange"}>
                        {mapping.mappingStatus === "COMPLETED" ? "已完成" : "待完善"}
                      </Tag>
                    </div>
                    <div>{formatText(mapping.taskDescription)}</div>
                    <div class={styles.mappingMeta}>
                      证据 {mapping.evidenceCount ?? 0} 条；{formatText(mapping.gapDescription)}
                    </div>
                    <Button type="link" size="small" onClick={() => void openMappingDetail(mapping)}>
                      证据追溯
                    </Button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty description="暂无数据" />
          )}
        </Drawer>
        <Drawer open={mappingOpen.value} title="对标详情" width={720} onUpdate:open={(v: boolean) => (mappingOpen.value = v)}>
          {mappingDetail.value?.mapping ? (
            <>
              <div class={styles.mappingItem}>
                <div class={styles.mappingTitle}>
                  <strong>
                    {mappingDetail.value.mapping.clauseNo} {mappingDetail.value.mapping.lawNameLabel}
                  </strong>
                  <Tag color={mappingDetail.value.mapping.mappingStatus === "COMPLETED" ? "green" : "orange"}>
                    {mappingDetail.value.mapping.mappingStatus === "COMPLETED" ? "已完成" : "待完善"}
                  </Tag>
                </div>
                <div>{formatText(mappingDetail.value.mapping.taskDescription)}</div>
                {gapDetail.value?.gapDescription ? <div class={styles.gapBox}>{gapDetail.value.gapDescription}</div> : null}
              </div>
              <div class={styles.sectionTitle}>证据追溯</div>
              {(mappingDetail.value.evidences ?? []).length === 0 ? (
                <Empty description="暂无证据" />
              ) : (
                (mappingDetail.value.evidences ?? []).map((evidence) => (
                  <div class={styles.evidenceItem} key={evidence.id}>
                    <div class={styles.mappingTitle}>
                      <strong>{formatText(evidence.title)}</strong>
                      <Tag>{sourceLabel(evidence.sourceType)}</Tag>
                    </div>
                    <div>{formatText(evidence.summary)}</div>
                    <div class={styles.mappingMeta}>
                      {formatText(evidence.rawData?.sourceApplicationName)} · {formatText(evidence.occurredTime)}
                    </div>
                    <div class={styles.mappingMeta}>
                      来源业务：{formatText(evidence.rawData?.sourceBusinessTypeName)} · {formatText(evidence.rawData?.sourceBusinessId)}
                    </div>
                  </div>
                ))
              )}
            </>
          ) : (
            <Empty description="暂无对标详情" />
          )}
        </Drawer>
        {pdfDetail.value ? renderPdfReport() : null}
      </>
    );
  },
});
