import { Button, Page, PageLayout, PopConfirm, PopOver, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, reactive } from "vue";
import { useRouter } from "vue-router";

interface DrawingRecord {
  id: string;
  name: string;
  type: string;
  description: string;
}

const cell = (value: unknown) => <PopOver content={String(value ?? "")}>{String(value || "--")}</PopOver>;

export default defineComponent({
  name: "LineLossDrawingManagement",
  setup() {
    const router = useRouter();
    const query = reactive({ pageNumber: 1, pageSize: 10, total: 0, keyword: "", type: undefined as string | undefined });
    const [PcTable, tableApi] = usePcTable({
      rowKey: "id",
      tableCode: "LINE_LOSS_DRAWING_MANAGEMENT",
      columns: [
        {
          title: "序号",
          width: 80,
          align: "center",
          customRender: ({ index = 0 }) => (query.pageNumber - 1) * query.pageSize + index + 1,
        },
        { title: "图纸名称", dataIndex: "name", align: "center", ellipsis: true, customRender: ({ text }) => cell(text) },
        { title: "图纸类型", dataIndex: "type", align: "center", ellipsis: true, customRender: ({ text }) => cell(text) },
        { title: "备注", dataIndex: "description", align: "center", ellipsis: true, customRender: ({ text }) => cell(text) },
        {
          title: "操作",
          key: "action",
          width: 220,
          fixed: "right",
          customRender: ({ record }) => {
            const row = record as unknown as DrawingRecord;
            return (
              <>
                <Button
                  type="link"
                  size="small"
                  onClick={() =>
                    void router.push({ path: "/d/line-loss-management/drawing-management-edit", query: { type: "info", id: row.id } })
                  }
                >
                  详情
                </Button>
                <Button
                  type="link"
                  size="small"
                  onClick={() =>
                    void router.push({ path: "/d/line-loss-management/drawing-management-edit", query: { type: "edit", id: row.id } })
                  }
                >
                  编辑
                </Button>
                <PopConfirm
                  title="确认删除该图纸？"
                  okText="确定"
                  cancelText="取消"
                  onConfirm={() => {
                    message.warning("图纸删除接口尚未开放");
                  }}
                >
                  <Button type="link" size="small" danger>
                    删除
                  </Button>
                </PopConfirm>
              </>
            );
          },
        },
      ],
      // 旧仓图纸列表 fetch 仍为注释态，保持空列表但保留分页/操作闭环
      fetchApi: async () => ({ total: 0, pages: 0, records: [] as DrawingRecord[] }),
      fetchLoaded: (result) => {
        query.total = result.total;
      },
    });
    const [PcForm] = usePcForm({
      layout: "horizontal",
      cache: false,
      schema: [
        {
          component: "Select",
          label: "图纸类型",
          fieldName: "type",
          defaultValue: undefined,
          componentProps: { allowClear: true, placeholder: "请选择图纸类型", options: [] },
        },
        {
          component: "Input",
          label: "",
          fieldName: "keyword",
          defaultValue: "",
          componentProps: { placeholder: "图纸名称", allowClear: true },
        },
      ],
      handleSubmit: (values) => {
        query.type = values.type as string | undefined;
        query.keyword = String(values.keyword ?? "");
        query.pageNumber = 1;
        void tableApi.query();
      },
      handleReset: () => {
        query.type = undefined;
        query.keyword = "";
        query.pageNumber = 1;
        void tableApi.query();
      },
    });
    return () => (
      <PageLayout
        title="图纸管理"
        v-slots={{
          "layout-header": () => (
            <Button
              type="primary"
              onClick={() => void router.push({ path: "/d/line-loss-management/drawing-management-edit", query: { type: "create" } })}
            >
              新增
            </Button>
          ),
          "layout-content": () => (
            <>
              <PcForm />
              <PcTable />
            </>
          ),
          "footer-page": () => (
            <Page
              current={query.pageNumber}
              pageSize={query.pageSize}
              total={query.total}
              cachePageQuery={false}
              onPageChange={(page: number, size: number) => {
                query.pageNumber = page;
                query.pageSize = size;
                void tableApi.query();
              }}
            />
          ),
        }}
      />
    );
  },
});
