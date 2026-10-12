import type { TrashItemVO } from "@g2-contract/security-opinion";
import { AntModal, Button, Modal, PopConfirm, Space, Table, Tag, Tooltip, message } from "@g2-platform/pc-ui";
/** @jsxImportSource vue */
import { defineComponent, onMounted, ref } from "vue";

import { securityOpinionApi } from "../../api/security-opinion";
import { GPagination } from "../../components/common/pagination";
import { PageShell } from "../../components/page-shell/page-shell";
import { TABLE_PAGE_SIZE } from "../../constants";
import { formatDateTime } from "../../utils/format-datetime";
import { usePageName } from "../../utils/page-name";

import styles from "./recycle-bin.module.css";

/** 标题 + 来源 + 过滤原因 + 采集时间 + 操作 */
const RECYCLE_TABLE_SCROLL_X = 948;

export const RecycleBinPage = defineComponent({
  setup() {
    const { pageTitle } = usePageName();
    const records = ref<TrashItemVO[]>([]);
    const total = ref(0);
    const pageNumber = ref(1);
    const pageSize = ref(TABLE_PAGE_SIZE);
    const loading = ref(false);
    const detailVisible = ref(false);
    const detailItem = ref<TrashItemVO | null>(null);

    const fetchList = async (): Promise<void> => {
      loading.value = true;
      try {
        const result = await securityOpinionApi.pageTrash({
          pageNumber: pageNumber.value,
          pageSize: pageSize.value,
        });
        records.value = result.records;
        total.value = result.total;
      } finally {
        loading.value = false;
      }
    };

    const onRestore = async (id: string): Promise<void> => {
      await securityOpinionApi.restoreTrashItem(id);
      message.success("已恢复到舆情列表");
      void fetchList();
    };

    const onDelete = async (id: string): Promise<void> => {
      await securityOpinionApi.deleteTrashItem(id);
      message.success("已永久删除");
      void fetchList();
    };

    const showDetail = async (id: string): Promise<void> => {
      detailItem.value = await securityOpinionApi.getTrashItem(id);
      detailVisible.value = true;
    };

    const onClearAll = async (): Promise<void> => {
      await securityOpinionApi.clearTrash();
      message.success("回收站已清空");
      void fetchList();
    };

    const confirmClearAll = (): void => {
      AntModal.confirm({
        centered: true,
        title: "全部清空",
        content: "确定清空回收站中的所有数据？此操作不可恢复，请谨慎操作。",
        okText: "确定",
        cancelText: "取消",
        onOk: () => onClearAll(),
      });
    };

    const onPageChange = (page: number, size: number): void => {
      pageNumber.value = page;
      pageSize.value = size;
      void fetchList();
    };

    onMounted(() => {
      void fetchList();
    });

    const columns = [
      {
        title: "标题",
        dataIndex: "title",
        width: 376,
        ellipsis: true,
        customRender: ({ record }: { record: TrashItemVO }) => (
          <Tooltip title={record.title}>
            <span class={styles.titleCell}>{record.title}</span>
          </Tooltip>
        ),
      },
      { title: "来源", dataIndex: "source", width: 96, ellipsis: true },
      {
        title: "过滤原因",
        dataIndex: "filterReason",
        width: 148,
        ellipsis: true,
        customRender: ({ record }: { record: TrashItemVO }) => <Tag color="error">{record.filterReason}</Tag>,
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
        title: "操作",
        width: 180,
        fixed: "right" as const,
        customRender: ({ record }: { record: TrashItemVO }) => (
          <Space size={4}>
            <Button
              type="link"
              size="small"
              onClick={() => {
                void showDetail(record.id);
              }}
            >
              详情
            </Button>
            <Button
              type="link"
              size="small"
              class={styles.restoreBtn}
              onClick={() => {
                void onRestore(record.id);
              }}
            >
              恢复
            </Button>
            <PopConfirm
              title="确定永久删除该条数据？"
              onConfirm={() => {
                void onDelete(record.id);
              }}
            >
              <Button type="link" size="small" danger>
                永久删除
              </Button>
            </PopConfirm>
          </Space>
        ),
      },
    ];

    return () => (
      <PageShell
        title={pageTitle.value}
        v-slots={{
          "layout-header": () => (
            <Button type="primary" onClick={confirmClearAll}>
              全部清空
            </Button>
          ),
          "layout-content": () => (
            <>
              <div class="tableWrap">
                <Table
                  class="security-opinion-monitoring-table"
                  columns={columns}
                  dataSource={records.value}
                  rowKey="id"
                  loading={loading.value}
                  pagination={false}
                  scroll={{ x: RECYCLE_TABLE_SCROLL_X }}
                  tableLayout="fixed"
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
                {detailItem.value ? (
                  <div class={styles.detail}>
                    <h3 class={styles.detailTitle}>{detailItem.value.title}</h3>
                    <div class={styles.detailRow}>
                      <span>来源</span>
                      {detailItem.value.source || "-"}
                    </div>
                    <div class={styles.detailRow}>
                      <span>作者</span>
                      {detailItem.value.author || "--"}
                    </div>
                    <div class={styles.detailRow}>
                      <span>过滤原因</span>
                      <Tag color="error">{detailItem.value.filterReason || "-"}</Tag>
                    </div>
                    <div class={styles.detailRow}>
                      <span>发布时间</span>
                      {formatDateTime(detailItem.value.publishTime)}
                    </div>
                    <div class={styles.detailRow}>
                      <span>采集时间</span>
                      {formatDateTime(detailItem.value.collectedAt)}
                    </div>
                    <div class={styles.detailRow}>
                      <span>命中关键词</span>
                      <Space wrap>
                        {detailItem.value.keywords?.length ? (
                          detailItem.value.keywords.map((keyword) => <Tag key={keyword}>{keyword}</Tag>)
                        ) : (
                          <span>-</span>
                        )}
                      </Space>
                    </div>
                    <div class={styles.detailRow}>
                      <span>排除关键词</span>
                      <Space wrap>
                        {detailItem.value.excludedKeywords?.length ? (
                          detailItem.value.excludedKeywords.map((keyword) => (
                            <Tag key={keyword} color="error">
                              {keyword}
                            </Tag>
                          ))
                        ) : (
                          <span>-</span>
                        )}
                      </Space>
                    </div>
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
                    <div class={styles.detailContent}>
                      <div class={styles.detailLabel}>详细内容</div>
                      <pre class={styles.contentPre}>{detailItem.value.content || detailItem.value.summary || "-"}</pre>
                    </div>
                  </div>
                ) : null}
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
