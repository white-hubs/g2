import type { DictionaryClient } from "@g2-client/dictionary/client";
import type { FileClient } from "@g2-client/file/client";
import type { OuaaClient } from "@g2-contract/ouaa";
import type { PageResult, SafetyManagementClient } from "@g2-contract/safety-management";
import type { MapConfig } from "@g2-platform/pc-map";
import {
  AntDatePicker,
  AntRangePicker,
  Button,
  Checkbox,
  type Dayjs,
  Form,
  FormItem,
  Image,
  Input,
  InputNumber,
  Modal,
  Page,
  PageLayout,
  PopOver,
  Popconfirm,
  RadioGroup,
  Select,
  Spin,
  Switch,
  TabPane,
  Table,
  Tabs,
  Tag,
  Tree,
  TreeSelect,
  Upload,
  downloadPDF,
  type UploadRequestOption,
  message,
} from "@g2-platform/pc-ui";
import { loadRuntimeCommon } from "@g2-runtime/common-loader";
import { defineAsyncRuntimeCommonComponent } from "@g2-runtime/common-loader/vue";
import { type Component, type PropType, computed, defineComponent, nextTick, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import type { JSX } from "vue/jsx-runtime";

import {
  type RecordRow,
  alarmHandlerResults,
  alarmLevels,
  alarmStatuses,
  alarmTimeoutStatuses,
  asRecord,
  asRows,
  currentTenantCode,
  flattenTree,
  formatDate,
  num,
  text,
  toPeriod,
} from "./helpers";
import { loadLuckysheet } from "./luckysheet";
import { getReportTemplate } from "./report-templates";

import styles from "./style.module.css";

type MapPickerModalComponent = (typeof import("@g2-platform/pc-map"))["MapPickerModal"];
const MapPickerModal = defineAsyncRuntimeCommonComponent<MapPickerModalComponent>(loadRuntimeCommon, "pcMap", "index", "MapPickerModal");

export interface SafetyPageProps {
  getClient: () => Promise<SafetyManagementClient>;
  getFileClient?: () => Promise<FileClient>;
  getDictionaryClient?: () => Promise<DictionaryClient>;
  getOuaaClient?: () => Promise<OuaaClient>;
  applicationCode: string;
  basePath: string;
  market?: boolean;
  title?: string;
}

const pageProps = {
  getClient: { type: Function as PropType<() => Promise<SafetyManagementClient>>, required: true },
  getFileClient: { type: Function as PropType<() => Promise<FileClient>>, default: undefined },
  getDictionaryClient: { type: Function as PropType<() => Promise<DictionaryClient>>, default: undefined },
  getOuaaClient: { type: Function as PropType<() => Promise<OuaaClient>>, default: undefined },
  applicationCode: { type: String, default: "" },
  basePath: { type: String, default: "" },
  market: { type: Boolean, default: false },
  title: { type: String, default: "" },
};

type PageLoader = (client: SafetyManagementClient, params: Record<string, unknown>, props: SafetyPageProps) => Promise<PageResult>;
interface PageActions {
  navigate: (entry: string, query?: Record<string, string>) => void;
  reload: () => Promise<void>;
  params: () => Record<string, unknown>;
  openMarketReportModal?: (type: "all" | "windUp" | "nonWindUp", record: RecordRow) => void;
}
type ColumnFactory = (props: SafetyPageProps, actions: PageActions) => RecordRow[];
type DateRange = [string, string] | [Dayjs, Dayjs];
type BatchExport = (records: RecordRow[], props: SafetyPageProps) => Promise<void>;

function openMonthlyReport(props: SafetyPageProps, query: Record<string, string>): void {
  const path = `${props.basePath}/excel-viewer?${new URLSearchParams(query).toString()}`;
  window.open(path, "_blank", "noopener,noreferrer");
}

type RuntimePageProps = Omit<SafetyPageProps, "getClient"> & { getClient?: () => Promise<SafetyManagementClient> };

function safetyProps(props: RuntimePageProps): SafetyPageProps {
  if (!props.getClient) {
    throw new Error("安全管理客户端未就绪");
  }
  return { ...props, getClient: props.getClient };
}

function getClient(props: RuntimePageProps): Promise<SafetyManagementClient> {
  return safetyProps(props).getClient();
}

function getFileClient(props: RuntimePageProps): Promise<FileClient> {
  const client = safetyProps(props).getFileClient;
  if (!client) {
    throw new Error("文件客户端未就绪");
  }
  return client();
}

function getDictionaryClient(props: RuntimePageProps): Promise<DictionaryClient> {
  const client = safetyProps(props).getDictionaryClient;
  if (!client) {
    throw new Error("字典客户端未就绪");
  }
  return client();
}

function parseMapConfig(value: unknown): MapConfig | null {
  const variable = text(asRecord(value).variable, "");
  if (!variable.trim()) return null;
  try {
    const config = JSON.parse(variable) as MapConfig;
    return config && typeof config === "object" ? config : null;
  } catch {
    return null;
  }
}

async function resolveSafetyMapConfig(props: RuntimePageProps): Promise<MapConfig> {
  const dictionary = await getDictionaryClient(props);
  for (const code of ["TD_MAP", "gdMap"]) {
    try {
      const rows = asRows(await dictionary.getDictionaryByItem({ itemCode: "THIRD_SERVICE", code }));
      const config = parseMapConfig(rows.find((item) => text(item.variable, "").trim()));
      if (config?.webKey?.trim()) return { ...config, mapType: code as MapConfig["mapType"] };
    } catch {
      // Try the next provider, then fall back to the Leaflet tile map.
    }
  }
  return { mapType: "gdMap" };
}

function fileRecord(value: unknown): RecordRow {
  let current = value;
  for (let depth = 0; depth < 4; depth += 1) {
    if (current === null || typeof current !== "object" || Array.isArray(current) || !("data" in current)) {
      break;
    }
    current = (current as { data: unknown }).data;
  }
  return asRecord(current);
}

async function downloadReportFiles(records: RecordRow[], props: SafetyPageProps, archiveName: string): Promise<void> {
  const JSZipModule = await import("jszip");
  const zip = new JSZipModule.default();
  const fileClient = await getFileClient(props);
  let added = 0;
  for (const [index, record] of records.entries()) {
    const fileId = text(record.fileId ?? record.attachmentId ?? "", "");
    if (!fileId) {
      continue;
    }
    const file = fileRecord(await fileClient.getFileInfo(fileId));
    const path = text(file.path ?? file.url ?? "", "");
    if (!path) {
      continue;
    }
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`附件下载失败（${response.status}）`);
    }
    const name = text(record.name ?? record.title, `报告${index + 1}`);
    const extension = text(file.type ?? file.extension, "xlsx").replace(/^\./, "");
    zip.file(`${name}.${extension}`, await response.blob());
    added += 1;
  }
  if (!added) {
    throw new Error("所选报告没有可导出的附件");
  }
  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const link = document.createElement("a");
  link.href = url;
  link.download = archiveName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function parseReportRows(value: unknown): unknown[][] {
  let parsed = value;
  try {
    if (typeof parsed === "string") {
      parsed = JSON.parse(parsed);
    }
  } catch {
    return [];
  }
  if (Array.isArray(parsed)) {
    return parsed.filter(Array.isArray) as unknown[][];
  }
  const record = asRecord(parsed);
  const rows = record.data ?? asRecord(record.data).data ?? record.rows;
  return Array.isArray(rows) ? (rows.filter(Array.isArray) as unknown[][]) : [];
}

function worksheetName(value: unknown, index: number): string {
  const name = text(value, `市场${index + 1}`)
    .replace(/[\\/*?:[\]]/gu, "")
    .trim();
  return (name || `市场${index + 1}`).slice(0, 31);
}

function parseSpreadsheetSheet(value: unknown): RecordRow | null {
  let parsed = value;
  try {
    if (typeof parsed === "string") {
      parsed = JSON.parse(parsed);
    }
  } catch {
    return null;
  }
  const record = asRecord(parsed);
  return Array.isArray(record.data) || Array.isArray(record.celldata) ? record : null;
}

function createReportSheet(value: unknown, name: string, monthDate: unknown, kind: "market" | "summary", title = name): RecordRow {
  const source = parseSpreadsheetSheet(value) ?? getReportTemplate(kind, monthDate);
  const data = Array.isArray(source.data) ? ([...source.data] as unknown[][]) : undefined;
  if (data?.[0]?.[0] && typeof data[0][0] === "object") {
    data[0] = [...data[0]];
    data[0][0] = { ...asRecord(data[0][0]), v: title, m: title };
  }
  return {
    ...source,
    ...(data ? { data } : {}),
    name,
    scrollLeft: 0,
    scrollTop: 0,
    luckysheet_select_save: [],
  };
}

function summaryRows(title: string, report: RecordRow, marketReports: RecordRow[]): unknown[][] {
  const statistics = asRecord(report.reportStatistics);
  return [
    [title],
    ["汇总市场数", text(statistics.marketCount ?? report.marketCount, String(marketReports.length))],
    ["已上报市场", text(statistics.windUpCount ?? report.reportedMarketNum ?? report.windUpNum, String(marketReports.length))],
    ["未上报市场", text(statistics.nonWindUpCount ?? report.unreportedMarketNum ?? report.nonWindUpNum, "0")],
  ];
}

async function downloadHeadMonthlyReports(records: RecordRow[], props: SafetyPageProps): Promise<void> {
  const zip = new (await import("jszip")).default();
  const usedNames = new Set<string>();
  let added = 0;
  for (const [index, report] of records.entries()) {
    const reportId = String(report.id ?? "");
    if (!reportId) {
      continue;
    }
    const marketReports = await (await getClient(props)).listReportedMarketReportsByHeadReport(reportId);
    if (marketReports.length === 0) {
      continue;
    }
    const statistics = asRecord(report.reportStatistics);
    const sheets: { name: string; rows: unknown[][] }[] = [
      {
        name: "汇总",
        rows: [
          [text(report.title ?? report.name, `安全月报${index + 1}`)],
          ["汇总市场数", text(statistics.marketCount ?? report.marketCount, "0")],
          ["已上报市场", text(statistics.windUpCount ?? report.reportedMarketNum ?? report.windUpNum, "0")],
          ["未上报市场", text(statistics.nonWindUpCount ?? report.unreportedMarketNum ?? report.nonWindUpNum, "0")],
        ],
      },
    ];
    for (const [marketIndex, market] of marketReports.entries()) {
      const rows = parseReportRows(asRecord(market).reportData);
      let name = worksheetName(asRecord(market).marketName ?? asRecord(market).title, marketIndex);
      const originalName = name;
      let suffix = 2;
      while (usedNames.has(name) || name === "汇总") {
        name = `${originalName.slice(0, 28)}-${suffix++}`;
      }
      usedNames.add(name);
      sheets.push({ name, rows });
    }
    const title = text(report.title ?? report.name, `安全月报${index + 1}`);
    zip.file(`${title}.xlsx`, await createXlsxWorkbook(sheets));
    added += 1;
  }
  if (!added) {
    throw new Error("所选月报没有可导出的已上报市场数据");
  }
  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const link = document.createElement("a");
  link.href = url;
  link.download = "月报链接.zip";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function xmlEscape(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function createXlsxWorkbook(sheets: { name: string; rows: unknown[][] }[]): Promise<Blob> {
  const zip = new (await import("jszip")).default();
  const sheetEntries = sheets.map((sheet, index) => ({ ...sheet, index: index + 1 }));
  const workbookSheets = sheetEntries
    .map((sheet) => `<sheet name="${xmlEscape(sheet.name)}" sheetId="${sheet.index}" r:id="rId${sheet.index}"/>`)
    .join("");
  const relationships = sheetEntries
    .map(
      (sheet) =>
        `<Relationship Id="rId${sheet.index}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${sheet.index}.xml"/>`,
    )
    .join("");
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheetEntries.map((sheet) => `<Override PartName="/xl/worksheets/sheet${sheet.index}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
  );
  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`,
  );
  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships}</Relationships>`,
  );
  for (const sheet of sheetEntries) {
    const rows = sheet.rows
      .map((row, rowIndex) => {
        const cells = row
          .map((cell, cellIndex) => {
            const value = asRecord(cell).m ?? asRecord(cell).v ?? cell ?? "";
            return `<c r="${String.fromCodePoint(65 + (cellIndex % 26))}${rowIndex + 1}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
          })
          .join("");
        return `<row r="${rowIndex + 1}">${cells}</row>`;
      })
      .join("");
    zip.file(
      `xl/worksheets/sheet${sheet.index}.xml`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`,
    );
  }
  return zip.generateAsync({ type: "blob" });
}

const serialColumn: RecordRow = {
  title: "序号",
  width: 72,
  fixed: "left",
  customRender: ({ index }: { index: number }) => index + 1,
};

function dataColumn(
  title: string,
  dataIndex: string,
  width?: number,
  formatter?: (value: unknown, record: RecordRow) => string | JSX.Element,
): RecordRow {
  return {
    title,
    dataIndex,
    width,
    ellipsis: true,
    customRender: ({ text: value, record }: { text: unknown; record: RecordRow }) => formatter?.(value, record) ?? text(value),
  };
}

function statusTag(value: unknown): JSX.Element {
  const valueText = text(value);
  const color: "success" | "error" | "warning" | "processing" =
    valueText.includes("已处理") || valueText.includes("正常") || valueText.includes("已上报")
      ? "success"
      : valueText.includes("超时") || valueText.includes("待接收") || valueText.includes("未上报")
        ? "error"
        : valueText.includes("处理中") || valueText.includes("挂起")
          ? "warning"
          : "processing";
  return <Tag color={color}>{valueText}</Tag>;
}

function pageResult(result?: PageResult): PageResult {
  return result ?? { records: [], total: 0, pageNumber: 1, pageSize: 10 };
}

function createPagedPage(options: {
  title: string;
  placeholder?: string;
  keywordFilter?: boolean;
  dateFilter?: boolean;
  reportFilters?: boolean;
  load: PageLoader;
  columns: ColumnFactory;
  batchExport?: BatchExport;
  reportStatisticsModal?: boolean;
  header?: (context: {
    load: () => Promise<void>;
    loading: { value: boolean };
    batchLoading: { value: boolean };
    selectedRows: { value: RecordRow[] };
    batchExport: () => Promise<void>;
    props: SafetyPageProps;
    params: () => Record<string, unknown>;
  }) => JSX.Element | null;
}): Component {
  return defineComponent({
    name: `SafetyManagement${options.title.replaceAll(/[^\p{L}\p{N}]/gu, "") || "List"}Page`,
    props: pageProps,
    setup(props) {
      const router = useRouter();
      const rows = ref<RecordRow[]>([]);
      const loading = ref(false);
      const batchLoading = ref(false);
      const selectedRows = ref<RecordRow[]>([]);
      const selectedRowKeys = ref<string[]>([]);
      const marketReportRows = ref<RecordRow[]>([]);
      const marketReportModal = reactive({ open: false, loading: false, title: "" });
      const reportFilters = reactive({ marketTenant: "", alarmTypeCode: "" });
      const marketOptions = ref<RecordRow[]>([]);
      const alarmTypeOptions = ref<RecordRow[]>([]);
      const dates = ref<DateRange>();
      const state = reactive({ keyword: "", pageNumber: 1, pageSize: 10, total: 0 });
      const load = async (): Promise<void> => {
        loading.value = true;
        try {
          const client = await getClient(props);
          const result = pageResult(
            await options.load(
              client,
              {
                pageNumber: state.pageNumber,
                pageSize: state.pageSize,
                keyword: state.keyword,
                period: toPeriod(dates.value ?? []),
                ...(options.reportFilters ? { marketTenant: reportFilters.marketTenant, alarmTypeCode: reportFilters.alarmTypeCode } : {}),
              },
              safetyProps(props),
            ),
          );
          rows.value = result.records;
          state.total = result.total;
        } catch (error) {
          rows.value = [];
          state.total = 0;
          message.error(error instanceof Error ? error.message : `${options.title}加载失败`);
        } finally {
          loading.value = false;
        }
      };
      const reset = (): void => {
        state.keyword = "";
        reportFilters.marketTenant = "";
        reportFilters.alarmTypeCode = "";
        dates.value = undefined;
        state.pageNumber = 1;
        void load();
      };
      const params = (): Record<string, unknown> => ({
        pageNumber: state.pageNumber,
        pageSize: state.pageSize,
        keyword: state.keyword,
        period: toPeriod(dates.value ?? []),
        ...(options.reportFilters ? { marketTenant: reportFilters.marketTenant, alarmTypeCode: reportFilters.alarmTypeCode } : {}),
      });
      const actions: PageActions = {
        navigate: (entry, query = {}) => void router.push({ path: `${props.basePath}/${entry}`, query }),
        reload: load,
        params,
      };
      const openMarketReportModal = async (type: "all" | "windUp" | "nonWindUp", record: RecordRow): Promise<void> => {
        const id = String(record.id ?? "");
        if (!id) {
          message.warning("当前月报缺少 id");
          return;
        }
        marketReportModal.open = true;
        marketReportModal.loading = true;
        marketReportModal.title = type === "all" ? "汇总市场列表" : type === "windUp" ? "已上报市场列表" : "未上报市场列表";
        marketReportRows.value = [];
        try {
          const client = await getClient(props);
          const result =
            type === "all"
              ? await client.listAllMarketReportsByHeadReport(id)
              : type === "windUp"
                ? await client.listReportedMarketReportsByHeadReport(id)
                : await client.listUnreportedMarketReportsByHeadReport(id);
          marketReportRows.value = result.map(asRecord);
        } catch (error) {
          message.error(error instanceof Error ? error.message : "市场列表加载失败");
        } finally {
          marketReportModal.loading = false;
        }
      };
      if (options.reportStatisticsModal) {
        actions.openMarketReportModal = (type, record) => void openMarketReportModal(type, record);
      }
      const rowSelection = computed(() =>
        options.batchExport
          ? {
              selectedRowKeys: selectedRowKeys.value,
              onChange: (keys: (string | number)[], records: RecordRow[]) => {
                selectedRowKeys.value = keys.map(String);
                selectedRows.value = records;
              },
            }
          : undefined,
      );
      const runBatchExport = async (): Promise<void> => {
        if (!options.batchExport) {
          return;
        }
        if (selectedRows.value.length === 0) {
          message.warning("请选择需要导出的内容");
          return;
        }
        batchLoading.value = true;
        try {
          await options.batchExport(selectedRows.value, safetyProps(props));
          message.success("批量导出成功");
        } catch (error) {
          message.error(error instanceof Error ? error.message : "批量导出失败");
        } finally {
          batchLoading.value = false;
        }
      };
      onMounted(() => {
        if (options.reportFilters) {
          void Promise.all([
            getClient(props).then((client) => client.listMarkets()),
            getClient(props).then((client) => client.listAlarmTypeOptions()),
          ])
            .then(([markets, alarmTypes]) => {
              marketOptions.value = markets.map((item) => {
                const record = asRecord(item);
                return {
                  label: text(record.marketName ?? record.name ?? record.tenantName),
                  value: text(record.marketTenant ?? record.tenantCode ?? record.id, ""),
                };
              });
              alarmTypeOptions.value = alarmTypes.map((item) => {
                const record = asRecord(item);
                return { label: text(record.alarmTypeName ?? record.name), value: text(record.alarmTypeCode ?? record.code, "") };
              });
            })
            .catch(() => {
              marketOptions.value = [];
              alarmTypeOptions.value = [];
            });
        }
        void load();
      });
      return () => (
        <PageLayout
          title={props.title || options.title}
          v-slots={{
            "layout-header": () =>
              options.header?.({
                load,
                loading,
                batchLoading,
                selectedRows,
                batchExport: runBatchExport,
                props: safetyProps(props),
                params,
              }) ?? null,
            "layout-content": () => (
              <div class={styles.content}>
                <Form layout="inline" class={styles.toolbar}>
                  {options.keywordFilter !== false ? (
                    <FormItem>
                      <Input
                        value={state.keyword}
                        allowClear
                        placeholder={options.placeholder ?? "请输入关键字"}
                        onUpdate:value={(value: string) => (state.keyword = value)}
                        onPressEnter={() => {
                          state.pageNumber = 1;
                          void load();
                        }}
                      />
                    </FormItem>
                  ) : null}
                  {options.reportFilters ? (
                    <>
                      <FormItem label="市场">
                        <Select
                          value={reportFilters.marketTenant || undefined}
                          allowClear
                          placeholder="请选择市场"
                          options={marketOptions.value}
                          style={{ minWidth: "180px" }}
                          onUpdate:value={(value: unknown) => (reportFilters.marketTenant = text(value, ""))}
                        />
                      </FormItem>
                      <FormItem label="报警分类">
                        <Select
                          value={reportFilters.alarmTypeCode || undefined}
                          allowClear
                          placeholder="请选择报警分类"
                          options={alarmTypeOptions.value}
                          style={{ minWidth: "180px" }}
                          onUpdate:value={(value: unknown) => (reportFilters.alarmTypeCode = text(value, ""))}
                        />
                      </FormItem>
                    </>
                  ) : null}
                  {options.dateFilter ? (
                    <FormItem>
                      <AntRangePicker value={dates.value} onUpdate:value={(value: DateRange | undefined) => (dates.value = value)} />
                    </FormItem>
                  ) : null}
                  <FormItem>
                    <Button
                      type="primary"
                      onClick={() => {
                        state.pageNumber = 1;
                        void load();
                      }}
                    >
                      查询
                    </Button>
                    <Button onClick={reset}>重置</Button>
                  </FormItem>
                </Form>
                <div class={styles.tableWrap}>
                  <Table
                    rowKey={(record: RecordRow) => String(record.id ?? record.requestId ?? record.code ?? JSON.stringify(record))}
                    columns={options.columns(safetyProps(props), actions)}
                    dataSource={rows.value}
                    loading={loading.value}
                    pagination={false}
                    rowSelection={rowSelection.value}
                    scroll={{ x: 1200 }}
                  />
                </div>
                {options.reportStatisticsModal ? (
                  <Modal
                    title={marketReportModal.title}
                    width={900}
                    open={marketReportModal.open}
                    onOk={() => (marketReportModal.open = false)}
                    onCancel={() => (marketReportModal.open = false)}
                    onUpdate:open={(value: boolean) => (marketReportModal.open = value)}
                  >
                    <Table
                      size="small"
                      pagination={false}
                      loading={marketReportModal.loading}
                      rowKey={(record: RecordRow) => String(record.id ?? record.marketTenant ?? JSON.stringify(record))}
                      dataSource={marketReportRows.value}
                      columns={[
                        serialColumn,
                        dataColumn("公司名称", "marketName", 360, (value) => <PopOver content={text(value)}>{text(value)}</PopOver>),
                        dataColumn("上报人", "reportUserName", 180, (value) => <PopOver content={text(value)}>{text(value)}</PopOver>),
                        dataColumn("上报时间", "reportTime", 180, (value) => formatDate(value)),
                      ]}
                    />
                  </Modal>
                ) : null}
              </div>
            ),
            "footer-page": () => (
              <Page
                current={state.pageNumber}
                pageSize={state.pageSize}
                total={state.total}
                onPageChange={(pageNumber: number, pageSize: number) => {
                  state.pageNumber = pageNumber;
                  state.pageSize = pageSize;
                  void load();
                }}
              />
            ),
          }}
        />
      );
    },
  });
}

export const HeadMonthlyReportPage = createPagedPage({
  title: "安全月报",
  placeholder: "请输入月报标题",
  reportStatisticsModal: true,
  load: (client, params) => client.listHeadMonthlyReports(params),
  columns: (props, actions) => [
    serialColumn,
    dataColumn("标题", "title", 360, (value, record) => (
      <PopOver content={text(value ?? record.name)}>{text(value ?? record.name)}</PopOver>
    )),
    dataColumn("状态", "status", 120, (value, record) => {
      const status = text(record.statusName ?? value, "NOT_STARTED");
      return status === "NOT_STARTED" ? "未完成" : status === "FINISHED" ? "已完成填报" : status;
    }),
    {
      title: "汇总市场数",
      width: 130,
      customRender: ({ record }: { record: RecordRow }) => {
        const statistics = asRecord(record.reportStatistics);
        return (
          <Button type="link" size="small" onClick={() => actions.openMarketReportModal?.("all", record)}>
            {text(statistics.marketCount ?? record.marketCount, "0")}
          </Button>
        );
      },
    },
    {
      title: "已上报市场",
      width: 130,
      customRender: ({ record }: { record: RecordRow }) => {
        const statistics = asRecord(record.reportStatistics);
        return (
          <Button type="link" size="small" onClick={() => actions.openMarketReportModal?.("windUp", record)}>
            {text(statistics.windUpCount ?? record.reportedMarketNum ?? record.windUpNum, "0")}
          </Button>
        );
      },
    },
    {
      title: "未上报市场",
      width: 130,
      customRender: ({ record }: { record: RecordRow }) => {
        const statistics = asRecord(record.reportStatistics);
        return (
          <Button type="link" size="small" onClick={() => actions.openMarketReportModal?.("nonWindUp", record)}>
            {text(statistics.nonWindUpCount ?? record.unreportedMarketNum ?? record.nonWindUpNum, "0")}
          </Button>
        );
      },
    },
    {
      title: "操作",
      width: 140,
      fixed: "right",
      customRender: ({ record }: { record: RecordRow }) => {
        const id = String(record.id ?? "");
        return (
          <span>
            <Button
              type="link"
              size="small"
              disabled={!id}
              onClick={() =>
                openMonthlyReport(props, {
                  type: "head",
                  id,
                  title: text(record.title ?? record.name, "安全月报"),
                  monthDate: text(record.monthDate, ""),
                })
              }
            >
              查看
            </Button>
            <Button
              type="link"
              size="small"
              disabled={!id}
              onClick={() =>
                openMonthlyReport(props, {
                  type: "head",
                  id,
                  title: text(record.title ?? record.name, "安全月报"),
                  monthDate: text(record.monthDate, ""),
                  download: "true",
                })
              }
            >
              导出
            </Button>
          </span>
        );
      },
    },
  ],
  header: ({ batchLoading, batchExport }) => (
    <Button type="link" size="small" loading={batchLoading.value} onClick={() => void batchExport()}>
      批量导出
    </Button>
  ),
  batchExport: downloadHeadMonthlyReports,
});

export const MarketMonthlyReportPage = createPagedPage({
  title: "安全月报",
  placeholder: "请输入月报标题",
  load: (client, params) => client.listMarketMonthlyReports({ ...params, marketTenant: currentTenantCode() }),
  columns: (props, actions) => [
    serialColumn,
    dataColumn("标题", "title", 360, (value, record) => text(value ?? record.name)),
    dataColumn("状态", "statusName", 130, (value, record) => text(value ?? record.statusName ?? record.status)),
    dataColumn("上报时间", "reportTime", 180, (value) => formatDate(value)),
    {
      title: "操作",
      width: 270,
      fixed: "right",
      customRender: ({ record }: { record: RecordRow }) => {
        const id = String(record.id ?? "");
        const title = text(record.title ?? record.name, "安全月报");
        return (
          <span>
            <Button
              type="link"
              size="small"
              disabled={!id}
              onClick={() => openMonthlyReport(props, { type: "market", id, title, readonly: "true", from: "market" })}
            >
              查看
            </Button>
            <Button
              type="link"
              size="small"
              disabled={!id}
              onClick={() => openMonthlyReport(props, { type: "market", id, title, from: "market" })}
            >
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              disabled={!id || record.reportExpired === true}
              onClick={async () => {
                try {
                  await (await getClient(props)).escalateMarketMonthlyReport(id);
                  message.success("上报成功");
                  await actions.reload();
                } catch (error) {
                  message.error(error instanceof Error ? error.message : "上报失败");
                }
              }}
            >
              上报
            </Button>
            <Button
              type="link"
              size="small"
              disabled={!id}
              onClick={() => openMonthlyReport(props, { type: "market", id, title, download: "true", from: "market" })}
            >
              导出
            </Button>
          </span>
        );
      },
    },
  ],
});

export const SecurityMonthlyReportPage = createPagedPage({
  title: "安全报告",
  placeholder: "请输入报告标题",
  load: (client, params) => client.listSecurityReports(params),
  columns: (_props, actions) => [
    serialColumn,
    dataColumn("标题", "name", 420, (value, record) => text(value ?? record.title)),
    dataColumn("生成时间", "createTime", 190, (value) => formatDate(value)),
    {
      title: "操作",
      width: 160,
      fixed: "right",
      customRender: ({ record }: { record: RecordRow }) => {
        const id = String(record.id ?? record.fileId ?? "");
        const fileId = String(record.fileId ?? "");
        return (
          <span>
            <Button
              type="link"
              size="small"
              disabled={!id}
              onClick={() => actions.navigate("viewreport", { id, ...(fileId ? { fileId } : {}) })}
            >
              查看
            </Button>
            <Button
              type="link"
              size="small"
              disabled={!id}
              onClick={() => actions.navigate("viewreport", { id, ...(fileId ? { fileId } : {}), download: "true" })}
            >
              导出
            </Button>
          </span>
        );
      },
    },
  ],
  batchExport: (records, props) => downloadReportFiles(records, props, "安全报告.zip"),
  header: ({ batchLoading, batchExport }) => (
    <Button loading={batchLoading.value} type="primary" onClick={() => void batchExport()}>
      批量导出
    </Button>
  ),
});

export const SecurityAnalysisReportPage = createPagedPage({
  title: "报告记录",
  placeholder: "请输入报告标题",
  load: (client, params) => client.listMetricReports(params),
  columns: (_props, actions) => [
    serialColumn,
    dataColumn("标题", "name", 480, (value, record) => text(value ?? record.title)),
    dataColumn("生成时间", "createTime", 190, (value) => formatDate(value)),
    {
      title: "操作",
      width: 160,
      fixed: "right",
      customRender: ({ record }: { record: RecordRow }) => {
        const id = String(record.requestId ?? record.id ?? "");
        return (
          <span>
            <Button type="link" size="small" disabled={!id} onClick={() => actions.navigate("viewreport", { requestId: id })}>
              查看
            </Button>
            <Button
              type="link"
              size="small"
              disabled={!id}
              onClick={() => actions.navigate("viewreport", { requestId: id, download: "true" })}
            >
              导出
            </Button>
          </span>
        );
      },
    },
  ],
});

export const SafetyReportPage = createPagedPage({
  title: "安全报表",
  keywordFilter: false,
  dateFilter: true,
  reportFilters: true,
  load: (client, params) => client.listSafetyReport(params),
  columns: (_props, actions) => {
    const metric = (title: string, dataIndex: string, width: number): RecordRow =>
      dataColumn(title, dataIndex, width, (value, record) => {
        const params = actions.params();
        const alarmStatus =
          {
            未响应报警数: "ALARM_UN_CONFIRMED",
            处理中报警数: "ALARM_PROGRESS_CONFIRMED",
            已处理报警数: "ALARM_HANDLER",
            已挂起报警数: "ALARM_SUSPEND",
          }[title] ?? "";
        const alarmHandlerTimeoutStatus = title === "超时报警数" ? "TIMED_OUT" : "";
        const alarmHandlerResult = title === "真实报警数" ? "ALARM_ACTUAL" : title === "误报数" ? "ALARM_IMPRACTICAL" : "";
        const searchValue = {
          alarmStatus,
          alarmHandlerTimeoutStatus,
          alarmHandlerResult,
          applicationCode: text(params.alarmTypeCode, ""),
          alarmTypeCode: text(params.alarmTypeCode, ""),
          marketTenant: text(record.marketTenant, ""),
          period: params.period,
        };
        return (
          <Button
            type="link"
            size="small"
            onClick={() =>
              actions.navigate("alarm-record", {
                from: "report",
                searchValue: JSON.stringify(searchValue),
              })
            }
          >
            {text(value, "0")}
          </Button>
        );
      });
    return [
      dataColumn("市场名称", "marketName", 180),
      metric("报警总数", "totalNum", 110),
      metric("未响应报警数", "unConfirmedNum", 130),
      metric("处理中报警数", "progressConfirmedNum", 130),
      metric("已处理报警数", "handlerNum", 130),
      metric("已挂起报警数", "suspendNum", 120),
      metric("超时报警数", "timeoutNum", 120),
      metric("真实报警数", "actualNum", 110),
      metric("误报数", "impracticalNum", 100),
      dataColumn("报警正确率", "actualRatio", 120, (value) => `${text(value, "0")}%`),
      dataColumn("报警处理率", "handlerRatio", 120, (value) => `${text(value, "0")}%`),
      dataColumn("报警响应率", "confirmedRatio", 120, (value) => `${text(value, "0")}%`),
      dataColumn("报警超时率", "timeOutRatio", 120, (value, record) => `${text(value ?? record.timeoutRatio ?? record.timeoutRate, "0")}%`),
      dataColumn("处理平均耗时", "averageProcessing", 140, (value, record) =>
        text(value ?? record.averageHandleTime ?? record.avgHandleTime),
      ),
    ];
  },
  header: ({ props, params }) => (
    <Button
      type="primary"
      onClick={async () => {
        try {
          await (await getClient(props)).exportSafetyReport(params());
          message.success("导出任务已提交");
        } catch (error) {
          message.error(error instanceof Error ? error.message : "导出失败");
        }
      }}
    >
      导出
    </Button>
  ),
});

function alarmRecordColumns(props: SafetyPageProps, openDetail: (record: RecordRow) => void): RecordRow[] {
  return [
    serialColumn,
    dataColumn("报警事件", "alarmEventName", 180, (value, record) => text(value ?? record.alarmName ?? record.alarmTypeName)),
    ...(!props.market ? [dataColumn("报警市场", "marketName", 160)] : []),
    dataColumn("报警区域", "areaName", 180, (value, record) => text(value ?? record.areaPath ?? record.alarmAreaName)),
    dataColumn("详细位置", "alarmTargetAddress", 180, (value, record) => text(value ?? record.location ?? record.alarmLocation)),
    dataColumn("报警时间", "alarmTime", 180, (value, record) => formatDate(value ?? record.createTime)),
    dataColumn("报警级别", "alarmLevelName", 120, (value, record) => text(value ?? record.alarmLevel)),
    dataColumn("处理时限", "timeoutProcessTimesName", 160, (value, record) => text(value ?? record.handleDeadline ?? record.deadlineTime)),
    dataColumn("超时状态", "alarmHandlerTimeoutStatusName", 120, (value, record) =>
      statusTag(value ?? record.timeoutStatusName ?? record.timeoutStatus),
    ),
    dataColumn("处理状态", "alarmStatusName", 120, (value, record) =>
      statusTag(value ?? record.handleStatusName ?? record.handleStatus ?? record.statusName),
    ),
    dataColumn("处理结果", "alarmHandlerResultName", 120, (value, record) => text(value ?? record.handleResultName ?? record.handleResult)),
    dataColumn("预计处理时间", "estimateHandlerTime", 180, (value, record) =>
      formatDate(value ?? record.expectedHandleTime ?? record.estimatedHandleTime),
    ),
    dataColumn("处理人", "alarmHandlerName", 120, (value, record) => text(value ?? record.handlerName ?? record.handleUserName)),
    {
      title: "操作",
      key: "action",
      width: 100,
      fixed: "right",
      customRender: ({ record }: { record: RecordRow }) => {
        const id = String(record.id ?? record.alarmId ?? "");
        return (
          <Button type="link" size="small" disabled={!id} onClick={() => id && openDetail(record)}>
            详情
          </Button>
        );
      },
    },
  ];
}

function createAlarmRecordPage(market: boolean): Component {
  const title = "报警记录";
  return defineComponent({
    name: market ? "SafetyManagementMarketAlarmRecordPage" : "SafetyManagementHeadAlarmRecordPage",
    props: pageProps,
    setup(props) {
      const router = useRouter();
      const rows = ref<RecordRow[]>([]);
      const loading = ref(false);
      const dates = ref<DateRange>();
      const alarmTypeOptions = ref<RecordRow[]>([]);
      const alarmLevelOptions = ref<RecordRow[]>([]);
      const query = reactive({
        keyword: "",
        alarmStatus: "",
        alarmHandlerResult: "",
        alarmHandlerTimeoutStatus: "",
        alarmLevelId: "",
        alarmTypeId: "",
        alarmTypeCode: "",
        applicationCode: "",
        departmentId: "",
        userId: "",
        pageNumber: 1,
        pageSize: 10,
        total: 0,
      });
      const reportSource = ref("");
      const reportSearchValue = ref<Record<string, unknown>>({});
      const reportTitle = computed(() => {
        const prefix = { report: "安全报表", alarm: "报警", dept: "部门", user: "人员" }[reportSource.value] ?? "";
        return prefix ? `${prefix}统计-报警记录` : title;
      });
      const requestParams = (): Record<string, unknown> => {
        const period = toPeriod(dates.value ?? []);
        const filters: Record<string, unknown> = { ...query };
        delete filters.total;
        return {
          ...filters,
          applicationCode: query.applicationCode || props.applicationCode,
          period,
          "period.begin": period.split(",")[0] ?? "",
          "period.end": period.split(",")[1] ?? "",
        };
      };
      const hydrateSearchValue = (): void => {
        const current = router.currentRoute.value.query;
        reportSource.value = text(current.from, "");
        const raw = current.searchValue;
        if (typeof raw !== "string" || !raw) {
          return;
        }
        try {
          const value = JSON.parse(raw) as Record<string, unknown>;
          reportSearchValue.value = value;
          for (const key of [
            "keyword",
            "alarmStatus",
            "alarmHandlerResult",
            "alarmHandlerTimeoutStatus",
            "alarmLevelId",
            "alarmTypeId",
            "alarmTypeCode",
            "applicationCode",
            "departmentId",
            "userId",
          ] as const) {
            if (value[key] !== undefined && value[key] !== null) {
              query[key] = String(value[key]);
            }
          }
          const period = value.period;
          if (Array.isArray(period)) {
            dates.value = period.map(String).filter(Boolean).slice(0, 2) as DateRange;
          } else if (typeof period === "string") {
            dates.value = period.split(",").filter(Boolean).slice(0, 2) as DateRange;
          }
        } catch {
          reportSearchValue.value = {};
        }
      };
      const loadOptions = async (): Promise<void> => {
        try {
          const client = await getClient(props);
          const [types, levels] = await Promise.all([client.listAlarmTypeOptions(), client.listAlarmLevels()]);
          alarmTypeOptions.value = types.map((item) => {
            const record = asRecord(item);
            return {
              label: text(record.name ?? record.alarmTypeName),
              value: text(record.id ?? record.alarmTypeId ?? record.code ?? record.alarmTypeCode, ""),
            };
          });
          alarmLevelOptions.value = levels.map((item) => {
            const record = asRecord(item);
            return {
              label: text(record.name ?? record.alarmLevelName),
              value: text(record.id ?? record.code ?? record.alarmLevelCode, ""),
            };
          });
        } catch {
          alarmTypeOptions.value = [];
          alarmLevelOptions.value = [];
        }
      };
      const load = async (): Promise<void> => {
        loading.value = true;
        try {
          const client = await getClient(props);
          const result = pageResult(await (market ? client.listMarketAlarmRecords : client.listHeadAlarmRecords)(requestParams()));
          rows.value = result.records;
          query.total = result.total;
        } catch (error) {
          rows.value = [];
          query.total = 0;
          message.error(error instanceof Error ? error.message : "报警记录加载失败");
        } finally {
          loading.value = false;
        }
      };
      const reset = (): void => {
        query.keyword = "";
        query.alarmStatus = "";
        query.alarmHandlerResult = "";
        query.alarmHandlerTimeoutStatus = "";
        query.alarmLevelId = "";
        query.alarmTypeId = "";
        query.alarmTypeCode = "";
        query.applicationCode = "";
        query.departmentId = "";
        query.userId = "";
        query.pageNumber = 1;
        dates.value = undefined;
        void load();
      };
      const exportRows = async (): Promise<void> => {
        try {
          const client = await getClient(props);
          await client.exportAlarmRecords(requestParams());
          message.success("导出任务已提交");
        } catch (error) {
          message.error(error instanceof Error ? error.message : "导出失败");
        }
      };
      onMounted(() => {
        hydrateSearchValue();
        void loadOptions();
        void load();
      });
      return () => (
        <PageLayout
          title={props.title || reportTitle.value}
          v-slots={{
            "layout-header": () =>
              reportSource.value ? (
                <Button type="primary" onClick={() => void exportRows()}>
                  导出
                </Button>
              ) : null,
            "layout-content": () => (
              <div class={styles.content}>
                {!reportSource.value ? (
                  <Form layout="inline" class={styles.toolbar}>
                    <FormItem label="报警分类">
                      <Select
                        value={query.alarmTypeId || query.alarmTypeCode || undefined}
                        allowClear
                        placeholder="请选择报警分类"
                        options={alarmTypeOptions.value}
                        style={{ width: "150px" }}
                        onUpdate:value={(value: unknown) => {
                          query.alarmTypeId = value === undefined || value === null ? "" : String(value);
                        }}
                      />
                    </FormItem>
                    <FormItem label="处理状态">
                      <Select
                        value={query.alarmStatus || undefined}
                        allowClear
                        placeholder="请选择处理状态"
                        options={alarmStatuses}
                        style={{ width: "150px" }}
                        onUpdate:value={(value: unknown) => {
                          query.alarmStatus = value === undefined || value === null ? "" : String(value);
                        }}
                      />
                    </FormItem>
                    <FormItem label="报警级别">
                      <Select
                        value={query.alarmLevelId || undefined}
                        allowClear
                        placeholder="请选择报警级别"
                        options={
                          alarmLevelOptions.value.length > 0
                            ? alarmLevelOptions.value
                            : alarmLevels.map((item) => ({ label: item.label, value: item.code }))
                        }
                        style={{ width: "150px" }}
                        onUpdate:value={(value: unknown) => {
                          query.alarmLevelId = value === undefined || value === null ? "" : String(value);
                        }}
                      />
                    </FormItem>
                    <FormItem label="处理结果">
                      <Select
                        value={query.alarmHandlerResult || undefined}
                        allowClear
                        placeholder="请选择处理结果"
                        options={alarmHandlerResults}
                        style={{ width: "150px" }}
                        onUpdate:value={(value: unknown) => {
                          query.alarmHandlerResult = value === undefined || value === null ? "" : String(value);
                        }}
                      />
                    </FormItem>
                    <FormItem label="超时状态">
                      <Select
                        value={query.alarmHandlerTimeoutStatus || undefined}
                        allowClear
                        placeholder="请选择超时状态"
                        options={alarmTimeoutStatuses}
                        style={{ width: "150px" }}
                        onUpdate:value={(value: unknown) => {
                          query.alarmHandlerTimeoutStatus = value === undefined || value === null ? "" : String(value);
                        }}
                      />
                    </FormItem>
                    <FormItem label="报警时间">
                      <AntRangePicker value={dates.value} onUpdate:value={(value: DateRange | undefined) => (dates.value = value)} />
                    </FormItem>
                    <FormItem>
                      <Input
                        value={query.keyword}
                        allowClear
                        placeholder="请输入设备名称/报警规则"
                        onUpdate:value={(value: string) => (query.keyword = value)}
                        onPressEnter={() => {
                          query.pageNumber = 1;
                          void load();
                        }}
                      />
                    </FormItem>
                    <FormItem>
                      <Button
                        type="primary"
                        onClick={() => {
                          query.pageNumber = 1;
                          void load();
                        }}
                      >
                        查询
                      </Button>
                      <Button onClick={reset}>重置</Button>
                    </FormItem>
                  </Form>
                ) : null}
                <div class={styles.tableWrap}>
                  <Table
                    rowKey={(record: RecordRow) => String(record.id ?? record.alarmId ?? JSON.stringify(record))}
                    columns={alarmRecordColumns(safetyProps(props), (record) => {
                      const id = String(record.id ?? record.alarmId ?? "");
                      if (id) {
                        void router.push({
                          path: `${props.basePath}/alarm-detail`,
                          query: {
                            id,
                            businessKey: text(record.businessKey ?? record.eventId ?? id, id),
                            marketName: text(record.marketName, ""),
                            fromPage: market ? "market" : "head",
                            ...(reportSource.value
                              ? { from: reportSource.value, searchValue: JSON.stringify(reportSearchValue.value) }
                              : {}),
                          },
                        });
                      }
                    })}
                    dataSource={rows.value}
                    loading={loading.value}
                    pagination={false}
                    scroll={{ x: market ? 1960 : 2020 }}
                  />
                </div>
              </div>
            ),
            "footer-page": () => (
              <Page
                current={query.pageNumber}
                pageSize={query.pageSize}
                total={query.total}
                onPageChange={(pageNumber: number, pageSize: number) => {
                  query.pageNumber = pageNumber;
                  query.pageSize = pageSize;
                  void load();
                }}
              />
            ),
          }}
        />
      );
    },
  });
}

export const HeadAlarmRecordPage = createAlarmRecordPage(false);
export const MarketAlarmRecordPage = createAlarmRecordPage(true);

function detailFiles(value: unknown): RecordRow[] {
  return asRows(value);
}

function detailDuration(value: unknown): string {
  const seconds = num(value);
  if (seconds <= 0) {
    return "--";
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds / 60) % 60);
  const rest = Math.min(59, Math.ceil(seconds % 60));
  return `${hours > 0 ? `${String(hours).padStart(2, "0")}时` : ""}${String(minutes).padStart(2, "0")}分${String(rest).padStart(2, "0")}秒`;
}

export const AlarmDetailPage = defineComponent({
  name: "SafetyManagementAlarmDetailPage",
  props: pageProps,
  setup(props) {
    const router = useRouter();
    const detail = ref<RecordRow>({});
    const operatorLogs = ref<RecordRow[]>([]);
    const linkageActions = ref<RecordRow[]>([]);
    const linkageRecords = ref<RecordRow[]>([]);
    const videoFiles = ref<RecordRow[]>([]);
    const activeKey = ref("alarm-info");
    const loading = ref(false);
    const actionLoading = ref(false);
    const load = async (): Promise<void> => {
      const routeQuery = router.currentRoute.value.query;
      const id = String(routeQuery.id ?? "");
      if (!id) {
        return;
      }
      loading.value = true;
      try {
        const client = await getClient(props);
        detail.value = asRecord(await client.getAlarmDetail(id));
        const eventId = text(detail.value.businessKey ?? routeQuery.businessKey ?? id, id);
        const [logs, actions, records, files] = await Promise.allSettled([
          client.getAlarmOperatorRecords(id),
          client.getAlarmLinkageActions(eventId),
          client.getAlarmLinkageExecuteRecords(eventId),
          client.getAlarmVideoEventFiles(eventId),
        ]);
        operatorLogs.value = logs.status === "fulfilled" ? asRows(logs.value) : [];
        linkageActions.value = actions.status === "fulfilled" ? asRows(actions.value) : [];
        linkageRecords.value = records.status === "fulfilled" ? asRows(records.value) : [];
        videoFiles.value = files.status === "fulfilled" ? asRows(files.value) : [];
      } catch (error) {
        message.error(error instanceof Error ? error.message : "报警详情加载失败");
      } finally {
        loading.value = false;
      }
    };
    const field = (label: string, value: unknown) => (
      <div class={styles.alarmDetailItem}>
        <span class={styles.alarmDetailLabel}>{label}：</span>
        <span title={typeof value === "string" ? value : undefined}>{text(value)}</span>
      </div>
    );
    const executeLinkage = async (record: RecordRow): Promise<void> => {
      const eventIotDeviceId = text(record.id ?? record.eventIotDeviceId, "");
      if (!eventIotDeviceId) {
        return;
      }
      actionLoading.value = true;
      try {
        const client = await getClient(props);
        await client.executeAlarmLinkage({ eventIotDeviceId });
        message.success("下发指令成功");
        const eventId = text(detail.value.businessKey ?? router.currentRoute.value.query.businessKey, "");
        linkageRecords.value = eventId ? asRows(await client.getAlarmLinkageExecuteRecords(eventId)) : [];
      } catch (error) {
        message.error(error instanceof Error ? error.message : "下发指令失败");
      } finally {
        actionLoading.value = false;
      }
    };
    const eventValue = (record: RecordRow): string => text(record.translatedValue ?? record.propValue);
    const statusValue = (record: RecordRow): string => text(record.executeStatusName ?? record.executeStatus);
    const imageFiles = (value: unknown) => {
      const files = detailFiles(value);
      if (files.length === 0) {
        return <span>--</span>;
      }
      return (
        <div class={styles.alarmDetailMedia}>
          {files.map((file, index) => (
            <Image key={String(file.id ?? index)} width={80} src={mediaUrl(file)} />
          ))}
        </div>
      );
    };
    const alarmInfoFields = computed(() => {
      const market = [
        ["报警事件", detail.value.alarmEventName],
        ["报警市场", detail.value.marketName ?? router.currentRoute.value.query.marketName],
        ["报警区域", detail.value.areaName],
        ["报警级别", detail.value.alarmLevelName],
        ["处理时限", detail.value.timeoutProcessTimesName],
        ["报警时间", formatDate(detail.value.alarmTime)],
        ["处理人", detail.value.alarmHandlerName],
        ["处理状态", detail.value.alarmStatusName],
        ["超时状态", detail.value.alarmHandlerTimeoutStatusName],
      ] as [string, unknown][];
      const head = [
        ["报警事件", detail.value.alarmEventName],
        ["报警市场", detail.value.marketName ?? router.currentRoute.value.query.marketName],
        ["报警时间", formatDate(detail.value.alarmTime)],
        ["报警级别", detail.value.alarmLevelName],
        ["报警区域", detail.value.areaName],
        ["处理时限", detail.value.timeoutProcessTimesName],
        ["处理人", detail.value.alarmHandlerName],
        ["报警通知人", detail.value.alarmNotifyUsername],
        ["超时状态", detail.value.alarmHandlerTimeoutStatusName],
        ["处理状态", detail.value.alarmStatusName],
        ["详细位置", detail.value.alarmTargetAddress],
        ["任务耗时", detailDuration(detail.value.processingTime)],
      ] as [string, unknown][];
      return props.market ? market : head;
    });
    const handler = computed(() => asRecord(detail.value.handler));
    const suspend = computed(() => asRecord(detail.value.suspend));
    const captureFiles = computed(() => videoFiles.value.filter((item) => String(item.type ?? "").toUpperCase() === "PHOTOGRAPH"));
    const videoRecords = computed(() => videoFiles.value.filter((item) => String(item.type ?? "").toUpperCase() === "VIDEOTAPE"));
    const mediaUrl = (record: RecordRow): string => text(record.extranetFilePath ?? record.path ?? record.url, "");
    onMounted(() => void load());
    return () => (
      <PageLayout
        title={props.title || "报警详情"}
        v-slots={{
          "layout-content": () => (
            <div class={styles.content} style={{ padding: "20px" }}>
              <Spin spinning={loading.value}>
                <Tabs activeKey={activeKey.value} onChange={(key: string | number) => (activeKey.value = String(key))}>
                  <TabPane key="alarm-info" tab="报警详情">
                    <section class={styles.alarmDetailSection}>
                      <h3>报警信息</h3>
                      <div class={styles.alarmDetailGrid}>{alarmInfoFields.value.map(([label, value]) => field(label, value))}</div>
                    </section>
                    <section class={styles.alarmDetailSection}>
                      <h3>现场抓拍</h3>
                      {captureFiles.value.length > 0 ? (
                        <div class={styles.alarmDetailMedia}>
                          {captureFiles.value.map((file, index) => (
                            <Image key={String(file.id ?? index)} width={160} src={mediaUrl(file)} />
                          ))}
                        </div>
                      ) : (
                        <div class={styles.alarmDetailEmpty}>暂无抓拍</div>
                      )}
                      <h3>现场录像</h3>
                      {videoRecords.value.length > 0 ? (
                        <div class={styles.alarmDetailMedia}>
                          {videoRecords.value.map((file, index) => (
                            <video key={String(file.id ?? index)} controls style={{ width: "320px", height: "180px" }}>
                              <source src={mediaUrl(file)} type="video/mp4" />
                            </video>
                          ))}
                        </div>
                      ) : (
                        <div class={styles.alarmDetailEmpty}>暂无录像</div>
                      )}
                    </section>
                    {detail.value.alarmStatus !== "ALARM_SUSPEND" ? (
                      <section class={styles.alarmDetailSection}>
                        <h3>处理结果</h3>
                        <div class={styles.alarmDetailGrid}>
                          {field("处理结果", handler.value.alarmHandlerResultName)}
                          {field("处理时间", formatDate(handler.value.createTime))}
                          <div class={styles.alarmDetailItem}>
                            <span class={styles.alarmDetailLabel}>现场图片：</span>
                            {imageFiles(handler.value.fileVOS)}
                          </div>
                          {field("处理说明", handler.value.alarmHandlerResultRemark)}
                          {field("操作挂起人员", handler.value.createUserName)}
                        </div>
                      </section>
                    ) : null}
                    {detail.value.alarmStatus === "ALARM_SUSPEND" ? (
                      <section class={styles.alarmDetailSection}>
                        <h3>报警挂起</h3>
                        <div class={styles.alarmDetailGrid}>
                          {field("预计处理时间", formatDate(suspend.value.estimatedProcessTime))}
                          {field("挂起原因", suspend.value.remark)}
                          <div class={styles.alarmDetailItem}>
                            <span class={styles.alarmDetailLabel}>现场图片：</span>
                            {imageFiles(suspend.value.fileVOS)}
                          </div>
                          {field("处理时间", formatDate(suspend.value.createTime))}
                          {field("操作挂起人员", suspend.value.createUserName)}
                        </div>
                      </section>
                    ) : null}
                  </TabPane>
                  <TabPane key="linkage-action" tab="联动动作">
                    <section class={styles.alarmDetailSection}>
                      <h3>设备联动</h3>
                      <Table
                        size="small"
                        bordered
                        pagination={false}
                        rowKey={(record: RecordRow) => String(record.id ?? JSON.stringify(record))}
                        dataSource={linkageActions.value}
                        columns={[
                          { title: "设备名称", dataIndex: "deviceName" },
                          { title: "设备属性", dataIndex: "propName" },
                          { title: "执行动作", customRender: ({ record }: { record: RecordRow }) => eventValue(record) },
                          {
                            title: "执行时机",
                            dataIndex: "executeMode",
                            customRender: ({ text: value }: { text: unknown }) => (String(value) === "AUTOMATIC" ? "自动" : "手动"),
                          },
                          {
                            title: "操作",
                            customRender: ({ record }: { record: RecordRow }) =>
                              String(record.executeMode) === "AUTOMATIC" ? (
                                "--"
                              ) : (
                                <Button type="link" loading={actionLoading.value} onClick={() => void executeLinkage(record)}>
                                  执行
                                </Button>
                              ),
                          },
                        ]}
                      />
                      <h3>联动日志</h3>
                      <Table
                        size="small"
                        bordered
                        pagination={false}
                        rowKey={(record: RecordRow) => String(record.id ?? JSON.stringify(record))}
                        dataSource={linkageRecords.value}
                        columns={[
                          { title: "执行时间", customRender: ({ record }: { record: RecordRow }) => formatDate(record.executeTime) },
                          { title: "触发人", customRender: ({ record }: { record: RecordRow }) => text(record.operatorName) },
                          { title: "设备名称", dataIndex: "deviceName" },
                          { title: "设备属性", dataIndex: "propName" },
                          { title: "执行动作", customRender: ({ record }: { record: RecordRow }) => eventValue(record) },
                          { title: "执行结果", customRender: ({ record }: { record: RecordRow }) => statusValue(record) },
                        ]}
                      />
                    </section>
                  </TabPane>
                  <TabPane key="handle-log" tab="处理记录">
                    <section class={styles.alarmDetailSection}>
                      <h3>处理流程记录</h3>
                      <Table
                        size="small"
                        bordered
                        pagination={false}
                        rowKey={(record: RecordRow) => String(record.id ?? JSON.stringify(record))}
                        dataSource={operatorLogs.value}
                        columns={[
                          {
                            title: "时间",
                            customRender: ({ record }: { record: RecordRow }) =>
                              formatDate(record.operatorTime ?? record.operateTime ?? record.createTime),
                          },
                          {
                            title: "操作人",
                            customRender: ({ record }: { record: RecordRow }) => text(record.operatorByName ?? record.operatorName),
                          },
                          {
                            title: "处理内容",
                            customRender: ({ record }: { record: RecordRow }) =>
                              text(record.operatorContent ?? record.operateTypeName ?? record.content),
                          },
                        ]}
                      />
                    </section>
                  </TabPane>
                </Tabs>
              </Spin>
            </div>
          ),
          "footer-btn": () => <Button onClick={() => void router.back()}>返回</Button>,
        }}
      />
    );
  },
});

export const AlarmConfigPage = defineComponent({
  name: "SafetyManagementAlarmConfigPage",
  props: pageProps,
  setup(props) {
    const rows = ref<RecordRow[]>([]);
    const loading = ref(false);
    const visible = ref(false);
    const saving = ref(false);
    const current = ref<RecordRow>({});
    const activeLevels = ref<RecordRow[]>([]);
    const keyword = ref("");
    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const result = pageResult(await (await getClient(props)).listAlarmTypes({ keyword: keyword.value, pageNumber: 1, pageSize: 100 }));
        rows.value = result.records;
      } catch (error) {
        rows.value = [];
        message.error(error instanceof Error ? error.message : "报警配置加载失败");
      } finally {
        loading.value = false;
      }
    };
    const openConfig = async (record: RecordRow): Promise<void> => {
      const code = String(record.alarmTypeCode ?? record.code ?? "");
      if (!code) {
        message.warning("当前报警分类缺少编码");
        return;
      }
      current.value = record;
      visible.value = true;
      saving.value = true;
      try {
        activeLevels.value = asRows(await (await getClient(props)).listAlarmConfig(code));
      } catch (error) {
        activeLevels.value = [];
        message.error(error instanceof Error ? error.message : "推送配置加载失败");
      } finally {
        saving.value = false;
      }
    };
    const levelRecord = (levelCode: string): RecordRow | undefined =>
      activeLevels.value.find((item) => String(item.alarmLevelCode ?? item.levelCode ?? item.code ?? "") === levelCode);
    const setEnabled = async (levelCode: string, enabled: boolean): Promise<void> => {
      const typeCode = String(current.value.alarmTypeCode ?? current.value.code ?? "");
      if (!typeCode) {
        return;
      }
      saving.value = true;
      try {
        const client = await getClient(props);
        if (enabled) {
          await client.updateAlarmConfig(typeCode, levelCode, Boolean(levelRecord(levelCode)?.timeout));
        } else {
          await client.deleteAlarmConfig(typeCode, levelCode);
        }
        activeLevels.value = asRows(await client.listAlarmConfig(typeCode));
        message.success("配置已保存");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "配置保存失败");
      } finally {
        saving.value = false;
      }
    };
    const setTimeout = async (levelCode: string, timeout: boolean): Promise<void> => {
      const typeCode = String(current.value.alarmTypeCode ?? current.value.code ?? "");
      if (!typeCode) {
        return;
      }
      saving.value = true;
      try {
        const client = await getClient(props);
        await client.updateAlarmConfig(typeCode, levelCode, timeout);
        activeLevels.value = asRows(await client.listAlarmConfig(typeCode));
        message.success("超时推送已更新");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "超时推送更新失败");
      } finally {
        saving.value = false;
      }
    };
    onMounted(() => void load());
    return () => (
      <PageLayout
        title={props.title || "报警配置"}
        v-slots={{
          "layout-content": () => (
            <div class={styles.content}>
              <Form layout="inline" class={styles.toolbar}>
                <FormItem>
                  <Input
                    value={keyword.value}
                    allowClear
                    placeholder="请输入报警分类"
                    onUpdate:value={(value: string) => (keyword.value = value)}
                  />
                </FormItem>
                <FormItem>
                  <Button type="primary" onClick={() => void load()}>
                    查询
                  </Button>
                  <Button
                    onClick={() => {
                      keyword.value = "";
                      void load();
                    }}
                  >
                    重置
                  </Button>
                </FormItem>
              </Form>
              <div class={styles.tableWrap}>
                <Table
                  rowKey={(record: RecordRow) => String(record.id ?? record.alarmTypeCode ?? record.code)}
                  loading={loading.value}
                  pagination={false}
                  dataSource={rows.value}
                  columns={[
                    serialColumn,
                    dataColumn("报警分类", "alarmTypeName", 300, (value, record) => text(value ?? record.name)),
                    dataColumn("说明", "remark", 560, (value, record) => text(value ?? record.description)),
                    {
                      title: "操作",
                      width: 150,
                      fixed: "right",
                      customRender: ({ record }: { record: RecordRow }) => (
                        <Button type="link" onClick={() => void openConfig(record)}>
                          推送配置
                        </Button>
                      ),
                    },
                  ]}
                />
              </div>
              {visible.value ? (
                <div class={styles.alarmConfigPopover}>
                  <div class={styles.alarmConfigTitle}>
                    {text(current.value.alarmTypeName ?? current.value.name, "报警")}推送配置
                    <Button type="link" size="small" onClick={() => (visible.value = false)}>
                      关闭
                    </Button>
                  </div>
                  <Spin spinning={saving.value}>
                    {alarmLevels.map((level) => {
                      const configured = levelRecord(level.code);
                      const enabled = Boolean(configured);
                      return (
                        <div key={level.code} class={styles.alarmConfigRow}>
                          <div>
                            <span>{level.label}</span>
                            <Switch checked={enabled} onUpdate:checked={(value: unknown) => void setEnabled(level.code, value === true)} />
                          </div>
                          <div>
                            <span>超时推送</span>
                            <Switch
                              disabled={!enabled}
                              checked={Boolean(configured?.timeout)}
                              onUpdate:checked={(value: unknown) => void setTimeout(level.code, value === true)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </Spin>
                </div>
              ) : null}
            </div>
          ),
        }}
      />
    );
  },
});

export const MonthlyLinkPage = defineComponent({
  name: "SafetyManagementMonthlyLinkPage",
  props: pageProps,
  setup(props) {
    const rows = ref<RecordRow[]>([]);
    const loading = ref(false);
    const query = reactive({ keyword: "", pageNumber: 1, pageSize: 10, total: 0 });
    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const result = pageResult(await (await getClient(props)).listMonthlyLinks(query));
        rows.value = result.records;
        query.total = result.total;
      } catch (error) {
        rows.value = [];
        query.total = 0;
        message.error(error instanceof Error ? error.message : "月报链接加载失败");
      } finally {
        loading.value = false;
      }
    };
    const copy = async (value: unknown): Promise<void> => {
      const url = text(value, "");
      if (!url) {
        return;
      }
      try {
        await navigator.clipboard.writeText(url);
        message.success("链接已复制");
      } catch {
        message.warning("当前浏览器不支持自动复制，请手动复制链接");
      }
    };
    const changeEnabled = async (record: RecordRow, enabled: boolean): Promise<void> => {
      const id = String(record.id ?? "");
      if (!id) {
        return;
      }
      loading.value = true;
      try {
        await (await getClient(props)).updateMonthlyLink(id, enabled);
        message.success("状态已更新");
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "状态更新失败");
      } finally {
        loading.value = false;
      }
    };
    onMounted(() => void load());
    return () => (
      <PageLayout
        title={props.title || "月报链接"}
        v-slots={{
          "layout-content": () => (
            <div class={styles.content}>
              <Form layout="inline" class={styles.toolbar}>
                <FormItem>
                  <Input
                    value={query.keyword}
                    allowClear
                    placeholder="请输入市场名称"
                    onUpdate:value={(value: string) => (query.keyword = value)}
                  />
                </FormItem>
                <FormItem>
                  <Button type="primary" onClick={() => void load()}>
                    查询
                  </Button>
                  <Button
                    onClick={() => {
                      query.keyword = "";
                      query.pageNumber = 1;
                      void load();
                    }}
                  >
                    重置
                  </Button>
                </FormItem>
              </Form>
              <div class={styles.tableWrap}>
                <Table
                  rowKey={(record: RecordRow) => String(record.id ?? record.marketId ?? JSON.stringify(record))}
                  loading={loading.value}
                  pagination={false}
                  scroll={{ x: 1040 }}
                  dataSource={rows.value}
                  columns={[
                    serialColumn,
                    dataColumn("市场名称", "marketName", 260),
                    {
                      title: "链接地址",
                      dataIndex: "url",
                      ellipsis: true,
                      customRender: ({ text: value }: { text: unknown }) => (
                        <Button type="link" onClick={() => void copy(value)}>
                          {text(value)}
                        </Button>
                      ),
                    },
                    {
                      title: "是否启用",
                      width: 130,
                      fixed: "right",
                      customRender: ({ record }: { record: RecordRow }) => (
                        <Switch
                          checked={record.enabled === true}
                          onUpdate:checked={(value: unknown) => void changeEnabled(record, value === true)}
                        />
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          ),
          "footer-page": () => (
            <Page
              current={query.pageNumber}
              pageSize={query.pageSize}
              total={query.total}
              onPageChange={(pageNumber: number, pageSize: number) => {
                query.pageNumber = pageNumber;
                query.pageSize = pageSize;
                void load();
              }}
            />
          ),
        }}
      />
    );
  },
});

function emptyMarketConfig(): RecordRow {
  return {
    id: "",
    marketName: "",
    marketCode: "",
    marketTenant: "",
    url: "",
    account: "",
    password: "",
    fileIds: "",
    files: [],
    coordinate: "",
    address: "",
    foundTime: "",
    marketArea: 0,
    status: true,
  };
}

const MARKET_STYLE_DICT_CODE = "MARKET_STYLE_CONFIG";
const MARKET_STYLE_FIELDS = [
  { key: "version", name: "市场版本", codeSuffix: "version" },
  { key: "projectId", name: "UE5项目ID", codeSuffix: "projectId" },
  { key: "height", name: "地图标签高度", codeSuffix: "height" },
] as const;

type MarketStyleKey = (typeof MARKET_STYLE_FIELDS)[number]["key"];

interface MarketStyleState {
  open: boolean;
  loading: boolean;
  saving: boolean;
  marketName: string;
  marketTenant: string;
  version: string;
  projectId: string;
  height: number | null;
  records: Partial<Record<MarketStyleKey, RecordRow>>;
}

function emptyMarketStyle(): MarketStyleState {
  return {
    open: false,
    loading: false,
    saving: false,
    marketName: "",
    marketTenant: "",
    version: "1.0",
    projectId: "",
    height: null,
    records: {},
  };
}

function marketStyleVariable(record: RecordRow | undefined): string {
  return record ? text(record.variable, "") : "";
}

function unwrapObject(value: unknown): RecordRow {
  let current = value;
  for (let depth = 0; depth < 4; depth += 1) {
    if (current === null || typeof current !== "object" || Array.isArray(current) || !("data" in current)) {
      break;
    }
    current = (current as { data: unknown }).data;
  }
  return asRecord(current);
}

function marketStyleRecord(tenant: string, field: (typeof MARKET_STYLE_FIELDS)[number]): RecordRow {
  return {
    id: "",
    name: field.name,
    code: `${tenant}_${field.codeSuffix}`,
    remarks: "",
    version: "",
    flag: false,
    variable: "",
    itemCode: MARKET_STYLE_DICT_CODE,
  };
}

export const MarketConfigPage = defineComponent({
  name: "SafetyManagementMarketConfigPage",
  props: pageProps,
  setup(props) {
    const rows = ref<RecordRow[]>([]);
    const loading = ref(false);
    const query = reactive({ keyword: "", pageNumber: 1, pageSize: 10, total: 0 });
    const form = reactive<RecordRow>(emptyMarketConfig());
    const modal = reactive({ open: false, mode: "create" as "create" | "edit" | "config", saving: false });
    const style = reactive<MarketStyleState>(emptyMarketStyle());
    const positionPickerOpen = ref(false);
    const modalTitle = computed(() => (modal.mode === "create" ? "新增市场" : modal.mode === "edit" ? "编辑市场" : "配置市场"));
    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const result = pageResult(await (await getClient(props)).listMarketConfigs(query));
        rows.value = result.records;
        query.total = result.total;
      } catch (error) {
        rows.value = [];
        query.total = 0;
        message.error(error instanceof Error ? error.message : "授权管理加载失败");
      } finally {
        loading.value = false;
      }
    };
    const openCreate = (): void => {
      Object.assign(form, emptyMarketConfig());
      modal.mode = "create";
      modal.open = true;
    };
    const openEdit = (record: RecordRow): void => {
      Object.assign(form, emptyMarketConfig(), record);
      const files = asRows(record.files);
      form.files = files;
      form.fileIds = text(record.fileIds ?? files[0]?.id, "");
      modal.mode = "edit";
      modal.open = true;
    };
    const openConfig = (record: RecordRow): void => {
      Object.assign(form, emptyMarketConfig(), record);
      modal.mode = "config";
      modal.open = true;
    };
    const openStyle = async (record: RecordRow): Promise<void> => {
      style.open = true;
      style.loading = true;
      style.marketName = text(record.marketName, "");
      style.marketTenant = text(record.marketTenant, "");
      style.version = "1.0";
      style.projectId = "";
      style.height = null;
      style.records = {};
      try {
        const dictionary = await getDictionaryClient(props);
        await dictionary.getOrCreateDictionaryItem({ code: MARKET_STYLE_DICT_CODE, remarks: "市场样式配置" });
        const dictionaryRows = asRows(await dictionary.getDictionaryByItem({ itemCode: MARKET_STYLE_DICT_CODE }));
        for (const field of MARKET_STYLE_FIELDS) {
          const config =
            dictionaryRows.find((item) => String(item.code ?? "") === `${style.marketTenant}_${field.codeSuffix}`) ??
            marketStyleRecord(style.marketTenant, field);
          style.records[field.key] = config;
          const variable = marketStyleVariable(config);
          if (field.key === "version") {
            style.version = variable || "1.0";
          }
          if (field.key === "projectId") {
            style.projectId = variable;
          }
          if (field.key === "height") {
            style.height = variable ? num(variable) : null;
          }
        }
      } catch (error) {
        message.error(error instanceof Error ? error.message : "获取市场样式配置失败");
      } finally {
        style.loading = false;
      }
    };
    const saveStyle = async (): Promise<void> => {
      if (style.version === "2.0" && !style.projectId.trim()) {
        message.warning("请输入UE5项目ID");
        return;
      }
      style.saving = true;
      try {
        const dictionary = await getDictionaryClient(props);
        for (const field of MARKET_STYLE_FIELDS) {
          const existing = style.records[field.key] ?? marketStyleRecord(style.marketTenant, field);
          const variable =
            field.key === "version"
              ? style.version
              : field.key === "projectId"
                ? style.projectId
                : style.height == null
                  ? ""
                  : String(style.height);
          const payload = { ...marketStyleRecord(style.marketTenant, field), ...existing, variable };
          if (text(existing.id, "")) {
            await dictionary.updateDataDictionary(payload);
          } else {
            await dictionary.createDataDictionary(payload);
          }
        }
        message.success("操作成功");
        style.open = false;
      } catch (error) {
        message.error(error instanceof Error ? error.message : "市场样式保存失败");
      } finally {
        style.saving = false;
      }
    };
    const openPosition = (): void => {
      positionPickerOpen.value = true;
    };
    const marketImageFileList = computed(() =>
      asRows(form.files).map((file) => ({
        uid: text(file.id, text(file.uid, "market-image")),
        name: text(file.name, "市场图片"),
        status: "done" as const,
        url: text(file.path ?? file.url, ""),
      })),
    );
    const uploadMarketImage = async (options: UploadRequestOption): Promise<void> => {
      try {
        const client = await getFileClient(props);
        const uploaded = unwrapObject(
          await client.uploadSceneFile({ file: options.file as File, businessKey: "maintain", sceneCode: "MARKET_CONFIG" }),
        );
        const id = text(uploaded.id ?? uploaded.ossId, "");
        if (!id) {
          throw new Error("文件服务未返回文件ID");
        }
        form.fileIds = id;
        form.files = [uploaded];
        options.onSuccess?.(uploaded);
      } catch (error) {
        options.onError?.(error instanceof Error ? error : new Error("市场图片上传失败"));
        message.error(error instanceof Error ? error.message : "市场图片上传失败");
      }
    };
    const save = async (): Promise<void> => {
      if (modal.mode !== "config") {
        if (!String(form.marketName ?? "").trim()) {
          return void message.warning("请输入市场名称");
        }
        if (!String(form.marketCode ?? "").trim()) {
          return void message.warning("请输入市场code");
        }
        if (!/\D/u.test(String(form.marketCode))) {
          return void message.warning("不能输入纯数字");
        }
        if (!String(form.marketTenant ?? "").trim()) {
          return void message.warning("请输入租户");
        }
        if (form.marketArea === undefined || form.marketArea === null || String(form.marketArea) === "") {
          return void message.warning("请输入市场面积");
        }
        if (!String(form.fileIds ?? "").trim()) {
          return void message.warning("请上传文件");
        }
        if (!String(form.coordinate ?? "").trim()) {
          return void message.warning("请输入市场经纬度");
        }
      } else if (!String(form.url ?? "").trim()) {
        return void message.warning("请输入url");
      } else if (!String(form.account ?? "").trim()) {
        return void message.warning("请输入appid");
      } else if (!String(form.password ?? "").trim()) {
        return void message.warning("请输入key");
      }
      modal.saving = true;
      try {
        const client = await getClient(props);
        if (modal.mode === "create") {
          await client.createMarketConfig({ ...form });
        } else {
          await client.updateMarketConfig({ ...form });
        }
        message.success("操作成功");
        modal.open = false;
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "保存失败");
      } finally {
        modal.saving = false;
      }
    };
    const remove = async (record: RecordRow): Promise<void> => {
      const id = String(record.id ?? "");
      if (!id) {
        return;
      }
      try {
        await (await getClient(props)).deleteMarketConfig(id);
        message.success("删除成功");
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "删除失败");
      }
    };
    onMounted(() => void load());
    return () => (
      <PageLayout
        title={props.title || "授权管理"}
        v-slots={{
          "layout-header": () => (
            <Button type="primary" onClick={openCreate}>
              新增
            </Button>
          ),
          "layout-content": () => (
            <div class={styles.content}>
              <Form layout="inline" class={styles.toolbar}>
                <FormItem>
                  <Input
                    value={query.keyword}
                    placeholder="请输入市场标题"
                    onUpdate:value={(value: string) => (query.keyword = value)}
                    onPressEnter={() => void load()}
                  />
                </FormItem>
                <FormItem>
                  <Button type="primary" onClick={() => void load()}>
                    查询
                  </Button>
                  <Button
                    onClick={() => {
                      query.keyword = "";
                      query.pageNumber = 1;
                      void load();
                    }}
                  >
                    重置
                  </Button>
                </FormItem>
              </Form>
              <div class={styles.tableWrap}>
                <Table
                  rowKey={(record: RecordRow) => String(record.id ?? record.marketCode ?? JSON.stringify(record))}
                  loading={loading.value}
                  dataSource={rows.value}
                  pagination={false}
                  scroll={{ x: 1040 }}
                  columns={[
                    serialColumn,
                    dataColumn("市场名称", "marketName", 320),
                    dataColumn("经纬度", "coordinate", 280),
                    {
                      title: "操作",
                      width: 300,
                      fixed: "right",
                      customRender: ({ record }: { record: RecordRow }) => (
                        <>
                          <Button type="link" size="small" onClick={() => openEdit(record)}>
                            编辑
                          </Button>
                          <Button type="link" size="small" onClick={() => openConfig(record)}>
                            配置
                          </Button>
                          <Button type="link" size="small" onClick={() => void openStyle(record)}>
                            样式设置
                          </Button>
                          <Popconfirm title="你确定删除当前市场?" okText="确定" cancelText="取消" onConfirm={() => void remove(record)}>
                            <Button type="link" size="small" danger>
                              删除
                            </Button>
                          </Popconfirm>
                        </>
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          ),
          "footer-page": () => (
            <Page
              current={query.pageNumber}
              pageSize={query.pageSize}
              total={query.total}
              onPageChange={(pageNumber: number, pageSize: number) => {
                query.pageNumber = pageNumber;
                query.pageSize = pageSize;
                void load();
              }}
            />
          ),
        }}
      >
        <Modal
          open={modal.open}
          title={modalTitle.value}
          width={800}
          class={styles.marketConfigModal}
          confirmLoading={modal.saving}
          onOk={() => void save()}
          onCancel={() => (modal.open = false)}
        >
          <Form class={styles.marketConfigForm} labelCol={{ style: { width: "100px" } }} wrapperCol={{ span: 20 }}>
            {modal.mode !== "config" ? (
              <>
                <FormItem label="市场名称:" name="marketName" required>
                  <Input
                    maxlength={20}
                    showCount
                    placeholder="请输入"
                    value={text(form.marketName, "")}
                    onUpdate:value={(value: string) => (form.marketName = value)}
                  />
                </FormItem>
                <FormItem label="市场code:" name="marketCode" required>
                  <Input
                    maxlength={20}
                    showCount
                    placeholder="请输入"
                    value={text(form.marketCode, "")}
                    onUpdate:value={(value: string) => (form.marketCode = value)}
                  />
                </FormItem>
                <FormItem label="租户编号:" name="marketTenant" required>
                  <InputNumber
                    max={999999999}
                    placeholder="请输入数字"
                    value={form.marketTenant === "" ? undefined : num(form.marketTenant)}
                    onUpdate:value={(value: unknown) => (form.marketTenant = value === null || value === undefined ? "" : String(value))}
                  />
                </FormItem>
                <FormItem label="是否开启:">
                  <Switch checked={form.status !== false} onUpdate:checked={(value: unknown) => (form.status = value === true)} />
                </FormItem>
                <FormItem label="市场面积:" name="marketArea" required>
                  <InputNumber
                    max={999999}
                    min={0}
                    value={num(form.marketArea)}
                    onUpdate:value={(value: unknown) => (form.marketArea = value === null ? "" : num(value))}
                  />
                </FormItem>
                <FormItem label="成立时间:">
                  <AntDatePicker
                    value={text(form.foundTime, "") || undefined}
                    valueFormat="YYYY-MM-DD"
                    onUpdate:value={(value: unknown) => (form.foundTime = text(value, ""))}
                  />
                </FormItem>
                <FormItem label="市场图片:" name="fileIds" required>
                  <Upload
                    accept=".jpeg,.jpg,.png"
                    customRequest={uploadMarketImage}
                    fileList={marketImageFileList.value}
                    listType="picture-card"
                    maxCount={1}
                    onRemove={() => {
                      form.fileIds = "";
                      form.files = [];
                      return true;
                    }}
                  >
                    <span style={{ fontSize: "24px", lineHeight: 1 }}>+</span>
                  </Upload>
                </FormItem>
                <FormItem label="获取经纬度:">
                  <Button onClick={openPosition}>获取经纬度</Button>
                </FormItem>
                <FormItem label="经纬度:" name="coordinate" required>
                  <Input disabled maxlength={100} placeholder="请输入" value={text(form.coordinate, "")} />
                </FormItem>
                <FormItem label="市场位置:">
                  <Input
                    maxlength={200}
                    showCount
                    placeholder="请输入市场位置"
                    value={text(form.address, "")}
                    onUpdate:value={(value: string) => (form.address = value)}
                  />
                </FormItem>
              </>
            ) : (
              <>
                <FormItem label="服务器地址:">
                  <Input value={text(form.url, "")} onUpdate:value={(value: string) => (form.url = value)} />
                </FormItem>
                <FormItem label="appid:">
                  <Input value={text(form.account, "")} onUpdate:value={(value: string) => (form.account = value)} />
                </FormItem>
                <FormItem label="key:">
                  <Input value={text(form.password, "")} onUpdate:value={(value: string) => (form.password = value)} />
                </FormItem>
              </>
            )}
          </Form>
        </Modal>
        <Modal
          open={style.open}
          title={`样式设置【${style.marketName}】`}
          confirmLoading={style.saving}
          onOk={() => void saveStyle()}
          onCancel={() => (style.open = false)}
        >
          <Spin spinning={style.loading}>
            <Form class={styles.marketStyleForm} labelCol={{ style: { width: "100px" } }}>
              <FormItem label="市场版本">
                <RadioGroup
                  value={style.version}
                  options={[
                    { label: "一期", value: "1.0" },
                    { label: "二期", value: "2.0" },
                  ]}
                  onUpdate:value={(value: unknown) => (style.version = text(value, "1.0"))}
                />
              </FormItem>
              {style.version === "2.0" ? (
                <FormItem label="UE5项目ID">
                  <Input
                    maxlength={100}
                    placeholder="UE5项目projectId"
                    value={style.projectId}
                    onUpdate:value={(value: string) => (style.projectId = value)}
                  />
                </FormItem>
              ) : null}
              <FormItem label="地图标签高度">
                <InputNumber
                  min={0}
                  max={1000}
                  placeholder="参考高度 25"
                  value={style.height ?? undefined}
                  onUpdate:value={(value: unknown) => (style.height = value === null || value === undefined ? null : num(value))}
                />
              </FormItem>
            </Form>
          </Spin>
        </Modal>
        <MapPickerModal
          open={positionPickerOpen.value}
          address={text(form.address, "")}
          center={(() => {
            const [lngText, latText] = text(form.coordinate, "").split(",");
            const lng = Number(lngText);
            const lat = Number(latText);
            return {
              lng: lngText?.trim() && Number.isFinite(lng) ? lng : 114.057939,
              lat: latText?.trim() && Number.isFinite(lat) ? lat : 22.543527,
            };
          })()}
          getMapConfig={() => resolveSafetyMapConfig(props)}
          onUpdate:open={(open: boolean) => (positionPickerOpen.value = open)}
          onConfirm={(value) => {
            form.coordinate = `${value.lng},${value.lat}`;
            form.address = value.address;
            positionPickerOpen.value = false;
          }}
        />
      </PageLayout>
    );
  },
});

interface NoticeConfigRow {
  alarmLevelCode: string;
  name: string;
  enabled: boolean;
  notification: number;
  noticeWays: string[];
  targets: NoticeTargetRow[];
}

const normalScene = "SAFETY_ALARM_NOTIFY";
const timeoutBusinessType = "SAFETY_ALARM_TIMEOUT_NOTIFY";
const timeoutScene = "SAFETY_ALARM_TIMEOUT_NOTIFY1";

function newNoticeRows(): NoticeConfigRow[] {
  return alarmLevels.map((level) => ({
    alarmLevelCode: level.code,
    name: level.label,
    enabled: true,
    notification: 1,
    noticeWays: [],
    targets: [{ name: "USER", value: [] }],
  }));
}

function noticeWays(record: RecordRow): string[] {
  return asRows(record.noticeWays)
    .map((item) => String(item.noticeWay ?? item.code ?? ""))
    .filter(Boolean);
}

type NoticeTargetType = "USER" | "ROLE" | "DEPARTMENT";
interface NoticeTarget {
  id: string;
  name: string;
  mobile: string | undefined;
  gender: string | undefined;
}
interface NoticeTargetRow {
  name: NoticeTargetType;
  value: NoticeTarget[];
}

const noticeTargetOptions = [
  { label: "人员", value: "USER" },
  { label: "角色", value: "ROLE" },
  { label: "部门", value: "DEPARTMENT" },
] as const;

function noticeTargetTypeLabel(type: NoticeTargetType): string {
  return noticeTargetOptions.find((item) => item.value === type)?.label ?? "人员";
}

function noticeTargetRows(value: unknown): NoticeTargetRow[] {
  if (!Array.isArray(value)) {
    return [{ name: "USER", value: [] }];
  }
  const rows = value
    .map((item): NoticeTargetRow | null => {
      const record = asRecord(item);
      let parsed = record;
      if (typeof record.objInfo === "string") {
        try {
          parsed = asRecord(JSON.parse(record.objInfo));
        } catch {
          parsed = record;
        }
      }
      const name = String(parsed.name ?? record.objType ?? "USER") as NoticeTargetType;
      if (!noticeTargetOptions.some((option) => option.value === name)) {
        return null;
      }
      const selected = Array.isArray(parsed.value) ? parsed.value : [];
      const fallbackIds = String(record.objId ?? "")
        .split(",")
        .filter(Boolean);
      const targets = selected
        .map((target, index) => {
          const targetRecord = asRecord(target);
          const id = String(
            targetRecord.id ?? targetRecord.userId ?? targetRecord.roleId ?? targetRecord.departmentId ?? fallbackIds[index] ?? "",
          );
          if (!id) {
            return null;
          }
          return {
            id,
            name: String(targetRecord.name ?? targetRecord.userName ?? targetRecord.roleName ?? targetRecord.departmentName ?? id),
            mobile: targetRecord.mobile == null ? undefined : String(targetRecord.mobile),
            gender: targetRecord.gender == null ? undefined : String(targetRecord.gender),
          };
        })
        .filter((target): target is NoticeTarget => Boolean(target));
      return { name, value: targets };
    })
    .filter((item): item is NoticeTargetRow => Boolean(item));
  return rows.length > 0 ? rows : [{ name: "USER", value: [] }];
}

function noticeTargetPayload(rows: NoticeTargetRow[]): Record<string, unknown>[] {
  return rows
    .filter((row) => row.value.length > 0)
    .map((row) => ({
      objId: row.value.map((target) => target.id).join(","),
      objType: row.name,
      objInfo: JSON.stringify(row),
    }));
}

function pickerRows(value: unknown, type: NoticeTargetType): NoticeTarget[] {
  return asRows(value)
    .map((item) => {
      const id = String(item.id ?? item.userId ?? item.roleId ?? item.organizationId ?? "");
      if (!id) {
        return null;
      }
      return {
        id,
        name: String(item.name ?? item.userName ?? item.realName ?? item.roleName ?? item.organizationName ?? id),
        mobile: item.mobile == null ? (item.phone == null ? undefined : String(item.phone)) : String(item.mobile),
        gender: item.gender == null ? (item.sex == null ? undefined : String(item.sex)) : String(item.gender),
      };
    })
    .filter((item): item is NoticeTarget => Boolean(item))
    .filter((item) => (type === "USER" ? true : item.name.length > 0));
}

const SafetyTargetPicker = defineComponent({
  name: "SafetyTargetPicker",
  props: {
    open: { type: Boolean, default: false },
    type: { type: String as PropType<NoticeTargetType>, default: "USER" },
    selected: { type: Array as PropType<NoticeTarget[]>, default: () => [] },
    getOuaaClient: { type: Function as PropType<() => Promise<OuaaClient>>, default: undefined },
  },
  emits: ["update:open", "confirm"],
  setup(props, { emit }) {
    const loading = ref(false);
    const keyword = ref("");
    const rows = ref<NoticeTarget[]>([]);
    const selectedMap = ref(new Map<string, NoticeTarget>());
    const query = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const selectedKeys = computed(() => Array.from(selectedMap.value.keys()));

    const load = async (): Promise<void> => {
      if (!props.getOuaaClient) {
        rows.value = [];
        query.total = 0;
        return;
      }
      loading.value = true;
      try {
        const client = await props.getOuaaClient();
        let result: unknown;
        if (props.type === "USER") {
          result = await client.listUsers({
            pageNumber: query.pageNumber,
            pageSize: query.pageSize,
            keyword: keyword.value || undefined,
            enabled: true,
          });
          const page = asRecord(result);
          rows.value = pickerRows(result, props.type);
          query.total = num(page.total ?? page.totalCount ?? rows.value.length);
        } else if (props.type === "ROLE") {
          result = await client.getRoles();
          const all = pickerRows(result, props.type).filter((item) => !keyword.value || item.name.includes(keyword.value));
          query.total = all.length;
          const start = (query.pageNumber - 1) * query.pageSize;
          rows.value = all.slice(start, start + query.pageSize);
        } else {
          result = await client.getOrganizations({ name: keyword.value || undefined, enabled: true });
          rows.value = pickerRows(result, props.type);
          query.total = rows.value.length;
        }
      } catch (error) {
        rows.value = [];
        query.total = 0;
        message.error(error instanceof Error ? error.message : "通知对象加载失败");
      } finally {
        loading.value = false;
      }
    };

    watch(
      () => [props.open, props.type, props.selected] as const,
      ([open, , selected]) => {
        if (!open) {
          return;
        }
        selectedMap.value = new Map(selected.map((item) => [item.id, item]));
        keyword.value = "";
        query.pageNumber = 1;
        void load();
      },
      { immediate: true },
    );

    const toggle = (record: NoticeTarget, checked: boolean): void => {
      const next = new Map(selectedMap.value);
      if (checked) {
        next.set(record.id, record);
      } else {
        next.delete(record.id);
      }
      selectedMap.value = next;
    };

    return () => (
      <Modal
        open={props.open}
        title={`${noticeTargetTypeLabel(props.type)} 列表`}
        width={800}
        onCancel={() => emit("update:open", false)}
        onOk={() => {
          emit("confirm", Array.from(selectedMap.value.values()));
          emit("update:open", false);
        }}
      >
        <Form layout="inline" style={{ marginBottom: "16px" }}>
          <FormItem label="名称">
            <Input
              value={keyword.value}
              maxlength={20}
              showCount
              placeholder={`请输入${noticeTargetTypeLabel(props.type)}名称`}
              onUpdate:value={(value: string) => (keyword.value = value)}
            />
          </FormItem>
          <FormItem class={styles.searchActions}>
            <Button type="primary" loading={loading.value} onClick={() => void load()}>
              查询
            </Button>
            <Button
              onClick={() => {
                keyword.value = "";
                query.pageNumber = 1;
                void load();
              }}
            >
              重置
            </Button>
          </FormItem>
        </Form>
        <Table
          rowKey="id"
          loading={loading.value}
          dataSource={rows.value}
          pagination={false}
          rowSelection={{
            selectedRowKeys: selectedKeys.value,
            preserveSelectedRowKeys: true,
            onSelect: (record: NoticeTarget, checked: boolean) => toggle(record, checked),
            onSelectAll: (checked: boolean, _keys: (string | number)[], records: NoticeTarget[]) => {
              for (const record of records) {
                toggle(record, checked);
              }
            },
          }}
          columns={
            props.type === "USER"
              ? [
                  { title: "人员名称", dataIndex: "name" },
                  {
                    title: "性别",
                    dataIndex: "gender",
                    customRender: ({ text: value }: { text?: string }) =>
                      value === "MALE" || value === "男" ? "男" : value === "FEMALE" || value === "女" ? "女" : "--",
                  },
                  { title: "联系电话", dataIndex: "mobile", customRender: ({ text: value }: { text?: string }) => value || "--" },
                ]
              : [{ title: `${noticeTargetTypeLabel(props.type)}名称`, dataIndex: "name" }]
          }
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
          <Page
            current={query.pageNumber}
            pageSize={query.pageSize}
            total={query.total}
            onPageChange={(pageNumber: number, pageSize: number) => {
              query.pageNumber = pageNumber;
              query.pageSize = pageSize;
              void load();
            }}
          />
        </div>
      </Modal>
    );
  },
});

export const AlarmPushPage = defineComponent({
  name: "SafetyManagementAlarmPushPage",
  props: pageProps,
  setup(props) {
    const activeKey = ref(normalScene);
    const configurations = ref<NoticeConfigRow[]>(newNoticeRows());
    const channelOptions = ref<RecordRow[]>([]);
    const loading = ref(false);
    const businessType = (): string => (activeKey.value === normalScene ? normalScene : timeoutBusinessType);
    const sceneCode = (): string => (activeKey.value === normalScene ? normalScene : timeoutScene);
    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const client = await getClient(props);
        const [saved, methods] = await Promise.all([client.getNoticeConfig(businessType()), client.getNoticeChannels(sceneCode())]);
        channelOptions.value = methods.map((item) => asRecord(item));
        const savedByLevel = new Map(asRows(saved).map((item) => [String(item.alarmLevelCode ?? item.levelCode ?? ""), item]));
        configurations.value = newNoticeRows().map((base) => {
          const savedItem = savedByLevel.get(base.alarmLevelCode);
          if (!savedItem) {
            return base;
          }
          return {
            ...base,
            enabled: savedItem.enabled !== false,
            notification: Math.max(1, num(savedItem.value ?? savedItem.notification ?? 1)),
            noticeWays: noticeWays(savedItem),
            targets: noticeTargetRows(savedItem.noticeObjs),
          };
        });
      } catch (error) {
        configurations.value = newNoticeRows();
        channelOptions.value = [];
        message.error(error instanceof Error ? error.message : "报警推送配置加载失败");
      } finally {
        loading.value = false;
      }
    };
    const updateMethod = (config: NoticeConfigRow, method: string, checked: boolean): void => {
      config.noticeWays = checked ? [...new Set([...config.noticeWays, method])] : config.noticeWays.filter((item) => item !== method);
    };
    const picker = ref<{ level: string; index: number; type: NoticeTargetType } | null>(null);
    const openPicker = (config: NoticeConfigRow, index: number): void => {
      picker.value = { level: config.alarmLevelCode, index, type: config.targets[index]?.name ?? "USER" };
    };
    const confirmPicker = (picked: NoticeTarget[]): void => {
      if (!picker.value) {
        return;
      }
      const config = configurations.value.find((item) => item.alarmLevelCode === picker.value?.level);
      if (!config || !config.targets[picker.value.index]) {
        return;
      }
      config.targets[picker.value.index].value = picked;
      picker.value = null;
    };
    const changeTargetType = (config: NoticeConfigRow, index: number, value: unknown): void => {
      const type = String(value ?? "USER") as NoticeTargetType;
      if (!noticeTargetOptions.some((option) => option.value === type)) {
        return;
      }
      config.targets[index] = { name: type, value: [] };
    };
    const addTarget = (config: NoticeConfigRow): void => {
      config.targets.push({ name: "USER", value: [] });
    };
    const removeTarget = (config: NoticeConfigRow, index: number): void => {
      if (config.targets.length <= 1) {
        return;
      }
      config.targets.splice(index, 1);
    };
    const save = async (): Promise<void> => {
      const invalid = configurations.value.find(
        (item) => item.enabled && (item.noticeWays.length === 0 || noticeTargetPayload(item.targets).length === 0),
      );
      if (invalid) {
        message.warning(`${invalid.name}请选择通知对象和通知方式`);
        return;
      }
      loading.value = true;
      try {
        await (
          await getClient(props)
        ).saveNoticeConfig({
          businessType: businessType(),
          sceneConfigDTOS: configurations.value.map((item) => ({
            alarmLevelCode: item.alarmLevelCode,
            enabled: item.enabled,
            sceneCode: sceneCode(),
            value: activeKey.value === normalScene ? "" : item.notification,
            noticeWays: item.noticeWays.map((noticeWay) => ({ noticeWay })),
            noticeObjs: noticeTargetPayload(item.targets),
          })),
        });
        message.success("报警推送配置已保存");
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "报警推送配置保存失败");
      } finally {
        loading.value = false;
      }
    };
    onMounted(() => void load());
    return () => (
      <PageLayout
        title={props.title || "报警推送"}
        v-slots={{
          "layout-content": () => (
            <div class={styles.content} style={{ padding: "20px" }}>
              <Tabs
                activeKey={activeKey.value}
                onChange={(key: string | number) => {
                  activeKey.value = String(key);
                  void load();
                }}
              >
                <TabPane key={normalScene} tab="报警通知" />
                <TabPane key={timeoutBusinessType} tab="报警超时通知" />
              </Tabs>
              <Spin spinning={loading.value}>
                <div class={styles.noticeCard}>
                  {configurations.value.map((config) => (
                    <div key={config.alarmLevelCode} class={styles.alarmPushLevel}>
                      <div class={styles.alarmPushHeader}>
                        <strong>{config.name}</strong>
                        <span>
                          启用通知
                          <Switch checked={config.enabled} onUpdate:checked={(value: unknown) => (config.enabled = value === true)} />
                        </span>
                      </div>
                      <div class={styles.alarmPushBody}>
                        <div>通知条件：{activeKey.value === normalScene ? "触发报警事件后通知" : "报警事件超时未处理"}</div>
                        {activeKey.value === timeoutBusinessType ? (
                          <div>
                            通知条件：<span>任务超时</span>
                            <InputNumber
                              min={0}
                              max={100}
                              disabled={!config.enabled}
                              value={config.notification}
                              onUpdate:value={(value: unknown) => (config.notification = Math.max(0, num(value)))}
                            />
                            <span>分钟还未处理</span>
                          </div>
                        ) : null}
                        <div>
                          通知方式：
                          {channelOptions.value.length > 0 ? (
                            channelOptions.value.map((method) => {
                              const code = String(method.value ?? method.code ?? "");
                              return (
                                <Checkbox
                                  key={code}
                                  disabled={!config.enabled}
                                  checked={config.noticeWays.includes(code)}
                                  onChange={(event: { target: { checked: boolean } }) => updateMethod(config, code, event.target.checked)}
                                >
                                  {text(method.label ?? method.name ?? code)}
                                </Checkbox>
                              );
                            })
                          ) : (
                            <span class={styles.emptyText}>当前场景未配置可使用的通知方式</span>
                          )}
                        </div>
                        <div>
                          消息模版：
                          {activeKey.value === normalScene
                            ? "【xxx市场】在【报警事件发生地点】发生【车辆违停】报警事件，请知悉！"
                            : "【xxx市场】在【报警事件发生地点】发生【车辆违停】报警事件已超时【xxx分钟】当前还未处理，请知悉！"}
                        </div>
                        <div class={styles.noticeTargets}>
                          <div class={styles.noticeTargetLabel}>通知人员：</div>
                          {config.targets.map((target, index) => (
                            <div class={styles.noticeTargetRow} key={`${config.alarmLevelCode}-${index}`}>
                              <Select
                                value={target.name}
                                style={{ width: "180px" }}
                                options={[...noticeTargetOptions]}
                                onUpdate:value={(value: unknown) => changeTargetType(config, index, value)}
                              />
                              <Select
                                value={target.value.map((item) => item.id)}
                                mode="multiple"
                                open={false}
                                placeholder="请选择"
                                style={{ width: "180px" }}
                                options={target.value.map((item) => ({ label: item.name, value: item.id }))}
                                disabled={!config.enabled}
                              />
                              <Button type="primary" disabled={!config.enabled} onClick={() => openPicker(config, index)}>
                                {`选择${noticeTargetTypeLabel(target.name)}`}
                              </Button>
                              {index === 0 ? (
                                <Button type="primary" disabled={!config.enabled} onClick={() => addTarget(config)}>
                                  添加
                                </Button>
                              ) : (
                                <Button danger disabled={!config.enabled} onClick={() => removeTarget(config, index)}>
                                  删除
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Spin>
              <SafetyTargetPicker
                open={Boolean(picker.value)}
                type={picker.value?.type ?? "USER"}
                selected={
                  configurations.value.find((item) => item.alarmLevelCode === picker.value?.level)?.targets[picker.value?.index ?? 0]
                    ?.value ?? []
                }
                getOuaaClient={props.getOuaaClient}
                onUpdate:open={(value: boolean) => {
                  if (!value) {
                    picker.value = null;
                  }
                }}
                onConfirm={confirmPicker}
              />
            </div>
          ),
          "footer-btn": () => (
            <Button type="primary" loading={loading.value} onClick={() => void save()}>
              保存
            </Button>
          ),
        }}
      />
    );
  },
});

function statisticRatio(value: unknown): string {
  const valueText = text(value, "--");
  return valueText === "--" || valueText.endsWith("%") ? valueText : `${valueText}%`;
}

type StatisticKind = "alarm" | "department" | "user";
type StatisticCountHandler = (record: RecordRow, code: string) => void;

function statColumns(kind: StatisticKind, onCount: StatisticCountHandler): RecordRow[] {
  const nameColumn =
    kind === "alarm"
      ? dataColumn("报警事件", "alarmEventName", 180)
      : kind === "department"
        ? dataColumn("部门名称", "departmentName", 180)
        : dataColumn("人员名称", "userName", 180);
  const countColumn = (title: string, dataIndex: string, width: number): RecordRow =>
    dataColumn(title, dataIndex, width, (value, record) => (
      <Button type="link" size="small" onClick={() => onCount(record, title)}>
        {text(value, "0")}
      </Button>
    ));
  const leadingColumns =
    kind === "alarm"
      ? [countColumn("报警总数", "alarmTotalNum", 120)]
      : kind === "department"
        ? [countColumn("报警总数", "alarmTotalNum", 120)]
        : kind === "user"
          ? [dataColumn("所属部门", "departmentName", 160), countColumn("部门报警数", "departmentTotalNum", 120)]
          : [];
  const totalColumn =
    kind === "alarm"
      ? countColumn("事件报警数", "totalNum", 120)
      : countColumn(kind === "user" ? "个人报警总数" : "部门报警数", "totalNum", 120);
  return [
    nameColumn,
    ...leadingColumns,
    totalColumn,
    countColumn("未响应报警数", "unconfirmedNum", 130),
    countColumn("处理中报警数", "progressConfirmedNum", 130),
    countColumn("已处理报警数", "handlerNum", 130),
    countColumn("已挂起报警数", "suspendNum", 120),
    countColumn("超时报警数", "timeoutNum", 120),
    ...(kind === "alarm" ? [countColumn("真实报警数", "alarmActualNum", 120), countColumn("误报数", "alarmImpracticalNum", 100)] : []),
    dataColumn(kind === "alarm" ? "事件报警占比" : kind === "user" ? "报警占比" : "部门报警占比", "ratio", 120, (value) =>
      statisticRatio(value),
    ),
    ...(kind === "alarm" ? [dataColumn("报警正确率", "correctRate", 120, (value) => statisticRatio(value))] : []),
    dataColumn("报警处理率", "handlerRate", 120, (value) => statisticRatio(value)),
    dataColumn("报警响应率", "confirmedRate", 120, (value) => statisticRatio(value)),
    dataColumn("报警超时率", "timeoutRate", 120, (value) => statisticRatio(value)),
    dataColumn("处理平均耗时", "averageProcessing", 140),
  ];
}

function previousMonthPeriod(): string[] {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  const date = (value: Date): string => {
    const pad = (part: number): string => String(part).padStart(2, "0");
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  };
  return [date(start), date(end)];
}

function statisticPeriod(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item && typeof item === "object" && "format" in item && typeof (item as { format?: unknown }).format === "function") {
          return (item as { format: (pattern: string) => string }).format("YYYY-MM-DD");
        }
        return String(item ?? "");
      })
      .filter(Boolean)
      .slice(0, 2);
  }
  if (typeof value === "string") {
    return value.split(",").filter(Boolean).slice(0, 2);
  }
  return previousMonthPeriod();
}

function normalizeDepartmentTree(items: RecordRow[]): RecordRow[] {
  return items
    .map((item) => ({
      label: text(item.name ?? item.label ?? item.organizationName),
      value: String(item.id ?? item.code ?? ""),
      children: normalizeDepartmentTree(asRows(item.children)),
    }))
    .filter((item) => item.value);
}

function createStatisticPage(title: string, kind: StatisticKind): Component {
  const loader = {
    alarm: (client: SafetyManagementClient, params: Record<string, unknown>) => client.listAlarmReport(params),
    department: (client: SafetyManagementClient, params: Record<string, unknown>) => client.listDepartmentReport(params),
    user: (client: SafetyManagementClient, params: Record<string, unknown>) => client.listUserReport(params),
  }[kind];
  return defineComponent({
    name: `SafetyManagement${title.replaceAll(/[^\p{L}\p{N}]/gu, "")}Page`,
    props: pageProps,
    setup(props) {
      const route = useRouter();
      const currentRoute = route.currentRoute;
      const rows = ref<RecordRow[]>([]);
      const loading = ref(false);
      const exportLoading = ref(false);
      const alarmTypeOptions = ref<RecordRow[]>([]);
      const eventTypeOptions = ref<RecordRow[]>([]);
      const departmentOptions = ref<RecordRow[]>([]);
      const query = reactive({
        pageNumber: 1,
        pageSize: 10,
        total: 0,
        keyword: "",
        applicationCode: "",
        alarmEventTypeCode: "",
        departmentId: "",
        period: previousMonthPeriod(),
      });
      const reportQuery = (): Record<string, unknown> => ({
        pageNumber: query.pageNumber,
        pageSize: query.pageSize,
        keyword: query.keyword,
        applicationCode: query.applicationCode,
        alarmEventTypeCode: query.alarmEventTypeCode,
        departmentId: query.departmentId,
        period: query.period.join(","),
        "period.begin": query.period[0],
        "period.end": query.period[1],
      });
      const hydrateFromRoute = (): boolean => {
        const raw = currentRoute.value.query.searchValue;
        if (typeof raw !== "string" || !raw) {
          return false;
        }
        try {
          const value = JSON.parse(raw) as Record<string, unknown>;
          query.applicationCode = text(value.applicationCode, "");
          query.alarmEventTypeCode = text(value.alarmEventTypeCode ?? value.alarmEventTypeId, "");
          query.departmentId = text(value.searchDepartmentId ?? value.departmentId, "");
          query.period = statisticPeriod(value.period);
          return true;
        } catch {
          return false;
        }
      };
      const load = async (): Promise<void> => {
        loading.value = true;
        try {
          const result = pageResult(await loader(await getClient(props), reportQuery()));
          rows.value = result.records;
          query.total = result.total;
        } catch (error) {
          rows.value = [];
          query.total = 0;
          message.error(error instanceof Error ? error.message : `${title}加载失败`);
        } finally {
          loading.value = false;
        }
      };
      const onCount = (record: RecordRow, code: string): void => {
        let alarmStatus = "";
        let alarmHandlerTimeoutStatus = "";
        let alarmHandlerResult = "";
        if (["未响应报警数", "处理中报警数", "已处理报警数", "已挂起报警数"].includes(code)) {
          alarmStatus =
            {
              未响应报警数: "ALARM_UN_CONFIRMED",
              处理中报警数: "ALARM_PROGRESS_CONFIRMED",
              已处理报警数: "ALARM_HANDLER",
              已挂起报警数: "ALARM_SUSPEND",
            }[code] ?? "";
        } else if (code === "超时报警数") {
          alarmHandlerTimeoutStatus = "TIMED_OUT";
        } else if (code === "真实报警数") {
          alarmHandlerResult = "ALARM_ACTUAL";
        } else if (code === "误报数") {
          alarmHandlerResult = "ALARM_IMPRACTICAL";
        }
        const searchValue: Record<string, unknown> = {
          alarmStatus,
          alarmHandlerTimeoutStatus,
          alarmHandlerResult,
          applicationCode: query.applicationCode,
          alarmEventTypeId: kind === "alarm" ? record.alarmEventTypeId : query.alarmEventTypeCode,
          departmentId:
            kind === "department" && code !== "报警总数"
              ? text(record.departmentId, "")
              : kind === "user" && code === "部门报警数"
                ? text(record.departmentId, "")
                : "",
          userId: kind === "user" && code !== "部门报警数" ? text(record.userId, "") : "",
          searchDepartmentId: kind === "user" ? query.departmentId : "",
          userResponsible: false,
          period: query.period,
        };
        void route.push({ path: `${props.basePath}/alarm-record`, query: { from: kind, searchValue: JSON.stringify(searchValue) } });
      };
      const columns = computed(() => statColumns(kind, onCount));
      const loadOptions = async (): Promise<void> => {
        try {
          const client = await getClient(props);
          const [alarmTypes, eventTypes, departments] = await Promise.all([
            client.listAlarmTypeOptions(),
            kind === "alarm" ? Promise.resolve([]) : client.listEventTypes(),
            kind === "user" ? client.listDepartments() : Promise.resolve([]),
          ]);
          alarmTypeOptions.value = alarmTypes.map((item) => {
            const value = asRecord(item);
            return { label: text(value.alarmTypeName ?? value.name), value: text(value.alarmTypeCode ?? value.code, "") };
          });
          eventTypeOptions.value = eventTypes.map((item) => {
            const value = asRecord(item);
            return { label: text(value.name ?? value.eventTypeName), value: text(value.code ?? value.id, "") };
          });
          departmentOptions.value = normalizeDepartmentTree(departments.map(asRecord));
        } catch {
          alarmTypeOptions.value = [];
          eventTypeOptions.value = [];
          departmentOptions.value = [];
        }
      };
      const reset = (): void => {
        query.pageNumber = 1;
        query.keyword = "";
        query.applicationCode = "";
        query.alarmEventTypeCode = "";
        query.departmentId = "";
        query.period = previousMonthPeriod();
        void load();
      };
      const exportReport = async (): Promise<void> => {
        exportLoading.value = true;
        try {
          await (await getClient(props)).exportAlarmReport(kind, reportQuery());
          message.success("导出成功");
        } catch (error) {
          message.error(error instanceof Error ? error.message : "未查询到数据，无法导出");
        } finally {
          exportLoading.value = false;
        }
      };
      onMounted(() => {
        hydrateFromRoute();
        void loadOptions();
        void load();
      });
      return () => (
        <PageLayout
          title={props.title || title}
          v-slots={{
            "layout-header": () => (
              <Button type="primary" loading={exportLoading.value} onClick={() => void exportReport()}>
                导出
              </Button>
            ),
            "layout-content": () => (
              <div class={styles.content}>
                <Form layout="inline" class={styles.toolbar}>
                  {kind === "user" ? (
                    <FormItem label="部门">
                      <TreeSelect
                        value={query.departmentId || undefined}
                        allowClear
                        treeData={departmentOptions.value}
                        placeholder="请选择部门"
                        style={{ width: "180px" }}
                        onUpdate:value={(value: unknown) => (query.departmentId = text(value, ""))}
                      />
                    </FormItem>
                  ) : null}
                  <FormItem label="报警分类">
                    <Select
                      value={query.applicationCode || undefined}
                      allowClear
                      options={alarmTypeOptions.value}
                      placeholder="请选择报警分类"
                      style={{ width: "160px" }}
                      onUpdate:value={(value: unknown) => (query.applicationCode = text(value, ""))}
                    />
                  </FormItem>
                  {kind !== "alarm" ? (
                    <FormItem label="报警事件">
                      <Select
                        value={query.alarmEventTypeCode || undefined}
                        allowClear
                        options={eventTypeOptions.value}
                        placeholder="请选择报警事件"
                        style={{ width: "160px" }}
                        onUpdate:value={(value: unknown) => (query.alarmEventTypeCode = text(value, ""))}
                      />
                    </FormItem>
                  ) : null}
                  <FormItem>
                    <AntRangePicker
                      value={query.period as unknown as DateRange}
                      allowClear
                      onUpdate:value={(value: DateRange | undefined) => (query.period = value ? statisticPeriod(value) : [])}
                    />
                  </FormItem>
                  <FormItem>
                    <Button
                      type="primary"
                      onClick={() => {
                        query.pageNumber = 1;
                        void load();
                      }}
                    >
                      查询
                    </Button>
                    <Button onClick={reset}>重置</Button>
                  </FormItem>
                </Form>
                <div class={styles.tableWrap}>
                  <Table
                    rowKey={(record: RecordRow) => String(record.id ?? record.code ?? JSON.stringify(record))}
                    columns={columns.value}
                    dataSource={rows.value}
                    loading={loading.value}
                    pagination={false}
                    scroll={{ x: kind === "alarm" ? 1900 : 1800 }}
                  />
                </div>
              </div>
            ),
            "footer-page": () => (
              <Page
                current={query.pageNumber}
                pageSize={query.pageSize}
                total={query.total}
                onPageChange={(pageNumber: number, pageSize: number) => {
                  query.pageNumber = pageNumber;
                  query.pageSize = pageSize;
                  void load();
                }}
              />
            ),
          }}
        />
      );
    },
  });
}

export const AlarmReportPage = createStatisticPage("报警统计", "alarm");
export const DepartmentReportPage = createStatisticPage("部门统计", "department");
export const UserReportPage = createStatisticPage("人员统计", "user");

export const SafetyAnalysisPage = defineComponent({
  name: "SafetyManagementSafetyAnalysisPage",
  props: pageProps,
  setup(props) {
    const router = useRouter();
    const reports = ref<RecordRow[]>([]);
    const loading = ref(false);
    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const client = await getClient(props);
        reports.value = pageResult(await client.listMetricReports({ pageNumber: 1, pageSize: 5, keyword: "" })).records;
      } catch (error) {
        reports.value = [];
        message.error(error instanceof Error ? error.message : "安全分析加载失败");
      } finally {
        loading.value = false;
      }
    };
    onMounted(() => void load());
    return () => (
      <PageLayout
        title={props.title || "安全分析"}
        v-slots={{
          "layout-header": () => <Button onClick={() => void load()}>刷新</Button>,
          "layout-content": () => (
            <div class={styles.analysisPage}>
              <Spin spinning={loading.value}>
                <div class={styles.analysisHero}>
                  <div class={styles.radarGraphic} aria-label="安全分析雷达">
                    <div class={styles.radarCore} />
                  </div>
                  <div class={styles.analysisMain}>
                    <div class={styles.analysisHeroHeader}>
                      <div class={styles.analysisSlogan}>多维问题监测，全域安全守护</div>
                      <Button
                        type="primary"
                        class={styles.analysisAction}
                        onClick={() => void router.push(`${props.basePath}/security-analysis-report`)}
                      >
                        安全分析
                      </Button>
                    </div>
                    <div class={styles.analysisFeatures}>
                      {[
                        ["人员协同", "持续跟进员工处理情况，发现人员协同零死角", "♟"],
                        ["物联防线", "全链路检测设备安全，力争物联防线无漏洞。", "▤"],
                        ["安全屏障", "多维度预警安全隐患，构建园区安全壁垒。", "♨"],
                        ["智慧中枢", "集中分析安全数据，驱动安全智能化管控升级", "▣"],
                      ].map(([label, description, icon]) => (
                        <div class={styles.analysisFeature} key={label}>
                          <span class={styles.featureIcon}>{icon}</span>
                          <span>
                            <strong>{label}</strong>
                            <span class={styles.featureDescription}>{description}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div class={styles.historyTitle}>历史报告</div>
                <Table
                  rowKey={(record: RecordRow) => String(record.id ?? record.requestId ?? JSON.stringify(record))}
                  pagination={false}
                  columns={[
                    dataColumn("报告名称", "name", 520, (value, record) => (
                      <PopOver content={text(value ?? record.title)}>{text(value ?? record.title)}</PopOver>
                    )),
                    dataColumn("生成时间", "createTime", 280, (value) => formatDate(value)),
                    {
                      title: "操作",
                      width: 180,
                      fixed: "right",
                      customRender: ({ record }: { record: RecordRow }) => {
                        const id = String(record.requestId ?? record.id ?? "");
                        return (
                          <Button type="link" size="small" disabled={!id} onClick={() => actionsNavigate(router, safetyProps(props), id)}>
                            查看
                          </Button>
                        );
                      },
                    },
                  ]}
                  dataSource={reports.value}
                />
              </Spin>
            </div>
          ),
        }}
      />
    );
  },
});

function actionsNavigate(router: ReturnType<typeof useRouter>, props: SafetyPageProps, requestId: string): void {
  void router.push({ path: `${props.basePath}/viewreport`, query: { requestId } });
}

interface MetricForm {
  id: string;
  name: string;
  computeFormula: string;
  computeFormulaMetrics: string;
  computeType: string;
}
const blankMetric = (): MetricForm => ({
  id: "",
  name: "",
  computeFormula: "",
  computeFormulaMetrics: "",
  computeType: "COMBINATION_RESULT",
});

export const MetricLibraryPage = defineComponent({
  name: "SafetyManagementMetricLibraryPage",
  props: pageProps,
  setup(props) {
    const rows = ref<RecordRow[]>([]);
    const loading = ref(false);
    const editorOpen = ref(false);
    const editorSaving = ref(false);
    const form = reactive<MetricForm>(blankMetric());
    const metricOptions = ref<RecordRow[]>([]);
    const selectedMetrics = ref<string[]>([]);
    const query = reactive({ keyword: "", pageNumber: 1, pageSize: 10, total: 0 });
    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const client = await getClient(props);
        const [result, all] = await Promise.all([client.listMetricLibraries(query), client.listAllMetricLibraries()]);
        const page = pageResult(result);
        rows.value = page.records;
        query.total = page.total;
        metricOptions.value = asRows(all);
      } catch (error) {
        rows.value = [];
        query.total = 0;
        message.error(error instanceof Error ? error.message : "指标库加载失败");
      } finally {
        loading.value = false;
      }
    };
    const add = (): void => {
      Object.assign(form, blankMetric());
      selectedMetrics.value = [];
      editorOpen.value = true;
    };
    const edit = (record: RecordRow): void => {
      Object.assign(form, {
        id: String(record.id ?? ""),
        name: text(record.name ?? record.metricName, ""),
        computeFormula: text(record.computeFormula ?? record.formula, ""),
        computeFormulaMetrics: text(record.computeFormulaMetrics ?? record.metrics, ""),
        computeType: text(record.computeType, "COMBINATION_RESULT"),
      });
      const names = String(record.computeFormulaMetrics ?? record.metrics ?? "")
        .split(",")
        .filter(Boolean);
      selectedMetrics.value = names;
      editorOpen.value = true;
    };
    const save = async (): Promise<void> => {
      if (!form.name.trim()) {
        message.warning("请输入指标名称");
        return;
      }
      editorSaving.value = true;
      try {
        const client = await getClient(props);
        const byName = new Map(metricOptions.value.map((item) => [text(item.name ?? item.metricName, ""), String(item.id ?? "")]));
        const metricIds: string[] = [];
        const computeFormula = form.computeFormula.replace(/\[([^\]]+)\]/gu, (_match, label: string) => {
          const id = byName.get(label) ?? label;
          if (id && !metricIds.includes(id)) {
            metricIds.push(id);
          }
          return `[${id}]`;
        });
        const payload = {
          ...form,
          name: form.name.trim(),
          computeType: "COMBINATION_RESULT",
          computeFormula,
          computeFormulaMetrics: metricIds.join(","),
        };
        if (payload.id) {
          await client.updateMetricLibrary(payload);
        } else {
          const { id: _unusedId, ...createPayload } = payload;
          await client.createMetricLibrary(createPayload);
        }
      } catch (error) {
        message.error(error instanceof Error ? error.message : "指标保存失败");
        editorSaving.value = false;
        return;
      }
      editorSaving.value = false;
      editorOpen.value = false;
      message.success("指标已保存");
      await load();
    };
    const remove = async (record: RecordRow): Promise<void> => {
      const id = String(record.id ?? "");
      if (!id) {
        return;
      }
      loading.value = true;
      try {
        await (await getClient(props)).deleteMetricLibrary(id);
        message.success("指标已删除");
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "指标删除失败");
      } finally {
        loading.value = false;
      }
    };
    onMounted(() => void load());
    return () => (
      <PageLayout
        title={props.title || "指标库"}
        v-slots={{
          "layout-header": () => (
            <Button type="primary" onClick={add}>
              新增指标
            </Button>
          ),
          "layout-content": () => (
            <div class={styles.content}>
              <Form layout="inline" class={styles.toolbar}>
                <FormItem>
                  <Input
                    value={query.keyword}
                    allowClear
                    placeholder="请输入指标名称"
                    onUpdate:value={(value: string) => (query.keyword = value)}
                  />
                </FormItem>
                <FormItem>
                  <Button type="primary" onClick={() => void load()}>
                    查询
                  </Button>
                  <Button
                    onClick={() => {
                      query.keyword = "";
                      query.pageNumber = 1;
                      void load();
                    }}
                  >
                    重置
                  </Button>
                </FormItem>
              </Form>
              <div class={styles.tableWrap}>
                <Table
                  rowKey={(record: RecordRow) => String(record.id ?? record.code ?? JSON.stringify(record))}
                  loading={loading.value}
                  pagination={false}
                  scroll={{ x: 1320 }}
                  dataSource={rows.value}
                  columns={[
                    serialColumn,
                    dataColumn("指标名称", "name", 220, (value, record) => text(value ?? record.metricName)),
                    dataColumn("计算规则", "computeFormula", 420, (value, record) => {
                      const formula = text(value ?? record.formula, "");
                      return (
                        formula.replace(/\[([^\]]+)\]/gu, (_match, id: string) => {
                          const metric = metricOptions.value.find((item) => String(item.id ?? "") === id);
                          return `[${text(metric?.name, id)}]`;
                        }) || "--"
                      );
                    }),
                    dataColumn("创建人", "createByName", 180),
                    dataColumn("创建时间", "createTime", 220, (value) => formatDate(value)),
                    {
                      title: "操作",
                      width: 150,
                      fixed: "right",
                      customRender: ({ record }: { record: RecordRow }) => (
                        <span>
                          <Button type="link" size="small" onClick={() => edit(record)}>
                            编辑
                          </Button>
                          <Popconfirm title="确定删除该指标吗？" onConfirm={() => void remove(record)}>
                            <Button type="link" danger size="small">
                              删除
                            </Button>
                          </Popconfirm>
                        </span>
                      ),
                    },
                  ]}
                />
              </div>
              <Modal
                title={form.id ? "编辑指标" : "新增指标"}
                width={800}
                open={editorOpen.value}
                onUpdate:open={(value: boolean) => (editorOpen.value = value)}
                onCancel={() => (editorOpen.value = false)}
                onOk={() => void save()}
                confirmLoading={editorSaving.value}
              >
                <Form class={styles.metricEditor} labelCol={{ span: 4 }} wrapperCol={{ span: 18 }}>
                  <FormItem label="指标名称" required>
                    <Input
                      maxlength={20}
                      showCount
                      placeholder="请输入"
                      value={form.name}
                      onUpdate:value={(value: string) => (form.name = value)}
                    />
                  </FormItem>
                  <FormItem label="计算规则" required>
                    <Select
                      mode="multiple"
                      maxTagCount={3}
                      value={selectedMetrics.value}
                      options={metricOptions.value.map((item) => ({
                        label: text(item.name ?? item.metricName),
                        value: String(item.id ?? ""),
                      }))}
                      placeholder="请选择变量"
                      onUpdate:value={(value: unknown) => {
                        const next = Array.isArray(value) ? value.map(String) : [];
                        const added = next.filter((id) => !selectedMetrics.value.includes(id));
                        for (const id of added) {
                          const metric = metricOptions.value.find((item) => String(item.id ?? "") === id);
                          if (metric) {
                            form.computeFormula += `${form.computeFormula ? "" : ""}[${text(metric.name ?? metric.metricName, id)}]`;
                          }
                        }
                        for (const id of selectedMetrics.value.filter((item) => !next.includes(item))) {
                          const metric = metricOptions.value.find((item) => String(item.id ?? "") === id);
                          if (metric) {
                            form.computeFormula = form.computeFormula.replaceAll(`[${text(metric.name ?? metric.metricName, id)}]`, "");
                          }
                        }
                        selectedMetrics.value = next;
                      }}
                    />
                  </FormItem>
                  <FormItem class={styles.metricFormulaItem} wrapperCol={{ offset: 4, span: 18 }}>
                    <Input.TextArea
                      rows={4}
                      maxlength={500}
                      showCount
                      placeholder="请输入"
                      value={form.computeFormula.replace(/\[([^\]]+)\]/gu, (_match, id: string) => {
                        const metric = metricOptions.value.find((item) => String(item.id ?? "") === id);
                        return `[${text(metric?.name, id)}]`;
                      })}
                      onUpdate:value={(value: string) => (form.computeFormula = value)}
                    />
                    <div class={styles.formErrorHint}>
                      计算规则请使用“[]”包裹变量名称，如[变量名称],计算方式请使用“+，-，*，/，()”进行运算，如([变量名称1]+[变量名称2])*[变量名称3]”。
                    </div>
                  </FormItem>
                </Form>
              </Modal>
            </div>
          ),
          "footer-page": () => (
            <Page
              current={query.pageNumber}
              pageSize={query.pageSize}
              total={query.total}
              onPageChange={(pageNumber: number, pageSize: number) => {
                query.pageNumber = pageNumber;
                query.pageSize = pageSize;
                void load();
              }}
            />
          ),
        }}
      />
    );
  },
});

interface RuleForm {
  id: string;
  itemName: string;
  itemCode: string;
  parentId: string;
  itemType: string;
  weightAllot: number;
  computeMetric: string;
  ruleContentTemplate: string;
  ruleContentTemplateEnabled: boolean;
  displayMetricsEnabled: boolean;
  coefficients: ConditionItem[];
}

interface ConditionItem {
  key: string;
  min: string;
  max: string;
  score: string;
}

function blankRule(itemType: string, parentId = ""): RuleForm {
  return {
    id: "",
    itemName: "",
    itemCode: "",
    parentId,
    itemType,
    weightAllot: 0,
    computeMetric: "",
    ruleContentTemplate: "",
    ruleContentTemplateEnabled: true,
    displayMetricsEnabled: false,
    coefficients: [
      { key: "top", min: "60", max: "", score: "1" },
      { key: "bottom", min: "", max: "60", score: "0" },
    ],
  };
}

export function createRuleLibraryPage(title: string, businessClassification: boolean): Component {
  return defineComponent({
    name: businessClassification ? "SafetyManagementBusinessClassificationPage" : "SafetyManagementRuleLibraryPage",
    props: pageProps,
    setup(props) {
      const rows = ref<RecordRow[]>([]);
      const loading = ref(false);
      const editorOpen = ref(false);
      const editorSaving = ref(false);
      const keyword = ref("");
      const form = reactive<RuleForm>(blankRule(businessClassification ? "APPLICATION" : "RULE"));
      const filteredRows = computed(() => {
        const key = keyword.value.trim().toLowerCase();
        if (!key) {
          return rows.value;
        }
        return rows.value.filter((item) =>
          text(item.displayPath ?? item.itemName ?? item.name, "")
            .toLowerCase()
            .includes(key),
        );
      });
      const load = async (): Promise<void> => {
        loading.value = true;
        try {
          const tree = asRows(await (await getClient(props)).listRuleLibraries());
          rows.value = flattenTree(tree);
        } catch (error) {
          rows.value = [];
          message.error(error instanceof Error ? error.message : `${title}加载失败`);
        } finally {
          loading.value = false;
        }
      };
      const add = (parent?: RecordRow): void => {
        Object.assign(form, blankRule(businessClassification ? (parent ? "GROUP" : "APPLICATION") : "RULE", String(parent?.id ?? "")));
        editorOpen.value = true;
      };
      const edit = (record: RecordRow): void => {
        Object.assign(form, {
          id: String(record.id ?? ""),
          itemName: text(record.itemName ?? record.name, ""),
          itemCode: text(record.itemCode, ""),
          parentId: text(record.parentId, ""),
          itemType: text(record.itemType, businessClassification ? "APPLICATION" : "RULE"),
          weightAllot: num(record.weightAllot ?? record.weight),
          computeMetric: text(record.computeMetric, ""),
          ruleContentTemplate: text(record.ruleContentTemplate ?? record.content, ""),
          ruleContentTemplateEnabled: record.ruleContentTemplateEnabled !== false,
          displayMetricsEnabled: record.displayMetricsEnabled === true,
          coefficients: asRows(record.coefficients).map((item, index) => ({
            key: String(index),
            min: text(item.greaterThan ?? item.min, ""),
            max: text(item.lessThanOrEqual ?? item.max, ""),
            score: text(item.scoreRatio ?? item.score, "0"),
          })),
        });
        editorOpen.value = true;
      };
      const addCondition = (): void => {
        const conditions = form.coefficients;
        const last = conditions.at(-1);
        const previousMin = conditions.length > 1 ? (conditions.at(-2)?.min ?? "60") : "60";
        const max = previousMin ? String(Math.max(0, num(previousMin) - 10)) : "0";
        if (last) {
          last.max = previousMin;
        }
        conditions.splice(Math.max(conditions.length - 1, 0), 0, { key: String(Date.now()), min: max, max: previousMin, score: "0" });
      };
      const removeCondition = (index: number): void => {
        if (form.coefficients.length <= 2) {
          return;
        }
        form.coefficients.splice(index, 1);
      };
      const save = async (): Promise<void> => {
        if (!form.itemName.trim()) {
          message.warning("请输入名称");
          return;
        }
        editorSaving.value = true;
        try {
          const client = await getClient(props);
          const payload: Record<string, unknown> = {
            id: form.id || undefined,
            itemName: form.itemName.trim(),
            itemCode: form.itemCode.trim() || undefined,
            parentId: form.parentId || undefined,
            itemType: form.itemType,
            weightAllot: form.weightAllot,
            computeMetric: form.computeMetric.trim() || undefined,
            ruleContentTemplate: form.ruleContentTemplate.trim() || undefined,
            ruleContentTemplateEnabled: form.ruleContentTemplateEnabled,
            displayMetricsEnabled: form.displayMetricsEnabled,
            coefficients: form.coefficients.map((item) => ({
              greaterThan: item.min,
              lessThanOrEqual: item.max,
              scoreRatio: item.score,
            })),
          };
          if (form.id) {
            await client.updateRuleLibrary(payload);
          } else {
            await client.saveRuleLibrary(payload);
          }
          editorOpen.value = false;
          message.success("已保存");
          await load();
        } catch (error) {
          message.error(error instanceof Error ? error.message : "保存失败");
        } finally {
          editorSaving.value = false;
        }
      };
      const remove = async (record: RecordRow): Promise<void> => {
        const id = String(record.id ?? "");
        if (!id) {
          return;
        }
        loading.value = true;
        try {
          await (await getClient(props)).deleteRuleLibrary(id);
          message.success("已删除");
          await load();
        } catch (error) {
          message.error(error instanceof Error ? error.message : "删除失败");
        } finally {
          loading.value = false;
        }
      };
      onMounted(() => void load());
      const contentLabel = businessClassification ? "分类说明" : "规则内容";
      return () => (
        <PageLayout
          title={props.title || title}
          v-slots={{
            "layout-header": () => (
              <Button type="primary" onClick={() => add()}>
                {businessClassification ? "新增应用" : "新增规则"}
              </Button>
            ),
            "layout-content": () => (
              <div class={styles.content}>
                <Form layout="inline" class={styles.toolbar}>
                  <FormItem>
                    <Input
                      value={keyword.value}
                      allowClear
                      placeholder={`请输入${businessClassification ? "应用或业务分类" : "规则"}名称`}
                      onUpdate:value={(value: string) => (keyword.value = value)}
                    />
                  </FormItem>
                  <FormItem>
                    <Button type="primary" onClick={() => void load()}>
                      查询
                    </Button>
                    <Button
                      onClick={() => {
                        keyword.value = "";
                        void load();
                      }}
                    >
                      重置
                    </Button>
                  </FormItem>
                </Form>
                <div class={styles.tableWrap}>
                  <Table
                    rowKey={(record: RecordRow) => String(record.id ?? record.itemCode ?? JSON.stringify(record))}
                    loading={loading.value}
                    pagination={false}
                    scroll={{ x: 1420 }}
                    dataSource={filteredRows.value}
                    columns={[
                      dataColumn(businessClassification ? "应用 / 业务分类" : "规则层级", "displayPath", 300),
                      dataColumn(businessClassification ? "业务分类" : "规则名称", "itemName", 220, (value, record) =>
                        text(value ?? record.name),
                      ),
                      dataColumn("编码", "itemCode", 180),
                      dataColumn("类型", "itemType", 140),
                      dataColumn("计分权重", "weightAllot", 130),
                      dataColumn(contentLabel, "ruleContentTemplate", 340, (value, record) => text(value ?? record.content)),
                      dataColumn("计算指标", "computeMetric", 220),
                      {
                        title: "操作",
                        width: businessClassification ? 230 : 150,
                        fixed: "right",
                        customRender: ({ record }: { record: RecordRow }) => (
                          <span>
                            {businessClassification && ["APPLICATION", "GROUP"].includes(String(record.itemType ?? "")) ? (
                              <Button type="link" size="small" onClick={() => add(record)}>
                                新增下级
                              </Button>
                            ) : null}
                            <Button type="link" size="small" onClick={() => edit(record)}>
                              编辑
                            </Button>
                            <Popconfirm title="确定删除该条记录吗？" onConfirm={() => void remove(record)}>
                              <Button type="link" danger size="small">
                                删除
                              </Button>
                            </Popconfirm>
                          </span>
                        ),
                      },
                    ]}
                  />
                </div>
                <Modal
                  title={
                    form.id ? `编辑${businessClassification ? "业务分类" : "规则"}` : `新增${businessClassification ? "业务分类" : "规则"}`
                  }
                  width={800}
                  open={editorOpen.value}
                  onUpdate:open={(value: boolean) => (editorOpen.value = value)}
                  onCancel={() => (editorOpen.value = false)}
                  onOk={() => void save()}
                  confirmLoading={editorSaving.value}
                >
                  <Form class={styles.ruleEditorForm} labelCol={{ span: 5 }} wrapperCol={{ span: 18 }}>
                    <FormItem label="规则名称" required>
                      <Input maxlength={20} showCount value={form.itemName} onUpdate:value={(value: string) => (form.itemName = value)} />
                    </FormItem>
                    <FormItem label="规则模版">
                      <Switch
                        checked={form.ruleContentTemplateEnabled}
                        onUpdate:checked={(value: unknown) => (form.ruleContentTemplateEnabled = value === true)}
                      />
                    </FormItem>
                    <FormItem label="规则内容">
                      <div class={styles.ruleContentField}>
                        <Button type="primary" onClick={() => (form.ruleContentTemplate += "[]")}>
                          插入指标
                        </Button>
                        <Input.TextArea
                          rows={4}
                          maxlength={500}
                          showCount
                          disabled={!form.ruleContentTemplateEnabled}
                          value={form.ruleContentTemplate}
                          onUpdate:value={(value: string) => (form.ruleContentTemplate = value)}
                        />
                      </div>
                    </FormItem>
                    <FormItem label="展示指标">
                      <Switch
                        checked={form.displayMetricsEnabled}
                        onUpdate:checked={(value: unknown) => (form.displayMetricsEnabled = value === true)}
                      />
                    </FormItem>
                    <FormItem label="计分权重" required>
                      <InputNumber min={0} value={form.weightAllot} onUpdate:value={(value: unknown) => (form.weightAllot = num(value))} />
                    </FormItem>
                    <FormItem label="计分指标" required>
                      <Select
                        value={form.computeMetric || undefined}
                        placeholder="请选择规则计算接口"
                        options={[{ label: "规则计算接口", value: "RULE_METRIC" }]}
                        onUpdate:value={(value: unknown) => (form.computeMetric = String(value ?? ""))}
                      />
                    </FormItem>
                    <FormItem label="取分条件">
                      <Button type="primary" size="small" class={styles.conditionAddButton} onClick={addCondition}>
                        新增
                      </Button>
                      <Table
                        class={styles.conditionTable}
                        rowKey="key"
                        size="small"
                        pagination={false}
                        dataSource={form.coefficients}
                        columns={[
                          {
                            title: "最小值",
                            dataIndex: "min",
                            customRender: ({ record, index }: { record: ConditionItem; index: number }) =>
                              index === form.coefficients.length - 1 ? (
                                <Input disabled value="" />
                              ) : (
                                <Input
                                  value={record.min}
                                  disabled={index > 0}
                                  onUpdate:value={(value: string) => {
                                    record.min = value;
                                    if (index === 0 && form.coefficients[1]) {
                                      form.coefficients[1].max = value;
                                    }
                                  }}
                                />
                              ),
                          },
                          {
                            title: "最大值",
                            dataIndex: "max",
                            customRender: ({ record, index }: { record: ConditionItem; index: number }) =>
                              index === 0 ? (
                                <Input disabled value="" />
                              ) : (
                                <Input
                                  value={record.max}
                                  onUpdate:value={(value: string) => {
                                    record.max = value;
                                    if (form.coefficients[index - 1]) {
                                      form.coefficients[index - 1].min = value;
                                    }
                                  }}
                                />
                              ),
                          },
                          {
                            title: "得分系数",
                            dataIndex: "score",
                            customRender: ({ record }: { record: ConditionItem }) => (
                              <Input value={record.score} onUpdate:value={(value: string) => (record.score = value)} />
                            ),
                          },
                          {
                            title: "操作",
                            customRender: ({ index }: { index: number }) =>
                              index === 0 || index === form.coefficients.length - 1 ? null : (
                                <Button type="link" danger onClick={() => removeCondition(index)}>
                                  删除
                                </Button>
                              ),
                          },
                        ]}
                      />
                    </FormItem>
                  </Form>
                </Modal>
              </div>
            ),
          }}
        />
      );
    },
  });
}

interface RuleTreeNode {
  key: string;
  title: string;
  children?: RuleTreeNode[];
  record: RecordRow;
}

function ruleTreeLeafCount(record: RecordRow): number {
  const children = asRows(record.children ?? record.subItems);
  if (children.length === 0) {
    return 1;
  }
  return children.reduce((total, child) => total + ruleTreeLeafCount(child), 0);
}

function toRuleTreeNodes(records: RecordRow[]): RuleTreeNode[] {
  return records.map((record) => {
    const children = asRows(record.children ?? record.subItems);
    const name = text(record.itemName ?? record.name, "");
    return {
      key: String(record.id ?? name),
      title: `${name}${children.length > 0 ? ` (${ruleTreeLeafCount(record)})` : ""}`,
      children: children.length > 0 ? toRuleTreeNodes(children) : undefined,
      record,
    };
  });
}

function findRuleTreeNode(nodes: RuleTreeNode[], key: string): RuleTreeNode | undefined {
  for (const node of nodes) {
    if (node.key === key) {
      return node;
    }
    const child = node.children ? findRuleTreeNode(node.children, key) : undefined;
    if (child) {
      return child;
    }
  }
  return undefined;
}

function findRuleTreePath(nodes: RuleTreeNode[], key: string, path: string[] = []): string[] | undefined {
  for (const node of nodes) {
    const next = [...path, node.key];
    if (node.key === key) {
      return next;
    }
    const childPath = node.children ? findRuleTreePath(node.children, key, next) : undefined;
    if (childPath) {
      return childPath;
    }
  }
  return undefined;
}

function filterRuleTree(nodes: RuleTreeNode[], keyword: string): RuleTreeNode[] {
  if (!keyword) {
    return nodes;
  }
  return nodes.flatMap((node) => {
    const children = node.children ? filterRuleTree(node.children, keyword) : [];
    if (node.title.toLowerCase().includes(keyword) || children.length > 0) {
      return [{ ...node, children: children.length ? children : node.children }];
    }
    return [];
  });
}

function collectRuleLeaves(node: RuleTreeNode): RecordRow[] {
  if (!node.children?.length) {
    return [node.record];
  }
  return node.children.flatMap(collectRuleLeaves);
}

function renderRuleConditions(value: unknown, name: string): JSX.Element {
  const rows = asRows(value);
  return (
    <span>
      {rows.map((condition, index) => (
        <span key={`${name}-${index}`}>
          {text(condition.greaterThan ?? condition.min, "") ? `${text(condition.greaterThan ?? condition.min)}<` : ""}
          {name}
          {text(condition.lessThanOrEqual ?? condition.max, "") ? `<=${text(condition.lessThanOrEqual ?? condition.max)}` : ""}
          ：得分系数{text(condition.scoreRatio ?? condition.score, "0")}；
        </span>
      ))}
    </span>
  );
}

function createRuleBasePage(): Component {
  return defineComponent({
    name: "SafetyManagementRuleLibraryPage",
    props: pageProps,
    setup(props) {
      const router = useRouter();
      const treeNodes = ref<RuleTreeNode[]>([]);
      const treeKeyword = ref("");
      const selectedKey = ref("all");
      const expandedKeys = ref<string[]>(["all"]);
      const rows = ref<RecordRow[]>([]);
      const metricOptions = ref<RecordRow[]>([]);
      const loading = ref(false);
      const saving = ref(false);
      const editorOpen = ref(false);
      const metricPickerOpen = ref(false);
      const metricPickerKeyword = ref("");
      const ruleCursorPosition = ref(0);
      const pageNumber = ref(1);
      const pageSize = ref(10);
      const form = reactive<RuleForm>(blankRule("COMPUTE_RULE"));
      const visibleMetricOptions = computed(() => {
        const keyword = metricPickerKeyword.value.trim().toLowerCase();
        if (!keyword) {
          return metricOptions.value;
        }
        return metricOptions.value.filter((item) =>
          text(item.name ?? item.metricName, "")
            .toLowerCase()
            .includes(keyword),
        );
      });
      const visibleTreeNodes = computed(() => filterRuleTree(treeNodes.value, treeKeyword.value.trim().toLowerCase()));
      const selectedNode = computed(() => findRuleTreeNode(treeNodes.value, selectedKey.value));
      const selectedRows = computed(() => {
        const node = selectedNode.value;
        if (!node) {
          return rows.value;
        }
        return collectRuleLeaves(node);
      });
      const pageRows = computed(() => selectedRows.value.slice((pageNumber.value - 1) * pageSize.value, pageNumber.value * pageSize.value));

      const renderFormula = (value: unknown): string => {
        const source = text(value, "");
        return source.replace(/\[([^\]]+)\]/gu, (_match, id: string) => {
          const metric = metricOptions.value.find((item) => String(item.id ?? "") === id);
          return `[${text(metric?.name ?? metric?.metricName, id)}]`;
        });
      };
      const metricIdByName = new Map<string, string>();
      const toStoredFormula = (value: string): { formula: string; variables: string } => {
        const ids: string[] = [];
        const formula = value.replace(/\[([^\]]+)\]/gu, (_match, label: string) => {
          const id = metricIdByName.get(label) ?? label;
          if (id && !ids.includes(id)) {
            ids.push(id);
          }
          return `[${id}]`;
        });
        return { formula, variables: ids.join(",") };
      };
      const syncRoute = (key: string, resetPage = true): void => {
        if (resetPage) {
          pageNumber.value = 1;
        }
        selectedKey.value = key || "all";
        const path = findRuleTreePath(treeNodes.value, selectedKey.value) ?? [];
        expandedKeys.value = [...new Set([...expandedKeys.value, ...path.slice(0, -1)])];
        void router.replace({
          query: {
            ...router.currentRoute.value.query,
            selectedKey: selectedKey.value === "all" ? undefined : selectedKey.value,
            pageNumber: String(pageNumber.value),
            pageSize: String(pageSize.value),
          },
        });
      };
      const load = async (): Promise<void> => {
        loading.value = true;
        try {
          const client = await getClient(props);
          const [tree, metrics] = await Promise.all([client.listRuleLibraries(), client.listAllMetricLibraries()]);
          const source = asRows(tree);
          const root: RuleTreeNode = {
            key: "all",
            title: `全部 (${source.reduce((total, item) => total + ruleTreeLeafCount(item), 0)})`,
            children: toRuleTreeNodes(source),
            record: { id: "all", itemName: "全部", children: source },
          };
          treeNodes.value = [root];
          metricOptions.value = asRows(metrics);
          metricIdByName.clear();
          for (const metric of metricOptions.value) {
            const name = text(metric.name ?? metric.metricName, "");
            const id = String(metric.id ?? "");
            if (name && id) {
              metricIdByName.set(name, id);
            }
          }
          const queryKey = text(router.currentRoute.value.query.selectedKey, "");
          const firstGroup = root.children?.flatMap((item) => item.children ?? []).find((item) => item.children?.length);
          const nextKey = queryKey && findRuleTreeNode([root], queryKey) ? queryKey : (firstGroup?.key ?? "all");
          selectedKey.value = nextKey;
          const path = findRuleTreePath([root], nextKey) ?? [];
          expandedKeys.value = [...new Set([...path.slice(0, -1), "all"])].filter(
            (item) => item !== "all" || Boolean(root.children?.length),
          );
          rows.value = source;
        } catch (error) {
          treeNodes.value = [];
          rows.value = [];
          message.error(error instanceof Error ? error.message : "规则库加载失败");
        } finally {
          loading.value = false;
        }
      };
      const openAdd = (): void => {
        const parent = selectedNode.value && selectedNode.value.key !== "all" ? selectedNode.value.key : "";
        Object.assign(form, blankRule("COMPUTE_RULE", parent));
        ruleCursorPosition.value = 0;
        editorOpen.value = true;
      };
      const openEdit = (record: RecordRow): void => {
        const coefficients = asRows(record.coefficients).map((item, index) => ({
          key: String(index),
          min: text(item.greaterThan ?? item.min, ""),
          max: text(item.lessThanOrEqual ?? item.max, ""),
          score: text(item.scoreRatio ?? item.score, "0"),
        }));
        Object.assign(form, {
          id: String(record.id ?? ""),
          itemName: text(record.itemName ?? record.name, ""),
          itemCode: text(record.itemCode, ""),
          parentId: text(record.parentId, selectedNode.value?.key === "all" ? "" : selectedNode.value?.key),
          itemType: text(record.itemType, "COMPUTE_RULE"),
          weightAllot: num(record.weightAllot ?? record.weight),
          computeMetric: text(record.computeMetric, ""),
          ruleContentTemplate: renderFormula(record.ruleContentTemplate ?? record.content),
          ruleContentTemplateEnabled: record.ruleContentTemplateEnabled !== false,
          displayMetricsEnabled: record.displayMetricsEnabled === true,
          coefficients: coefficients.length > 0 ? coefficients : blankRule("COMPUTE_RULE").coefficients,
        });
        ruleCursorPosition.value = form.ruleContentTemplate.length;
        editorOpen.value = true;
      };
      const openMetricPicker = (): void => {
        metricPickerKeyword.value = "";
        ruleCursorPosition.value = Math.min(ruleCursorPosition.value, form.ruleContentTemplate.length);
        metricPickerOpen.value = true;
      };
      const insertMetric = (metric: RecordRow): void => {
        const label = text(metric.name ?? metric.metricName, "");
        if (!label) {
          return;
        }
        const value = `[${label}]`;
        const position = Math.max(0, Math.min(ruleCursorPosition.value, form.ruleContentTemplate.length));
        form.ruleContentTemplate = `${form.ruleContentTemplate.slice(0, position)}${value}${form.ruleContentTemplate.slice(position)}`;
        ruleCursorPosition.value = position + value.length;
        metricPickerOpen.value = false;
      };
      const addCondition = (): void => {
        const last = form.coefficients.at(-1);
        const previous = form.coefficients.at(-2);
        const upper = text(previous?.min, "60");
        if (last) {
          last.max = upper;
        }
        form.coefficients.splice(Math.max(0, form.coefficients.length - 1), 0, {
          key: String(Date.now()),
          min: String(Math.max(0, num(upper) - 10)),
          max: upper,
          score: "0",
        });
      };
      const removeCondition = (index: number): void => {
        if (form.coefficients.length > 2) {
          form.coefficients.splice(index, 1);
        }
      };
      const save = async (): Promise<void> => {
        if (!form.itemName.trim()) {
          return void message.warning("请输入规则名称");
        }
        if (form.ruleContentTemplateEnabled && !form.ruleContentTemplate.trim()) {
          return void message.warning("请输入规则内容");
        }
        if (!form.computeMetric.trim()) {
          return void message.warning("请选择规则计算接口");
        }
        saving.value = true;
        try {
          const stored = toStoredFormula(form.ruleContentTemplate.trim());
          const payload: Record<string, unknown> = {
            id: form.id || undefined,
            itemName: form.itemName.trim(),
            parentId: form.parentId || undefined,
            itemType: "COMPUTE_RULE",
            weightAllot: form.weightAllot,
            computeMetric: form.computeMetric,
            ruleContentTemplateEnabled: form.ruleContentTemplateEnabled,
            templateMetricVariables: stored.variables,
            ruleContentTemplate: form.ruleContentTemplateEnabled ? stored.formula : "",
            displayMetricsEnabled: form.displayMetricsEnabled,
            coefficients: form.coefficients.map((item) => ({
              greaterThan: item.min,
              lessThanOrEqual: item.max,
              scoreRatio: item.score,
            })),
          };
          const client = await getClient(props);
          if (form.id) {
            await client.updateRuleLibrary(payload);
          } else {
            await client.saveRuleLibrary(payload);
          }
          editorOpen.value = false;
          message.success("保存成功");
          await load();
        } catch (error) {
          message.error(error instanceof Error ? error.message : "保存失败");
        } finally {
          saving.value = false;
        }
      };
      const remove = async (record: RecordRow): Promise<void> => {
        const id = String(record.id ?? "");
        if (!id) {
          return;
        }
        try {
          await (await getClient(props)).deleteRuleLibrary(id);
          message.success("删除成功");
          await load();
        } catch (error) {
          message.error(error instanceof Error ? error.message : "删除失败");
        }
      };
      onMounted(() => void load());
      return () =>
        editorOpen.value ? (
          <PageLayout
            title={form.id ? "编辑规则" : "新增规则"}
            v-slots={{
              "layout-content": () => (
                <div class={styles.ruleEditor}>
                  <Form class={styles.ruleEditorForm} labelCol={{ span: 4 }} wrapperCol={{ span: 18 }}>
                    <FormItem label="规则名称" required>
                      <Input maxlength={20} showCount value={form.itemName} onUpdate:value={(value: string) => (form.itemName = value)} />
                    </FormItem>
                    <FormItem label="规则模版">
                      <Switch
                        checked={form.ruleContentTemplateEnabled}
                        onUpdate:checked={(value: unknown) => (form.ruleContentTemplateEnabled = value === true)}
                      />
                    </FormItem>
                    <FormItem label="规则内容" required={form.ruleContentTemplateEnabled}>
                      <div class={styles.ruleContentField}>
                        <Button type="primary" onClick={openMetricPicker}>
                          插入指标
                        </Button>
                        <Input.TextArea
                          rows={4}
                          maxlength={500}
                          showCount
                          disabled={!form.ruleContentTemplateEnabled}
                          value={form.ruleContentTemplate}
                          onUpdate:value={(value: string) => (form.ruleContentTemplate = value)}
                          onBlur={(event: Event) => {
                            const target = event.target as HTMLTextAreaElement;
                            ruleCursorPosition.value = target.selectionStart;
                          }}
                        />
                      </div>
                    </FormItem>
                    <FormItem label="展示指标">
                      <Switch
                        checked={form.displayMetricsEnabled}
                        onUpdate:checked={(value: unknown) => (form.displayMetricsEnabled = value === true)}
                      />
                    </FormItem>
                    <FormItem label="计分权重" required>
                      <InputNumber min={0} value={form.weightAllot} onUpdate:value={(value: unknown) => (form.weightAllot = num(value))} />
                    </FormItem>
                    <FormItem label="计分指标" required>
                      <Select
                        value={form.computeMetric || undefined}
                        placeholder="请选择规则计算接口"
                        options={metricOptions.value.map((item) => ({
                          label: text(item.name ?? item.metricName),
                          value: String(item.id ?? ""),
                        }))}
                        onUpdate:value={(value: unknown) => (form.computeMetric = String(value ?? ""))}
                      />
                    </FormItem>
                    <FormItem label="取分条件">
                      <Button type="primary" size="small" class={styles.conditionAddButton} onClick={addCondition}>
                        新增
                      </Button>
                      <Table
                        class={styles.conditionTable}
                        rowKey="key"
                        size="small"
                        pagination={false}
                        dataSource={form.coefficients}
                        columns={[
                          {
                            title: "最小值",
                            dataIndex: "min",
                            customRender: ({ record, index }: { record: ConditionItem; index: number }) =>
                              index === form.coefficients.length - 1 ? (
                                <Input disabled value="" />
                              ) : (
                                <Input
                                  value={record.min}
                                  disabled={index > 0}
                                  onUpdate:value={(value: string) => {
                                    record.min = value;
                                    if (index === 0 && form.coefficients[1]) {
                                      form.coefficients[1].max = value;
                                    }
                                  }}
                                />
                              ),
                          },
                          {
                            title: "最大值",
                            dataIndex: "max",
                            customRender: ({ record, index }: { record: ConditionItem; index: number }) =>
                              index === 0 ? (
                                <Input disabled value="" />
                              ) : (
                                <Input
                                  value={record.max}
                                  onUpdate:value={(value: string) => {
                                    record.max = value;
                                    if (form.coefficients[index - 1]) {
                                      form.coefficients[index - 1].min = value;
                                    }
                                  }}
                                />
                              ),
                          },
                          {
                            title: "得分系数",
                            dataIndex: "score",
                            customRender: ({ record }: { record: ConditionItem }) => (
                              <Input value={record.score} onUpdate:value={(value: string) => (record.score = value)} />
                            ),
                          },
                          {
                            title: "操作",
                            customRender: ({ index }: { index: number }) =>
                              index === 0 || index === form.coefficients.length - 1 ? null : (
                                <Button type="link" danger onClick={() => removeCondition(index)}>
                                  删除
                                </Button>
                              ),
                          },
                        ]}
                      />
                    </FormItem>
                  </Form>
                  <Modal
                    title="插入指标"
                    width={800}
                    open={metricPickerOpen.value}
                    onCancel={() => (metricPickerOpen.value = false)}
                    onUpdate:open={(value: boolean) => (metricPickerOpen.value = value)}
                  >
                    <div class={styles.metricPicker}>
                      <Input
                        allowClear
                        placeholder="请输入指标名称查询"
                        value={metricPickerKeyword.value}
                        onUpdate:value={(value: string) => (metricPickerKeyword.value = value)}
                      />
                      <div class={styles.metricPickerList}>
                        {visibleMetricOptions.value.map((metric) => (
                          <Button
                            key={String(metric.id ?? metric.name)}
                            type="default"
                            class={styles.metricPickerItem}
                            onClick={() => insertMetric(metric)}
                          >
                            {text(metric.name ?? metric.metricName)}
                          </Button>
                        ))}
                        {visibleMetricOptions.value.length === 0 ? <div class={styles.emptyText}>暂无匹配指标</div> : null}
                      </div>
                    </div>
                  </Modal>
                </div>
              ),
              "footer-btn": () => <Button onClick={() => (editorOpen.value = false)}>取消</Button>,
              "footer-page": () => (
                <Button type="primary" loading={saving.value} onClick={() => void save()}>
                  保存
                </Button>
              ),
            }}
          />
        ) : (
          <PageLayout
            title={props.title || "规则库"}
            v-slots={{
              "layout-header": () => (
                <Button type="primary" onClick={openAdd}>
                  新增
                </Button>
              ),
              "layout-content": () => (
                <div class={styles.content}>
                  <div class={styles.ruleLibraryBody}>
                    <div class={styles.ruleTreePane}>
                      <Input
                        value={treeKeyword.value}
                        allowClear
                        placeholder="输入应用名称/业务分类"
                        onUpdate:value={(value: string) => (treeKeyword.value = value)}
                      />
                      <Tree
                        treeData={visibleTreeNodes.value as never}
                        selectedKeys={[selectedKey.value]}
                        expandedKeys={expandedKeys.value}
                        onSelect={(keys: (string | number)[]) => syncRoute(String(keys[0] ?? "all"))}
                        onExpand={(keys: (string | number)[]) => (expandedKeys.value = keys.map(String))}
                        showLine={false}
                      />
                    </div>
                    <div class={styles.ruleTablePane}>
                      <Table
                        rowKey={(record: RecordRow) => String(record.id ?? JSON.stringify(record))}
                        loading={loading.value}
                        pagination={false}
                        dataSource={pageRows.value}
                        columns={[
                          dataColumn("规则名称", "itemName", 220, (value, record) => text(value ?? record.name)),
                          dataColumn("规则内容", "ruleContentTemplate", 420, (value, record) => renderFormula(value ?? record.content)),
                          dataColumn("计分权重", "weightAllot", 130, (value, record) => text(value ?? record.weight, "0")),
                          {
                            title: "取分条件",
                            width: 300,
                            customRender: ({ record }: { record: RecordRow }) =>
                              renderRuleConditions(record.coefficients, text(record.itemName ?? record.name, "规则")),
                          },
                          {
                            title: "操作",
                            width: 140,
                            fixed: "right",
                            customRender: ({ record }: { record: RecordRow }) => (
                              <span>
                                <Button type="link" size="small" onClick={() => openEdit(record)}>
                                  编辑
                                </Button>
                                <Popconfirm title="确定要删除这条规则吗?" onConfirm={() => void remove(record)}>
                                  <Button type="link" danger size="small">
                                    删除
                                  </Button>
                                </Popconfirm>
                              </span>
                            ),
                          },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              ),
              "footer-page": () => (
                <Page
                  current={pageNumber.value}
                  pageSize={pageSize.value}
                  total={selectedRows.value.length}
                  onPageChange={(page: number, size: number) => {
                    pageNumber.value = page;
                    pageSize.value = size;
                    syncRoute(selectedKey.value, false);
                  }}
                />
              ),
            }}
          />
        );
    },
  });
}

export const RuleLibraryPage = createRuleBasePage();

interface BusinessForm {
  id: string;
  parentId: string;
  itemName: string;
  itemCode: string;
  weightAllot: number;
  itemType: "APPLICATION" | "GROUP";
}

const SAFETY_APPLICATION_OPTIONS = [
  { code: "SECURITY_MONITORING", name: "安防监控" },
  { code: "ELECTRICMANAGE", name: "电气安全" },
  { code: "FIRECONTROL", name: "消防安全" },
  { code: "ROTATINGMANAGE", name: "动环安全" },
  { code: "ELECTRlC_VEHICLE", name: "电动车安全" },
  { code: "SMALLENFINEERING", name: "小散工程" },
  { code: "INSPECTION", name: "日常巡检" },
  { code: "ELECTRONIC_PATROL", name: "电子巡更" },
  { code: "HIDDENDANGER", name: "隐患整改" },
  { code: "FAULT", name: "故障报修" },
];

function businessClassificationRows(items: RecordRow[]): RecordRow[] {
  const rows: RecordRow[] = [];
  for (const application of items) {
    const applicationName = text(application.itemName ?? application.name, "");
    const applicationPath = applicationName;
    rows.push({ ...application, displayPath: applicationPath, itemType: "APPLICATION" });
    for (const child of asRows(application.children ?? application.subItems)) {
      rows.push({ ...child, displayPath: `${applicationPath} / ${text(child.itemName ?? child.name, "")}`, itemType: "GROUP" });
    }
  }
  return rows;
}

function createBusinessClassificationPage(): Component {
  return defineComponent({
    name: "SafetyManagementBusinessClassificationPage",
    props: pageProps,
    setup(props) {
      const rows = ref<RecordRow[]>([]);
      const loading = ref(false);
      const saving = ref(false);
      const editorOpen = ref(false);
      const editorKind = ref<BusinessForm["itemType"]>("APPLICATION");
      const keyword = ref("");
      const form = reactive<BusinessForm>({ id: "", parentId: "", itemName: "", itemCode: "", weightAllot: 0, itemType: "APPLICATION" });
      const applications = computed(() => rows.value.filter((item) => String(item.itemType ?? "") === "APPLICATION"));
      const filteredRows = computed(() => {
        const key = keyword.value.trim().toLowerCase();
        return key
          ? rows.value.filter((item) =>
              text(item.displayPath ?? item.itemName, "")
                .toLowerCase()
                .includes(key),
            )
          : rows.value;
      });
      const load = async (): Promise<void> => {
        loading.value = true;
        try {
          rows.value = businessClassificationRows(asRows(await (await getClient(props)).listRuleLibraries()));
        } catch (error) {
          rows.value = [];
          message.error(error instanceof Error ? error.message : "业务分类加载失败");
        } finally {
          loading.value = false;
        }
      };
      const open = (kind: BusinessForm["itemType"], record?: RecordRow): void => {
        editorKind.value = kind;
        const isNew = !record || (kind === "GROUP" && String(record.itemType ?? "") === "APPLICATION");
        form.id = isNew ? "" : String(record?.id ?? "");
        form.parentId = kind === "GROUP" ? String(isNew ? (record?.id ?? "") : (record?.parentId ?? "")) : "";
        form.itemName = isNew ? "" : text(record?.itemName ?? record?.name, "");
        form.itemCode = isNew ? "" : text(record?.itemCode ?? record?.code, "");
        form.weightAllot = isNew ? 0 : num(record?.weightAllot ?? record?.weight);
        form.itemType = kind;
        editorOpen.value = true;
      };
      const save = async (): Promise<void> => {
        if (!form.itemName.trim()) {
          message.warning(editorKind.value === "APPLICATION" ? "请输入应用名称" : "请输入业务分类名称");
          return;
        }
        if (editorKind.value === "GROUP" && !form.parentId) {
          message.warning("请选择应用");
          return;
        }
        saving.value = true;
        try {
          const payload = {
            id: form.id || undefined,
            parentId: form.parentId || undefined,
            itemName: form.itemName.trim(),
            itemCode: form.itemCode || undefined,
            weightAllot: form.weightAllot,
            itemType: form.itemType,
          };
          const client = await getClient(props);
          if (form.id) {
            await client.updateRuleLibrary(payload);
          } else {
            await client.saveRuleLibrary(payload);
          }
          editorOpen.value = false;
          message.success("保存成功");
          await load();
        } catch (error) {
          message.error(error instanceof Error ? error.message : "保存失败");
        } finally {
          saving.value = false;
        }
      };
      const remove = async (record: RecordRow): Promise<void> => {
        const id = String(record.id ?? "");
        if (!id) {
          return;
        }
        try {
          await (await getClient(props)).deleteRuleLibrary(id);
          message.success("删除成功");
          await load();
        } catch (error) {
          message.error(error instanceof Error ? error.message : "删除失败");
        }
      };
      onMounted(() => void load());
      const formula = "业务权重 / (当前节点所有兄弟节点权重之和 * 100 ) * 100";
      return () => (
        <PageLayout
          title={props.title || "业务分类"}
          v-slots={{
            "layout-header": () => (
              <Button type="primary" onClick={() => open("APPLICATION")}>
                新增应用
              </Button>
            ),
            "layout-content": () => (
              <div class={styles.content}>
                <Form layout="inline" class={styles.toolbar}>
                  <FormItem>
                    <Input
                      value={keyword.value}
                      allowClear
                      placeholder="请输入应用名称/业务分类"
                      onUpdate:value={(value: string) => (keyword.value = value)}
                    />
                  </FormItem>
                  <FormItem>
                    <Button type="primary" onClick={() => void load()}>
                      查询
                    </Button>
                    <Button
                      onClick={() => {
                        keyword.value = "";
                        void load();
                      }}
                    >
                      重置
                    </Button>
                  </FormItem>
                </Form>
                <div class={styles.tableWrap}>
                  <Table
                    rowKey={(record: RecordRow) => String(record.id ?? record.itemName)}
                    loading={loading.value}
                    pagination={false}
                    dataSource={filteredRows.value}
                    columns={[
                      dataColumn("应用名称", "applicationName", 250, (_value, record) =>
                        String(record.itemType ?? "") === "APPLICATION" ? text(record.itemName ?? record.name) : "--",
                      ),
                      dataColumn("业务分类", "businessName", 260, (_value, record) =>
                        String(record.itemType ?? "") === "APPLICATION" ? "--" : text(record.itemName),
                      ),
                      dataColumn("计分权重", "weightAllot", 150, (value, record) => text(value ?? record.weight)),
                      dataColumn("计分公式", "formula", 360, () => formula),
                      {
                        title: "操作",
                        width: 240,
                        fixed: "right",
                        customRender: ({ record }: { record: RecordRow }) => (
                          <span>
                            {String(record.itemType ?? "") === "APPLICATION" ? (
                              <Button type="link" size="small" onClick={() => open("GROUP", record)}>
                                新增下级
                              </Button>
                            ) : null}
                            <Button
                              type="link"
                              size="small"
                              onClick={() => open(String(record.itemType ?? "GROUP") === "APPLICATION" ? "APPLICATION" : "GROUP", record)}
                            >
                              编辑
                            </Button>
                            <Popconfirm title="确定删除该条记录吗？" onConfirm={() => void remove(record)}>
                              <Button type="link" danger size="small">
                                删除
                              </Button>
                            </Popconfirm>
                          </span>
                        ),
                      },
                    ]}
                  />
                </div>
                <Modal
                  title={
                    form.id
                      ? editorKind.value === "APPLICATION"
                        ? "编辑应用"
                        : "编辑业务分类"
                      : editorKind.value === "APPLICATION"
                        ? "添加应用"
                        : "添加业务分类"
                  }
                  open={editorOpen.value}
                  width={560}
                  confirmLoading={saving.value}
                  onOk={() => void save()}
                  onCancel={() => (editorOpen.value = false)}
                  onUpdate:open={(value: boolean) => (editorOpen.value = value)}
                >
                  <Form class={styles.businessClassificationForm} labelCol={{ span: 5 }} wrapperCol={{ span: 17 }}>
                    {editorKind.value === "GROUP" ? (
                      <FormItem label="应用" required>
                        <Select
                          value={form.parentId || undefined}
                          placeholder="请选择"
                          options={applications.value.map((item) => ({
                            label: text(item.itemName ?? item.name),
                            value: String(item.id ?? ""),
                          }))}
                          onUpdate:value={(value: unknown) => (form.parentId = String(value ?? ""))}
                        />
                      </FormItem>
                    ) : null}
                    {editorKind.value === "APPLICATION" ? (
                      <FormItem label="应用名称" required>
                        <Select
                          value={form.itemCode || undefined}
                          placeholder="请选择"
                          options={SAFETY_APPLICATION_OPTIONS.map((option) => ({ label: option.name, value: option.code }))}
                          onUpdate:value={(value: unknown) => {
                            form.itemCode = String(value ?? "");
                            form.itemName = SAFETY_APPLICATION_OPTIONS.find((option) => option.code === form.itemCode)?.name ?? "";
                          }}
                        />
                      </FormItem>
                    ) : (
                      <FormItem label="业务分类" required>
                        <Input maxlength={20} showCount value={form.itemName} onUpdate:value={(value: string) => (form.itemName = value)} />
                      </FormItem>
                    )}
                    <FormItem label="计分权重" required>
                      <InputNumber
                        min={0}
                        max={100}
                        value={form.weightAllot}
                        onUpdate:value={(value: unknown) => (form.weightAllot = num(value))}
                      />
                    </FormItem>
                    <FormItem label="计分公式">
                      <Input value={formula} disabled />
                    </FormItem>
                  </Form>
                </Modal>
              </div>
            ),
          }}
        />
      );
    },
  });
}

export const BusinessClassificationPage = createBusinessClassificationPage();

const AUTHORIZATION_SCOPES = [
  { code: "alarm_manage", label: "安全报警:" },
  { code: "device_manage", label: "设备管理:" },
  { code: "inspect_manage", label: "巡检管理:" },
  { code: "electronlc_patrol", label: "电子巡更:" },
  { code: "hidden_danger", label: "隐患排查:" },
  { code: "risk_source", label: "风险源管理:" },
  { code: "loose_work", label: "小散工程:" },
  { code: "safety_education", label: "安全教育:" },
  { code: "emergency_files", label: "预案文件:" },
  { code: "safety_vmoniotr", label: "安防监控:" },
];

function authorizationScopeCodes(value: RecordRow): Set<string> {
  const candidates = [value.scopeCodes, value.scopes, value.scopeList, value.authorities];
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      return new Set(
        candidate
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      );
    }
    if (Array.isArray(candidate)) {
      return new Set(
        candidate
          .map((item) =>
            typeof item === "object" && item !== null
              ? String((item as RecordRow).scopeCode ?? (item as RecordRow).code ?? "")
              : String(item),
          )
          .map((item) => item.trim())
          .filter(Boolean),
      );
    }
  }
  return new Set();
}

function currentEnterpriseName(): string {
  try {
    const raw = globalThis.sessionStorage?.getItem("GH-NowEnterprise");
    if (!raw) {
      return "";
    }
    const enterprise = JSON.parse(raw) as Record<string, unknown>;
    return text(enterprise.name ?? enterprise.tenantName ?? enterprise.enterpriseName, "");
  } catch {
    return "";
  }
}

async function copyAuthorizationValue(value: string): Promise<void> {
  if (!value) {
    return;
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    } else {
      const input = document.createElement("input");
      input.value = value;
      input.setAttribute("readonly", "true");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.append(input);
      input.select();
      if (!document.execCommand("copy")) {
        throw new Error("copy failed");
      }
      input.remove();
    }
    message.success("复制成功");
  } catch {
    message.warning("当前浏览器不支持自动复制，请手动复制");
  }
}

export const MarketAuthorizationPage = defineComponent({
  name: "SafetyManagementMarketAuthorizationPage",
  props: pageProps,
  setup(props) {
    const authorization = ref<RecordRow>({});
    const loading = ref(false);
    const scopeCodes = computed(() => authorizationScopeCodes(authorization.value));
    const enterpriseName = currentEnterpriseName();
    const clientCode = computed(() => text(authorization.value.code ?? authorization.value.clientCode, ""));
    const clientSecret = computed(() =>
      text(authorization.value.secretPlain ?? authorization.value.clientSecret ?? authorization.value.secret, ""),
    );
    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        authorization.value = asRecord(await (await getClient(props)).getMarketClientAuthorization());
      } catch (error) {
        authorization.value = {};
        message.error(error instanceof Error ? error.message : "授权信息加载失败");
      } finally {
        loading.value = false;
      }
    };
    const generate = async (): Promise<void> => {
      loading.value = true;
      try {
        authorization.value = asRecord(await (await getClient(props)).generateMarketClientAuthorization());
        message.success("生成成功");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "授权凭据生成失败");
      } finally {
        loading.value = false;
      }
    };
    const setScope = async (scopeCode: string, checked: boolean): Promise<void> => {
      const code = clientCode.value;
      if (!code) {
        message.success("请生成授权信息");
        return;
      }
      loading.value = true;
      try {
        const client = await getClient(props);
        if (checked) {
          await client.grantMarketClientScope(code, scopeCode);
        } else {
          await client.revokeMarketClientScope(code, scopeCode);
        }
        await load();
        message.success("操作成功");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "授权范围更新失败");
      } finally {
        loading.value = false;
      }
    };
    onMounted(() => void load());
    return () => (
      <PageLayout
        title={props.title || "授权管理"}
        showFooter={false}
        v-slots={{
          "layout-content": () => (
            <div class={styles.authorizationPage}>
              <Spin spinning={loading.value}>
                <div class={styles.authorizationTitle}>授权信息</div>
                <div class={styles.authorizationBasic}>
                  <FormItem label="市场名称:">
                    <span>{enterpriseName}</span>
                    <Button type="primary" size="small" loading={loading.value} onClick={() => void generate()}>
                      生成授权信息
                    </Button>
                  </FormItem>
                </div>
                <div class={styles.authorizationBasic}>
                  <FormItem label="appid:">
                    <span>{clientCode.value}</span>
                    <Button type="link" size="small" onClick={() => void copyAuthorizationValue(clientCode.value)}>
                      复制
                    </Button>
                  </FormItem>
                  <FormItem label="key">
                    <span>{clientSecret.value}</span>
                    <Button type="link" size="small" onClick={() => void copyAuthorizationValue(clientSecret.value)}>
                      复制
                    </Button>
                  </FormItem>
                </div>
                <div class={styles.authorizationTitle}>数据授权</div>
                <div class={styles.authorizationGrid}>
                  {AUTHORIZATION_SCOPES.map((scope) => (
                    <div class={styles.authorizationItem} key={scope.code}>
                      <span>{scope.label}</span>
                      <Switch
                        disabled={!clientCode.value}
                        checked={scopeCodes.value.has(scope.code)}
                        onUpdate:checked={(value: unknown) => void setScope(scope.code, value === true)}
                      />
                    </div>
                  ))}
                </div>
              </Spin>
            </div>
          ),
        }}
      />
    );
  },
});

export const ReportViewerPage = defineComponent({
  name: "SafetyManagementReportViewerPage",
  props: pageProps,
  setup(props) {
    const router = useRouter();
    const report = ref<RecordRow>({});
    const attachment = ref<RecordRow>({});
    const marketReport = ref<RecordRow>({});
    const reportSheets = ref<{ name: string; rows: unknown[][] }[]>([]);
    const spreadsheetSheets = ref<RecordRow[]>([]);
    const spreadsheetReady = ref(false);
    const spreadsheetId = `safety-report-sheet-${Math.random().toString(36).slice(2)}`;
    const editableRows = ref<unknown[][]>([]);
    const loading = ref(false);
    const saving = ref(false);
    const downloading = ref(false);
    const analysisReportElement = ref<HTMLElement>();
    const viewerQuery = computed(() => router.currentRoute.value.query);
    const viewerTitle = computed(() => text(viewerQuery.value.title, props.title || "报告预览"));
    const isMarketEditable = computed(
      () => String(viewerQuery.value.type ?? "") === "market" && String(viewerQuery.value.readonly ?? "") !== "true",
    );
    const analysisItems = computed(() => asRows(report.value.items));
    const analysisLeaves = computed(() => {
      const leaves: RecordRow[] = [];
      const visit = (items: RecordRow[]): void => {
        for (const item of items) {
          const children = asRows(item.subTopicCalculateScores);
          if (children.length > 0) visit(children);
          else leaves.push(item);
        }
      };
      visit(analysisItems.value);
      return leaves;
    });
    const analysisIssueCount = computed(() => analysisLeaves.value.filter((item) => num(item.score) < 80).length);
    const scoreColor = (score: number): string => (score < 60 ? "#f5222d" : score < 80 ? "#faad14" : "#3fbe53");
    const analysisDescription = (item: RecordRow): string => {
      const template = text(item.contentTemplate, "");
      const variables = asRecord(item.contentVariables);
      if (!template) return text(item.suggestion, "");
      return template.replace(/\[([^\]]+)\]/gu, (match, key: string) => {
        const value = variables[key];
        if (value === undefined || value === null) return match;
        if (Array.isArray(value)) {
          return value
            .map((entry) => {
              const record = asRecord(entry);
              const name = text(record.name ?? record.marketName, "");
              const values = [
                record.num === undefined ? "" : `${text(record.num)}个`,
                record.rate === undefined ? "" : `${text(record.rate)}%`,
                record.avgTime === undefined ? "" : `${text(record.avgTime)}分`,
              ].filter(Boolean);
              return `${name}${values.length ? `（${values.join("，")}）` : ""}`;
            })
            .join("、");
        }
        if (typeof value === "object") {
          const record = asRecord(value);
          return text(record.rate ?? record.num ?? record.value, JSON.stringify(value));
        }
        return text(value);
      });
    };
    const renderAnalysisLeaf = (item: RecordRow): JSX.Element => {
      const score = num(item.score);
      return (
        <div class={styles.analysisReportLeaf}>
          <div class={styles.analysisReportLeafMain}>
            <strong>{text(item.topicName, "--")}</strong>
            {analysisDescription(item) ? <div class={styles.analysisReportDescription}>{analysisDescription(item)}</div> : null}
            {text(item.suggestion, "") ? <div class={styles.analysisReportSuggestion}>AI建议：{text(item.suggestion, "")}</div> : null}
          </div>
          <div class={styles.analysisReportScore} style={{ color: scoreColor(score) }}>
            {score} <small>分</small>
          </div>
        </div>
      );
    };
    const renderAnalysisItem = (item: RecordRow, index: number): JSX.Element => {
      const score = num(item.score);
      const children = asRows(item.subTopicCalculateScores);
      return (
        <details class={styles.analysisReportSection} open key={`${text(item.topic, String(index))}-${index}`}>
          <summary>
            <span class={styles.analysisReportSectionTitle}>
              <i />
              {text(item.topicName, "--")}
            </span>
            <span class={styles.analysisReportScore} style={{ color: scoreColor(score) }}>
              {score} <small>分</small>
            </span>
          </summary>
          <div class={styles.analysisReportSectionBody}>
            {children.map((child, childIndex) => {
              const grandchildren = asRows(child.subTopicCalculateScores);
              return grandchildren.length > 0 ? (
                <details class={styles.analysisReportGroup} open key={`${text(child.topic, String(childIndex))}-${childIndex}`}>
                  <summary>
                    <strong>{text(child.topicName, "--")}</strong>
                    <span class={styles.analysisReportScore} style={{ color: scoreColor(num(child.score)) }}>
                      {num(child.score)} <small>分</small>
                    </span>
                  </summary>
                  <div>{grandchildren.map(renderAnalysisLeaf)}</div>
                </details>
              ) : (
                renderAnalysisLeaf(child)
              );
            })}
          </div>
        </details>
      );
    };
    const downloadAnalysisReport = async (): Promise<void> => {
      if (!analysisReportElement.value) return;
      downloading.value = true;
      try {
        await downloadPDF(analysisReportElement.value, text(report.value.name, "安全生产情况报告"));
      } catch (error) {
        message.error(error instanceof Error ? error.message : "报告下载失败");
      } finally {
        downloading.value = false;
      }
    };
    const tableRows = computed(() =>
      editableRows.value.map((row, index) => ({
        key: String(index),
        rowIndex: index,
        row,
      })),
    );
    const columnLabel = (index: number): string => {
      let value = index + 1;
      let label = "";
      while (value > 0) {
        const remainder = (value - 1) % 26;
        label = String.fromCodePoint(65 + remainder) + label;
        value = Math.floor((value - 1) / 26);
      }
      return label;
    };
    const cellValue = (value: unknown): string => text(asRecord(value).m ?? asRecord(value).v ?? value, "");
    const reportTableColumns = (
      sourceRows: unknown[][],
      editable: boolean,
      update: (rowIndex: number, columnIndex: number, value: string) => void,
    ): RecordRow[] => {
      const columnCount = Math.max(1, ...sourceRows.map((row) => row.length));
      return Array.from({ length: columnCount }, (_, index) => ({
        title: columnLabel(index),
        dataIndex: String(index),
        width: 180,
        customRender: ({ record }: { record: { row: unknown[]; rowIndex: number } }) => {
          const value = cellValue(record.row[index]);
          return editable ? (
            <Input
              size="small"
              value={value}
              onUpdate:value={(next: string) => {
                update(record.rowIndex, index, next);
              }}
            />
          ) : (
            <span>{value || "--"}</span>
          );
        },
      }));
    };
    const editableReportColumns = computed(() =>
      reportTableColumns(editableRows.value, true, (rowIndex, columnIndex, value) => {
        const nextRow = [...(editableRows.value[rowIndex] ?? [])];
        nextRow[columnIndex] = value;
        editableRows.value[rowIndex] = nextRow;
      }),
    );
    const downloadBlob = (blob: Blob, name: string): void => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    };
    const downloadAttachment = async (file: RecordRow): Promise<void> => {
      const path = text(file.path ?? file.url, "");
      if (!path) {
        throw new Error("报告附件不存在");
      }
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`报告附件下载失败（${response.status}）`);
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = text(file.name, "安全报告附件");
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    };
    const renderSpreadsheet = async (sheets: RecordRow[]): Promise<void> => {
      if (sheets.length === 0) {
        return;
      }
      await nextTick();
      const luckysheet = await loadLuckysheet();
      luckysheet.destroy?.();
      luckysheet.create({
        container: spreadsheetId,
        lang: "zh",
        showinfobar: false,
        showtoolbar: false,
        showsheetbar: sheets.length > 1,
        sheetFormulaBar: true,
        allowEdit: isMarketEditable.value,
        enableAddRow: false,
        enableAddBackTop: false,
        data: sheets,
        title: viewerTitle.value,
        cellRightClickConfig: {
          copy: false,
          copyAs: false,
          paste: isMarketEditable.value,
          insertRow: false,
          insertColumn: false,
          deleteRow: false,
          deleteColumn: false,
          deleteCell: false,
          hideRow: false,
          hideColumn: false,
          rowHeight: false,
          columnWidth: false,
          clear: false,
          matrix: false,
          sort: false,
          filter: false,
          chart: false,
          image: false,
          link: false,
          data: false,
          cellFormat: false,
        },
      });
      spreadsheetReady.value = true;
    };
    const load = async (): Promise<void> => {
      const query = viewerQuery.value;
      const id = String(query.id ?? query.requestId ?? "");
      const fileId = String(query.fileId ?? "");
      if (!id) {
        return;
      }
      loading.value = true;
      try {
        if (fileId) {
          const file = fileRecord(await getFileClient(props).then((client) => client.getFileInfo(fileId)));
          attachment.value = file;
          if (query.download === "true") {
            await downloadAttachment(file);
          }
        } else if (query.type === "market") {
          const value = asRecord(await (await getClient(props)).getMarketMonthlyReport(id, query.from === "market"));
          marketReport.value = value;
          const sheet = createReportSheet(value.reportData, viewerTitle.value, query.monthDate, "market");
          const rows = parseReportRows(sheet);
          editableRows.value = rows;
          reportSheets.value = [{ name: viewerTitle.value, rows }];
          spreadsheetSheets.value = [sheet];
          spreadsheetReady.value = false;
          try {
            await renderSpreadsheet(spreadsheetSheets.value);
          } catch (error) {
            message.error(error instanceof Error ? error.message : "电子表格加载失败");
          }
          if (query.download === "true") {
            downloadBlob(await createXlsxWorkbook(reportSheets.value), `${viewerTitle.value}.xlsx`);
          }
        } else if (query.type === "head") {
          const client = await getClient(props);
          const values = await client.listReportedMarketReportsByHeadReport(id);
          const marketReports = values
            .map((item) => asRecord(item))
            .filter((value) => Boolean(parseSpreadsheetSheet(value.reportData) || parseReportRows(value.reportData).length));
          const summary = { name: "汇总", rows: summaryRows(viewerTitle.value, {}, marketReports) };
          reportSheets.value = [
            summary,
            ...marketReports.map((value, index) => ({
              name: worksheetName(value.marketName ?? value.title, index),
              rows: parseReportRows(value.reportData),
            })),
          ];
          spreadsheetSheets.value = [
            createReportSheet(undefined, "汇总", query.monthDate, "summary", viewerTitle.value),
            ...marketReports.map((value, index) =>
              createReportSheet(value.reportData, worksheetName(value.marketName ?? value.title, index), query.monthDate, "market"),
            ),
          ];
          spreadsheetReady.value = false;
          try {
            await renderSpreadsheet(spreadsheetSheets.value);
          } catch (error) {
            message.error(error instanceof Error ? error.message : "电子表格加载失败");
          }
          if (query.download === "true") {
            if (reportSheets.value.length === 0) {
              throw new Error("当前月报没有可导出的已上报市场数据");
            }
            downloadBlob(await createXlsxWorkbook(reportSheets.value), `${viewerTitle.value}.xlsx`);
          }
        } else {
          report.value = asRecord(await (await getClient(props)).getMetricReport(id));
        }
      } catch (error) {
        report.value = {};
        attachment.value = {};
        marketReport.value = {};
        reportSheets.value = [];
        spreadsheetSheets.value = [];
        spreadsheetReady.value = false;
        editableRows.value = [];
        message.error(error instanceof Error ? error.message : "报告加载失败");
      } finally {
        loading.value = false;
      }
    };
    const saveMarketReport = async (): Promise<void> => {
      const id = String(viewerQuery.value.id ?? "");
      if (!id || !isMarketEditable.value) {
        return;
      }
      saving.value = true;
      try {
        const source = Object.keys(marketReport.value).length > 0 ? marketReport.value : {};
        const [sheet] = (await loadLuckysheet()).getAllSheets();
        await (await getClient(props)).saveMarketMonthlyReport(id, { ...source, reportData: sheet }, viewerQuery.value.from === "market");
        marketReport.value = { ...marketReport.value, reportData: sheet };
        message.success("保存成功");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "保存失败");
      } finally {
        saving.value = false;
      }
    };
    onMounted(() => void load());
    return () => {
      if (!viewerQuery.value.type) {
        const score = num(report.value.score);
        return (
          <PageLayout
            title={text(report.value.name, props.title || "报告详情")}
            v-slots={{
              "layout-content": () => (
                <Spin spinning={loading.value}>
                  <div ref={analysisReportElement} class={styles.analysisReport}>
                    <div class={styles.analysisReportHero}>
                      <div class={styles.analysisReportRadar}>
                        <span />
                      </div>
                      <div class={styles.analysisReportSummary}>
                        <div class={styles.analysisReportHeadline}>
                          共分析{analysisLeaves.value.length}项,发现<strong>{analysisIssueCount.value}</strong>项问题，分析得分
                          <strong style={{ color: scoreColor(score) }}>{score}</strong>分
                        </div>
                        {text(report.value.suggestion, "") ? (
                          <div class={styles.analysisReportAdvice}>AI建议：{text(report.value.suggestion, "")}</div>
                        ) : null}
                        <div class={styles.analysisReportMeta}>
                          分析范围: {formatDate(report.value.beginTime).slice(0, 10)} - {formatDate(report.value.endTime).slice(0, 10)}
                          <span>分析时间: {formatDate(report.value.createTime)}</span>
                        </div>
                      </div>
                      <Button
                        type="primary"
                        class={styles.analysisReportDownload}
                        loading={downloading.value}
                        onClick={() => void downloadAnalysisReport()}
                      >
                        下载报告
                      </Button>
                    </div>
                    <div class={styles.analysisReportList}>{analysisItems.value.map(renderAnalysisItem)}</div>
                  </div>
                </Spin>
              ),
              "footer-page": () => <Button onClick={() => router.back()}>返回</Button>,
            }}
          />
        );
      }
      return (
        <div class={styles.reportViewer}>
          {isMarketEditable.value ? (
            <div class={styles.reportViewerActions}>
              <Button type="primary" loading={saving.value} onClick={() => void saveMarketReport()}>
                保存
              </Button>
            </div>
          ) : null}
          <div class={styles.reportViewerBody}>
            <Spin spinning={loading.value} class={styles.reportViewerSpin}>
              <div class={styles.reportViewerContent}>
                <div id={spreadsheetId} class={styles.spreadsheet} style={{ display: spreadsheetReady.value ? "block" : "none" }} />
                {!spreadsheetReady.value && reportSheets.value.length > 0 ? (
                  <div>
                    {reportSheets.value.map((sheet) => (
                      <div class={styles.panel} key={sheet.name} style={{ marginBottom: "16px" }}>
                        <div class={styles.panelTitle}>{sheet.name}</div>
                        <Table
                          rowKey="key"
                          pagination={false}
                          size="small"
                          scroll={{ x: 900 }}
                          columns={isMarketEditable.value ? editableReportColumns.value : reportTableColumns(sheet.rows, false, () => {})}
                          dataSource={
                            isMarketEditable.value
                              ? tableRows.value
                              : sheet.rows.map((row, rowIndex) => ({ key: `${sheet.name}-${rowIndex}`, row, rowIndex }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
                {!spreadsheetReady.value && reportSheets.value.length === 0 && Object.keys(report.value).length > 0 ? (
                  <Table
                    rowKey="key"
                    pagination={false}
                    columns={[
                      { title: "字段", dataIndex: "key", width: 280 },
                      { title: "内容", dataIndex: "value", ellipsis: true },
                    ]}
                    dataSource={Object.entries(report.value).map(([key, value]) => ({
                      key,
                      value: typeof value === "object" ? JSON.stringify(value) : text(value),
                    }))}
                  />
                ) : null}
                {!spreadsheetReady.value &&
                reportSheets.value.length === 0 &&
                Object.keys(report.value).length === 0 &&
                Object.keys(marketReport.value).length > 0 ? (
                  <div class={styles.panel}>
                    <div class={styles.panelTitle}>{viewerTitle.value}</div>
                    <div class={styles.emptyText}>当前报表没有可展示的数据。</div>
                  </div>
                ) : null}
                {!spreadsheetReady.value &&
                reportSheets.value.length === 0 &&
                Object.keys(report.value).length === 0 &&
                Object.keys(marketReport.value).length === 0 &&
                Object.keys(attachment.value).length > 0 ? (
                  <div class={styles.panel}>
                    <div class={styles.panelTitle}>{text(attachment.value.name, "安全报告附件")}</div>
                    <div class={styles.noticeHint}>报告附件已加载，可打开原文件进行预览。</div>
                    <Button
                      type="primary"
                      style={{ marginTop: "16px" }}
                      onClick={() => {
                        const path = text(attachment.value.path ?? attachment.value.url, "");
                        if (path) {
                          window.open(path, "_blank", "noopener,noreferrer");
                        }
                      }}
                    >
                      打开附件
                    </Button>
                  </div>
                ) : null}
                {!spreadsheetReady.value &&
                reportSheets.value.length === 0 &&
                Object.keys(report.value).length === 0 &&
                Object.keys(marketReport.value).length === 0 &&
                Object.keys(attachment.value).length === 0 ? (
                  <div class={styles.emptyText}>请从报告记录中选择一条报告查看。</div>
                ) : null}
              </div>
            </Spin>
          </div>
        </div>
      );
    };
  },
});
