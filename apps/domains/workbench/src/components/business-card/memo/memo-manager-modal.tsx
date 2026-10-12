import { PlusOutlined } from "@ant-design/icons-vue";
import { defineComponent, nextTick, reactive, shallowRef, type PropType, watch } from "vue";

import type { MemoNote } from "./types";
import { Button, Input, Modal, Page, PopConfirm, usePcTable } from "@/pc-ui-runtime";

interface MemoPageResult {
  total: number;
  pages: number;
  records: MemoNote[];
}

const formatTime = (timestamp: number): string =>
  new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(
    timestamp,
  );

export default defineComponent({
  name: "MemoManagerModal",
  props: {
    visible: { type: Boolean, default: false },
    refreshKey: { type: Number, default: 0 },
    deletingId: { type: String as PropType<string | undefined>, default: undefined },
    fetchPage: {
      type: Function as PropType<(query: { pageNumber: number; pageSize: number; keyword?: string }) => Promise<MemoPageResult>>,
      required: true,
    },
  },
  emits: ["cancel", "create", "edit", "delete"],
  setup(props, { emit }) {
    const pagination = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const keyword = shallowRef("");
    const [MemoTable, tableApi] = usePcTable({
      tableCode: "workbench-memo-manager",
      autoFetch: false,
      pagination: false,
      rowKey: "id",
      columns: [
        { title: "标题", dataIndex: "title", width: 160 },
        { title: "内容", dataIndex: "content" },
        {
          title: "更新时间",
          dataIndex: "updatedAt",
          width: 180,
          customRender: ({ text }: { text: number }) => formatTime(text),
        },
        {
          title: "操作",
          dataIndex: "actions",
          width: 150,
          customRender: ({ record }: { record: MemoNote }) => (
            <div class="memo-manager__actions">
              <Button type="link" disabled={Boolean(props.deletingId)} onClick={() => emit("edit", record)}>
                编辑
              </Button>
              <PopConfirm title="确定删除这条备忘录吗？" okText="删除" cancelText="取消" onConfirm={() => emit("delete", record.id)}>
                <Button
                  danger
                  type="link"
                  loading={props.deletingId === record.id}
                  disabled={Boolean(props.deletingId) && props.deletingId !== record.id}
                >
                  删除
                </Button>
              </PopConfirm>
            </div>
          ),
        },
      ] as never,
      fetchApi: async () => {
        const page = await props.fetchPage({ ...pagination, keyword: keyword.value.trim() || undefined });
        return {
          total: page.total,
          pages: page.pages,
          records: page.records,
        };
      },
      fetchLoaded: (page) => {
        pagination.total = Number(page.total ?? 0);
      },
    });
    const queryTable = (): void => {
      void tableApi.query();
    };
    const search = (): void => {
      pagination.pageNumber = 1;
      queryTable();
    };
    const resetSearch = (): void => {
      keyword.value = "";
      pagination.pageNumber = 1;
      queryTable();
    };

    watch(
      () => [props.visible, props.refreshKey],
      ([visible]) => {
        if (!visible) return;
        void nextTick(queryTable);
      },
    );

    return () => (
      <Modal open={props.visible} title="全部备忘录" width="860px" footer={null as never} onCancel={() => emit("cancel")}>
        <div class="memo-manager">
          <div class="memo-manager__toolbar">
            <div class="memo-manager__search">
              <span class="memo-manager__search-label">关键词：</span>
              <Input
                class="memo-manager__search-input"
                value={keyword.value}
                allowClear
                placeholder="请输入标题或内容"
                onUpdate:value={(value: string) => (keyword.value = value)}
                onPressEnter={search}
              />
              <Button type="primary" onClick={search}>
                查询
              </Button>
              <Button onClick={resetSearch}>重置</Button>
            </div>
            <Button type="primary" onClick={() => emit("create")}>
              <PlusOutlined /> 新增备忘录
            </Button>
          </div>
          <MemoTable />
          <div class="memo-manager__pagination">
            <Page
              current={pagination.pageNumber}
              pageSize={pagination.pageSize}
              total={pagination.total}
              showSizeChanger={false}
              syncToUrl={false}
              onPageChange={(pageNumber: number, pageSize: number) => {
                pagination.pageNumber = pageNumber;
                pagination.pageSize = pageSize;
                queryTable();
              }}
            />
          </div>
        </div>
      </Modal>
    );
  },
});
