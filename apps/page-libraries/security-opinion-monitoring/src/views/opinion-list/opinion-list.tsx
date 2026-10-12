import type { OpinionVO, PushStatus, Sentiment, SourceVO, WarningLevel } from "@g2-contract/security-opinion";
import {
  AntModal,
  Button,
  DateRangePicker,
  Empty,
  Form,
  FormItem,
  Input,
  Modal,
  Select,
  SelectOption,
  Space,
  Table,
  Tag,
  Tooltip,
  message,
} from "@g2-platform/pc-ui";
/** @jsxImportSource vue */
import dayjs from "dayjs";
import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { securityOpinionApi } from "../../api/security-opinion";
import { GPagination } from "../../components/common/pagination";
import { PageShell } from "../../components/page-shell/page-shell";
import { SentimentTag } from "../../components/sentiment-tag/sentiment-tag";
import {
  PUSH_STATUS_COLOR,
  PUSH_STATUS_LABEL,
  PUSH_STATUS_OPTIONS,
  SENTIMENT_OPTIONS,
  TABLE_PAGE_SIZE,
  WARNING_LEVEL_COLOR,
  WARNING_LEVEL_LABEL,
  WARNING_LEVEL_OPTIONS,
} from "../../constants";
import { downloadBlob } from "../../utils/download-blob";
import { formatDateTime } from "../../utils/format-datetime";
import { usePageName } from "../../utils/page-name";

import styles from "./opinion-list.module.css";

const OPINION_TABLE_SCROLL_X = 1392;

export const OpinionListPage = defineComponent({
  setup() {
    const { pageTitle } = usePageName();
    const router = useRouter();
    const records = ref<OpinionVO[]>([]);
    const total = ref(0);
    const pageNumber = ref(1);
    const pageSize = ref(TABLE_PAGE_SIZE);
    const loading = ref(false);
    const sourceOptions = ref<SourceVO[]>([]);
    const detailVisible = ref(false);
    const detailItem = ref<OpinionVO | null>(null);
    const selectedRowKeys = ref<string[]>([]);
    const batchDeleteLoading = ref(false);

    const filters = reactive({
      keyword: "",
      source: "",
      sentiment: "" as Sentiment | "",
      warningLevel: "" as WarningLevel | "",
      pushStatus: "" as PushStatus | "",
      timeRange: undefined as string[] | undefined,
    });

    const fetchSources = async (): Promise<void> => {
      sourceOptions.value = await securityOpinionApi.listSources();
    };

    const fetchList = async (): Promise<void> => {
      loading.value = true;
      try {
        const [timeStart, timeEnd] = filters.timeRange ?? [];
        const result = await securityOpinionApi.pageOpinions({
          pageNumber: pageNumber.value,
          pageSize: pageSize.value,
          keyword: filters.keyword.trim() || undefined,
          source: filters.source || undefined,
          sentiment: filters.sentiment || undefined,
          warningLevel: filters.warningLevel || undefined,
          pushStatus: filters.pushStatus || undefined,
          timeStart: timeStart || undefined,
          timeEnd: timeEnd || undefined,
        });
        records.value = result.records;
        total.value = result.total;
      } finally {
        loading.value = false;
      }
    };

    const onSearch = (): void => {
      pageNumber.value = 1;
      selectedRowKeys.value = [];
      void fetchList();
    };

    const onReset = (): void => {
      filters.keyword = "";
      filters.source = "";
      filters.sentiment = "";
      filters.warningLevel = "";
      filters.pushStatus = "";
      filters.timeRange = undefined;
      pageNumber.value = 1;
      selectedRowKeys.value = [];
      void fetchList();
    };

    const onPageChange = (page: number, size: number): void => {
      pageNumber.value = page;
      pageSize.value = size;
      selectedRowKeys.value = [];
      void fetchList();
    };

    const showDetail = async (record: OpinionVO): Promise<void> => {
      detailItem.value = record;
      detailVisible.value = true;
      try {
        const detail = await securityOpinionApi.getOpinion(record.id);
        detailItem.value = { ...record, ...detail };
      } catch {
        message.warning("详情数据加载失败，已展示列表中的现有信息");
      }
    };

    const goAlertEvent = (record: OpinionVO): void => {
      void router.push({
        path: "/d/security-opinion-monitoring/alerts",
        query: {
          opinionId: record.id,
          eventId: record.relatedEventId,
        },
      });
    };

    const handleBatchDelete = (): void => {
      if (selectedRowKeys.value.length === 0) {
        message.warning("请先选择要删除的数据");
        return;
      }

      AntModal.confirm({
        centered: true,
        title: "批量删除",
        content: `确定删除选中的 ${selectedRowKeys.value.length} 条舆情数据？删除后将移入回收站。`,
        okText: "确定",
        cancelText: "取消",
        onOk: async () => {
          batchDeleteLoading.value = true;
          try {
            await securityOpinionApi.batchDeleteOpinions(selectedRowKeys.value);
            message.success("删除成功");
            selectedRowKeys.value = [];
            void fetchList();
          } finally {
            batchDeleteLoading.value = false;
          }
        },
      });
    };

    const exportExcel = async (): Promise<void> => {
      const [timeStart, timeEnd] = filters.timeRange ?? [];
      const params = {
        keyword: filters.keyword.trim() || undefined,
        source: filters.source || undefined,
        sentiment: filters.sentiment || undefined,
        warningLevel: filters.warningLevel || undefined,
        pushStatus: filters.pushStatus || undefined,
        timeStart: timeStart || undefined,
        timeEnd: timeEnd || undefined,
      };

      if (total.value === 0) {
        message.warning("当前没有可导出的数据");
        return;
      }

      const blob = await securityOpinionApi.exportOpinions(params);
      downloadBlob(blob, `舆情列表_${dayjs().format("YYYY-MM-DD")}.xlsx`);
      message.success("导出成功");
    };

    const renderWarningLevelTag = (record: OpinionVO) => {
      const level = String(record.warningLevel ?? "");
      if (!level) return <span>-</span>;
      return <Tag color={WARNING_LEVEL_COLOR[level] ?? "default"}>{record.warningLevelText || WARNING_LEVEL_LABEL[level] || level}</Tag>;
    };

    const renderPushStatusTag = (record: OpinionVO) => {
      const status = String(record.pushStatus ?? "");
      if (!status) return <span>-</span>;
      return <Tag color={PUSH_STATUS_COLOR[status] ?? "default"}>{record.pushStatusText || PUSH_STATUS_LABEL[status] || status}</Tag>;
    };

    onMounted(() => {
      void fetchSources();
      void fetchList();
    });

    const columns = [
      {
        title: "序号",
        width: 72,
        align: "center" as const,
        customRender: ({ index }: { index: number }) => (pageNumber.value - 1) * pageSize.value + index + 1,
      },
      {
        title: "标题",
        dataIndex: "title",
        width: 420,
        ellipsis: true,
        customRender: ({ record }: { record: OpinionVO }) => (
          <Tooltip title={record.title}>
            <span class={styles.titleCell}>{record.title}</span>
          </Tooltip>
        ),
      },
      {
        title: "来源",
        dataIndex: "source",
        width: 120,
        ellipsis: true,
      },
      {
        title: "情感倾向",
        dataIndex: "sentiment",
        width: 96,
        align: "center" as const,
        customRender: ({ record }: { record: OpinionVO }) => <SentimentTag sentiment={record.sentiment} />,
      },
      {
        title: "预警等级",
        dataIndex: "warningLevel",
        width: 108,
        align: "center" as const,
        customRender: ({ record }: { record: OpinionVO }) => renderWarningLevelTag(record),
      },
      {
        title: "推送状态",
        dataIndex: "pushStatus",
        width: 108,
        align: "center" as const,
        customRender: ({ record }: { record: OpinionVO }) => renderPushStatusTag(record),
      },
      {
        title: "采集时间",
        dataIndex: "collectedAt",
        width: 168,
        ellipsis: true,
        customRender: ({ text }: { text: string }) => {
          const time = formatDateTime(text);
          return (
            <Tooltip title={time}>
              <span>{time}</span>
            </Tooltip>
          );
        },
      },
      {
        title: "关联事件",
        dataIndex: "relatedEventId",
        width: 150,
        ellipsis: true,
        customRender: ({ record }: { record: OpinionVO }) =>
          record.relatedEventId ? (
            <Button type="link" size="small" onClick={() => goAlertEvent(record)}>
              {record.relatedEventId}
            </Button>
          ) : (
            "-"
          ),
      },
      {
        title: "操作",
        width: 128,
        fixed: "right" as const,
        customRender: ({ record }: { record: OpinionVO }) => (
          <Space size={0}>
            <Button
              type="link"
              size="small"
              onClick={() => {
                void showDetail(record);
              }}
            >
              详情
            </Button>
            {record.relatedEventId ? (
              <Button type="link" size="small" onClick={() => goAlertEvent(record)}>
                预警
              </Button>
            ) : null}
          </Space>
        ),
      },
    ];

    return () => (
      <PageShell
        title={pageTitle.value}
        v-slots={{
          "layout-header": () => (
            <Space>
              <Button
                danger
                type="primary"
                loading={batchDeleteLoading.value}
                disabled={selectedRowKeys.value.length === 0}
                onClick={handleBatchDelete}
              >
                批量删除
              </Button>
              <Button
                type="primary"
                onClick={() => {
                  void exportExcel();
                }}
              >
                导出
              </Button>
            </Space>
          ),
          "layout-content": () => (
            <>
              <Form layout="inline" class={styles.searchForm} data-layout-toolbar>
                <FormItem label="来源" class={styles.searchItem}>
                  <Select v-model:value={filters.source} allowClear placeholder="全部来源" style={{ width: "150px" }}>
                    {sourceOptions.value.map((s) => (
                      <SelectOption key={s.id} value={s.name}>
                        {s.name}
                      </SelectOption>
                    ))}
                  </Select>
                </FormItem>
                <FormItem label="情感倾向" class={styles.searchItem}>
                  <Select v-model:value={filters.sentiment} allowClear placeholder="全部" style={{ width: "120px" }}>
                    {SENTIMENT_OPTIONS.filter((o) => o.value).map((o) => (
                      <SelectOption key={o.value} value={o.value}>
                        {o.label}
                      </SelectOption>
                    ))}
                  </Select>
                </FormItem>
                <FormItem label="预警等级" class={styles.searchItem}>
                  <Select v-model:value={filters.warningLevel} allowClear placeholder="全部" style={{ width: "120px" }}>
                    {WARNING_LEVEL_OPTIONS.map((o) => (
                      <SelectOption key={o.value || "all"} value={o.value}>
                        {o.label}
                      </SelectOption>
                    ))}
                  </Select>
                </FormItem>
                <FormItem label="推送状态" class={styles.searchItem}>
                  <Select v-model:value={filters.pushStatus} allowClear placeholder="全部" style={{ width: "130px" }}>
                    {PUSH_STATUS_OPTIONS.map((o) => (
                      <SelectOption key={o.value || "all"} value={o.value}>
                        {o.label}
                      </SelectOption>
                    ))}
                  </Select>
                </FormItem>
                <FormItem label="时间范围" class={styles.searchItem}>
                  <DateRangePicker
                    v-model:value={filters.timeRange}
                    showTime={{ format: "HH:mm" }}
                    format="YYYY-MM-DD HH:mm"
                    valueFormat="YYYY-MM-DD HH:mm"
                    allowClear
                  />
                </FormItem>
                <FormItem class={styles.searchItem}>
                  <Input
                    v-model:value={filters.keyword}
                    placeholder="搜索标题、摘要、关键词..."
                    allowClear
                    showCount={false}
                    onPressEnter={onSearch}
                    style={{ width: "240px" }}
                  />
                </FormItem>
                <FormItem class={styles.searchItem}>
                  <Button type="primary" onClick={onSearch}>
                    查询
                  </Button>
                  <Button style={{ marginLeft: "10px" }} onClick={onReset}>
                    重置
                  </Button>
                </FormItem>
              </Form>
              <div class="tableWrap">
                <Table
                  class={`security-opinion-monitoring-table ${styles.opinionTable}`}
                  columns={columns}
                  dataSource={records.value}
                  rowKey="id"
                  loading={loading.value}
                  pagination={false}
                  scroll={{ x: OPINION_TABLE_SCROLL_X }}
                  tableLayout="fixed"
                  rowSelection={{
                    selectedRowKeys: selectedRowKeys.value,
                    onChange: (keys) => {
                      selectedRowKeys.value = keys.map(String);
                    },
                  }}
                  locale={{ emptyText: <Empty description="暂无匹配的舆情数据" /> }}
                />
              </div>
              <Modal
                open={detailVisible.value}
                title="舆情详情"
                width={720}
                footer={
                  <Button
                    onClick={() => {
                      detailVisible.value = false;
                    }}
                  >
                    关闭
                  </Button>
                }
                onCancel={() => {
                  detailVisible.value = false;
                }}
              >
                {detailItem.value && (
                  <div class={styles.detail}>
                    <h3 class={styles.detailTitle}>{detailItem.value.title}</h3>
                    <div class={styles.detailRow}>
                      <span>来源</span>
                      {detailItem.value.source}
                    </div>
                    <div class={styles.detailRow}>
                      <span>作者</span>
                      {detailItem.value.author || "--"}
                    </div>
                    <div class={styles.detailRow}>
                      <span>情感倾向</span>
                      <SentimentTag sentiment={detailItem.value.sentiment} />
                    </div>
                    <div class={styles.detailRow}>
                      <span>热度指数</span>
                      {detailItem.value.heatIndex ?? "-"}
                    </div>
                    <div class={styles.detailRow}>
                      <span>预警等级</span>
                      {renderWarningLevelTag(detailItem.value)}
                    </div>
                    <div class={styles.detailRow}>
                      <span>推送状态</span>
                      {renderPushStatusTag(detailItem.value)}
                    </div>
                    <div class={styles.detailRow}>
                      <span>采集时间</span>
                      {formatDateTime(detailItem.value.collectedAt)}
                    </div>
                    {detailItem.value.alertTime ? (
                      <div class={styles.detailRow}>
                        <span>预警时间</span>
                        {formatDateTime(detailItem.value.alertTime)}
                      </div>
                    ) : null}
                    {detailItem.value.relatedEventId ? (
                      <div class={styles.detailRow}>
                        <span>关联事件</span>
                        <Button type="link" size="small" onClick={() => goAlertEvent(detailItem.value!)}>
                          {detailItem.value.relatedEventId}
                        </Button>
                      </div>
                    ) : null}
                    <div class={styles.detailRow}>
                      <span>原文链接</span>
                      {detailItem.value.url ? (
                        <a href={detailItem.value.url} target="_blank" rel="noreferrer">
                          {detailItem.value.url}
                        </a>
                      ) : (
                        "-"
                      )}
                    </div>
                    <div class={styles.detailRow}>
                      <span>关联关键词</span>
                      <Space wrap>
                        {detailItem.value.keywords?.length ? (
                          detailItem.value.keywords.map((keyword) => <Tag key={keyword}>{keyword}</Tag>)
                        ) : (
                          <span>-</span>
                        )}
                      </Space>
                    </div>
                    <div class={styles.detailContent}>
                      <div class={styles.detailLabel}>详细内容</div>
                      <pre class={styles.contentPre}>{detailItem.value.content}</pre>
                    </div>
                  </div>
                )}
              </Modal>
            </>
          ),
          "footer-page": () => (
            <GPagination total={total.value} current={pageNumber.value} pageSize={pageSize.value} onChange={onPageChange} />
          ),
        }}
      />
    );
  },
});
