import type { BulletinDetail, BulletinRow, ModelTypeRow, NoticeLevel } from "@g2-contract/technical-bulletin";
import { type Component, defineComponent, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getTechnicalBulletinClient } from "../domain-context";
import { Button, Modal, Page, PageLayout, Popconfirm, Tag, message, usePcForm, usePcTable } from "../pc-ui-runtime";
import { errorMessage, isTopping, periodValue, text } from "../shared";

import styles from "../styles.module.less";

const BASE = "/d/technical-bulletin";

function detailContent(detail: BulletinDetail, close: () => void): JSX.Element {
  return (
    <Modal open title="公告信息" width={860} footer={null} onCancel={close}>
      <div class={styles.detailBody}>
        <div class={styles.detailGrid}>
          <div class={styles.detailItem}>
            <span class={styles.detailLabel}>公告人</span>
            <span>{text(detail.createBy)}</span>
          </div>
          <div class={styles.detailItem}>
            <span class={styles.detailLabel}>公告时间</span>
            <span>{text(detail.noticeTime)}</span>
          </div>
          <div class={styles.detailItem}>
            <span class={styles.detailLabel}>公告类型</span>
            <span>{text(detail.typeName)}</span>
          </div>
          <div class={styles.detailItem}>
            <span class={styles.detailLabel}>公告级别</span>
            <span>{text(detail.levelName)}</span>
          </div>
          <div class={[styles.detailItem, styles.fullWidth]}>
            <span class={styles.detailLabel}>公告标题</span>
            <span>{text(detail.title)}</span>
          </div>
        </div>
        <h3>公告内容</h3>
        <div class={styles.contentHtml} innerHTML={detail.content || "--"} />
        <h3>附件信息</h3>
        <div class={styles.fileList}>
          {(detail.files ?? []).length === 0 ? <span>--</span> : null}
          {(detail.files ?? []).map((file) =>
            file.path ? (
              <a key={file.id} href={file.path} target="_blank" rel="noreferrer">
                {file.name ?? file.id}
              </a>
            ) : (
              <span key={file.id}>{file.name ?? file.id}</span>
            ),
          )}
        </div>
        <div class={styles.footerActions}>
          <Button onClick={close}>关闭</Button>
        </div>
      </div>
    </Modal>
  );
}

function createNoticePage(manage: boolean): Component {
  return defineComponent({
    name: manage ? "TechnicalBulletinNoticeManage" : "TechnicalBulletinNoticeInfo",
    setup() {
      const router = useRouter();
      const route = useRoute();
      const query = reactive<{ date?: string[]; keyword: string; level?: string; type?: string }>({ keyword: "" });
      const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
      const typeOptions = ref<{ label: string; value: string }[]>([]);
      const levelOptions = ref<{ label: string; value: string }[]>([]);
      const selectedIds = ref<string[]>([]);
      const detail = ref<BulletinDetail>();
      const detailVisible = ref(false);

      const clearSelection = (): void => {
        selectedIds.value = [];
        tableApi.setSelectedRowKeys([]);
      };

      const openDetail = async (id: string): Promise<void> => {
        try {
          detail.value = await getTechnicalBulletinClient().getAnnouncement(id);
          detailVisible.value = true;
        } catch (error) {
          message.error(errorMessage(error, "公告详情加载失败"));
        }
      };

      const remove = async (ids: string[]): Promise<void> => {
        try {
          if (ids.length === 1) {
            await getTechnicalBulletinClient().deleteAnnouncement(ids[0]);
          } else {
            await getTechnicalBulletinClient().deleteAnnouncements(ids);
          }
          message.success("删除成功");
          clearSelection();
          tableApi.query();
        } catch (error) {
          message.error(errorMessage(error, "删除失败"));
        }
      };

      const toggle = async (record: BulletinRow, kind: "status" | "top"): Promise<void> => {
        const topped = isTopping(record.isTopping);
        try {
          await getTechnicalBulletinClient().updateVisibility([
            {
              id: record.id,
              isTopping: kind === "top" ? !topped : topped,
              status: kind === "status" ? (record.status === "DISPLAY" ? "HIDE" : "DISPLAY") : (record.status ?? "DISPLAY"),
            },
          ]);
          message.success("状态更新成功");
          tableApi.query();
        } catch (error) {
          message.error(errorMessage(error, "状态更新失败"));
        }
      };

      const [PcTable, tableApi] = usePcTable({
        tableCode: manage ? "TECHNICAL_BULLETIN_MANAGE" : "TECHNICAL_BULLETIN_INFO",
        rowKey: "id",
        ...(manage
          ? {
              rowSelection: "checkbox" as const,
              rowSelectionChange(keys: (string | number)[]) {
                selectedIds.value = keys.map(String);
              },
            }
          : {}),
        columns: [
          {
            title: "序号",
            dataIndex: "sequence",
            width: 76,
            fixed: "left",
            align: "center",
            customRender: ({ index }: { index: number }) => (page.pageNumber - 1) * page.pageSize + index + 1,
          },
          {
            title: "公告标题",
            dataIndex: "title",
            width: 260,
            fixed: "left",
            ellipsis: true,
            customRender: ({ text: value }) => text(value),
          },
          { title: "公告类型", dataIndex: "typeName", width: 150, ellipsis: true, customRender: ({ text: value }) => text(value) },
          { title: "公告级别", dataIndex: "levelName", width: 130, ellipsis: true, customRender: ({ text: value }) => text(value) },
          { title: "公告时间", dataIndex: "noticeTime", width: 180, ellipsis: true, customRender: ({ text: value }) => text(value) },
          {
            title: manage ? "创建人" : "公告人",
            dataIndex: "createBy",
            width: 140,
            ellipsis: true,
            customRender: ({ text: value }) => text(value),
          },
          ...(manage
            ? [
                {
                  title: "状态",
                  dataIndex: "status",
                  width: 100,
                  customRender: ({ text: value }: { text?: string }) => (
                    <Tag color={value === "DISPLAY" ? "green" : "default"}>{value === "DISPLAY" ? "显示" : "隐藏"}</Tag>
                  ),
                },
              ]
            : []),
          {
            title: "操作",
            dataIndex: "action",
            width: manage ? 340 : 90,
            fixed: "right",
            customRender: ({ record }: { record: BulletinRow }) =>
              manage ? (
                <div class={styles.actionSpace}>
                  <Button
                    type="link"
                    onClick={() => void router.push({ path: `${BASE}/notice-manage/form`, query: { mode: "detail", id: record.id } })}
                  >
                    详情
                  </Button>
                  <Button
                    type="link"
                    onClick={() => void router.push({ path: `${BASE}/notice-manage/form`, query: { mode: "edit", id: record.id } })}
                  >
                    编辑
                  </Button>
                  <Popconfirm title="确定删除该公告？" onConfirm={() => void remove([record.id])}>
                    <Button type="link" danger>
                      删除
                    </Button>
                  </Popconfirm>
                  <Button type="link" onClick={() => void toggle(record, "status")}>
                    {record.status === "DISPLAY" ? "隐藏" : "显示"}
                  </Button>
                  <Button type="link" onClick={() => void toggle(record, "top")}>
                    {isTopping(record.isTopping) ? "取消置顶" : "置顶"}
                  </Button>
                </div>
              ) : (
                <Button type="link" onClick={() => void openDetail(record.id)}>
                  查看
                </Button>
              ),
          },
        ],
        fetchApi: async () => {
          try {
            const result = await getTechnicalBulletinClient().pageAnnouncements({
              pageNumber: page.pageNumber,
              pageSize: page.pageSize,
              keyword: query.keyword || undefined,
              type: query.type,
              level: query.level,
              period: periodValue(query.date),
              ...(!manage ? { status: "DISPLAY" as const } : {}),
            });
            page.total = result.total;
            return result;
          } catch (error) {
            message.error(errorMessage(error, "公告列表加载失败"));
            return { records: [], total: 0, pages: 0 };
          }
        },
      });

      const [PcForm] = usePcForm({
        layout: "horizontal",
        syncStateRef: query,
        schema: [
          {
            component: "Select",
            fieldName: "type",
            label: "公告类型",
            componentProps: { allowClear: true, options: typeOptions, placeholder: "请选择公告类型" },
          },
          {
            component: "Select",
            fieldName: "level",
            label: "公告级别",
            componentProps: { allowClear: true, options: levelOptions, placeholder: "请选择公告级别" },
          },
          {
            component: "RangePicker",
            fieldName: "date",
            label: manage ? "时间范围" : "公告时间",
            componentProps: { allowClear: true, valueFormat: "YYYY-MM-DD" },
          },
          {
            component: "Input",
            fieldName: "keyword",
            label: "",
            defaultValue: "",
            componentProps: { allowClear: true, placeholder: "公告名称" },
          },
        ],
        handleSubmit(values) {
          query.type = typeof values.type === "string" ? values.type : undefined;
          query.level = typeof values.level === "string" ? values.level : undefined;
          query.date = Array.isArray(values.date) ? values.date.map(String) : undefined;
          query.keyword = String(values.keyword ?? "").trim();
          page.pageNumber = 1;
          clearSelection();
          tableApi.query();
        },
        handleReset() {
          query.type = undefined;
          query.level = undefined;
          query.date = undefined;
          query.keyword = "";
          page.pageNumber = 1;
          clearSelection();
          tableApi.query();
        },
      });

      const loadOptions = async (): Promise<void> => {
        try {
          const [types, levels] = await Promise.all([
            getTechnicalBulletinClient().listNoticeTypes({ pageNumber: 1, pageSize: 100 }),
            getTechnicalBulletinClient().listNoticeLevels(),
          ]);
          typeOptions.value = types.map((item: ModelTypeRow) => ({ label: item.typeName, value: item.id }));
          levelOptions.value = levels.map((item: NoticeLevel) => ({ label: item.name, value: item.code }));
        } catch (error) {
          message.error(errorMessage(error, "筛选项加载失败"));
        }
      };

      onMounted(() => void loadOptions());
      watch(
        () => route.query.id,
        (id) => {
          if (!manage && typeof id === "string" && id) {
            void openDetail(id);
          }
        },
        { immediate: true },
      );

      return () => (
        <PageLayout
          title={manage ? "公告管理" : "公告信息"}
          v-slots={{
            "layout-header": () =>
              manage ? (
                <div class={styles.headerActions}>
                  <Button type="primary" onClick={() => void router.push({ path: `${BASE}/notice-manage/form`, query: { mode: "add" } })}>
                    新增
                  </Button>
                  <Popconfirm
                    title={`确定删除选中的 ${selectedIds.value.length} 项公告？`}
                    disabled={selectedIds.value.length === 0}
                    onConfirm={() => void remove(selectedIds.value)}
                  >
                    <Button danger disabled={selectedIds.value.length === 0}>
                      批量删除
                    </Button>
                  </Popconfirm>
                </div>
              ) : null,
            "layout-content": () => (
              <div class={styles.tablePage}>
                <PcForm />
                <PcTable />
                {detailVisible.value && detail.value ? detailContent(detail.value, () => (detailVisible.value = false)) : null}
              </div>
            ),
            "footer-btn": () => (manage ? <span class={styles.selection}>已选 {selectedIds.value.length} 项</span> : null),
            "footer-page": () =>
              page.total > 0 ? (
                <Page
                  current={page.pageNumber}
                  pageSize={page.pageSize}
                  total={page.total}
                  cachePageQuery={false}
                  onPageChange={(pageNumber: number, pageSize: number) => {
                    page.pageNumber = pageNumber;
                    page.pageSize = pageSize;
                    clearSelection();
                    tableApi.query();
                  }}
                />
              ) : null,
          }}
        />
      );
    },
  });
}

export const NoticeInfoPage = createNoticePage(false);
export const NoticeManagePage = createNoticePage(true);
