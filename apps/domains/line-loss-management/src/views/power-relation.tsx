import type { LineConnection } from "@g2-contract/line-loss-management";
import { Button, PageLayout, PopConfirm, PopOver, Space, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, reactive } from "vue";

import { useLineLossClient } from "../api";

const cell = (value: unknown) => <PopOver content={String(value ?? "")}>{String(value || "--")}</PopOver>;

export default defineComponent({
  name: "LineLossPowerRelation",
  setup() {
    const client = useLineLossClient();
    const query = reactive({ keyword: "", syncing: false });
    const [PcTable, tableApi] = usePcTable({
      rowKey: "id",
      tableCode: "LINE_LOSS_POWER_RELATION",
      childrenColumnName: "nextList",
      columns: [
        { title: "节点名称", dataIndex: "name", ellipsis: true, customRender: ({ text, record }) => cell(text || record.lineName) },
        { title: "节点类型", dataIndex: "type", ellipsis: true, customRender: ({ text }) => cell(text) },
        {
          title: "所在位置",
          dataIndex: "location",
          ellipsis: true,
          customRender: ({ text, record }) => cell(text || record.fromNodeLocation || record.toNodeLocation),
        },
        {
          title: "操作",
          key: "action",
          width: 220,
          customRender: () => (
            <Space>
              <Button type="link" size="small" onClick={() => message.warning("供电关系编辑接口尚未开放")}>
                新增下级
              </Button>
              <Button type="link" size="small" onClick={() => message.warning("供电关系编辑接口尚未开放")}>
                编辑
              </Button>
              <PopConfirm
                title="确认删除该节点？"
                okText="确定"
                cancelText="取消"
                onConfirm={() => message.warning("供电关系删除接口尚未开放")}
              >
                <Button type="link" size="small" danger>
                  删除
                </Button>
              </PopConfirm>
            </Space>
          ),
        },
      ],
      fetchApi: async () => {
        try {
          const api = await client();
          const result = await api.getLineConnections({ keyword: query.keyword });
          return { total: result.total ?? 0, pages: result.pages ?? 0, records: (result.records ?? []) as LineConnection[] };
        } catch (error) {
          message.error(error instanceof Error ? error.message : "供电关系加载失败");
          return { total: 0, pages: 0, records: [] as LineConnection[] };
        }
      },
    });
    const [PcForm] = usePcForm({
      layout: "horizontal",
      cache: false,
      schema: [
        {
          component: "Input",
          label: "",
          fieldName: "keyword",
          defaultValue: "",
          componentProps: { placeholder: "节点名称/所在位置", allowClear: true },
        },
      ],
      handleSubmit: (values) => {
        query.keyword = String(values.keyword ?? "");
        void tableApi.query();
      },
      handleReset: () => {
        query.keyword = "";
        void tableApi.query();
      },
    });
    const sync = async () => {
      if (query.syncing) {
        return;
      }
      query.syncing = true;
      try {
        const api = await client();
        await api.syncSupplyGraph();
        message.success("供电关系同步成功");
        await tableApi.query();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "供电关系同步失败");
      } finally {
        query.syncing = false;
      }
    };
    return () => (
      <PageLayout
        title="供电关系"
        showFooter={false}
        v-slots={{
          "layout-header": () => (
            <Space>
              <Button type="primary" loading={query.syncing} onClick={() => void sync()}>
                同步供电关系
              </Button>
            </Space>
          ),
          "layout-content": () => (
            <>
              <PcForm />
              <PcTable />
            </>
          ),
        }}
      />
    );
  },
});
