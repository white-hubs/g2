import type { BusinessTag, BusinessTagAssociation, BusinessTagRefType } from "@g2-contract/business-config";
import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getBusinessConfigClient, hasBusinessConfigFunction } from "../domain-context";
import { Button, Page, PageLayout, PopConfirm, Space, Spin, Tabs, TabPane, message, usePcForm, usePcTable } from "../pc-ui-runtime";

const BASE = "/d/business-config";
const refTypes: { key: BusinessTagRefType; label: string }[] = [
  { key: "AREA", label: "区域" },
  { key: "DEVICE", label: "设备" },
  { key: "PROPERTY", label: "资产" },
  { key: "STALL", label: "档位" },
  { key: "SITE_POINT", label: "现场点" },
  { key: "PATROL_POINT", label: "巡更点" },
  { key: "RISK_SOURCE", label: "风险源" },
  { key: "SMALL_ENGINEERING", label: "小散工程" },
];
const errorText = (error: unknown): string => (error instanceof Error ? error.message : "请求失败");

export const BusinessTagDetailsPage = defineComponent({
  name: "BusinessConfigBusinessTagDetailsPage",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const tagId = String(route.params.id ?? "");
    const tag = ref<BusinessTag>();
    const loading = ref(false);
    const activeType = ref<BusinessTagRefType>(refTypes.find((item) => item.key === route.query.tab)?.key ?? "AREA");
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const query = reactive({ name: "" });
    let requestSequence = 0;

    const [PcTable, tableApi] = usePcTable({
      rowKey: "id",
      childrenColumnName: "children",
      pagination: false,
      columns: [
        {
          title: "名称",
          dataIndex: "name",
          ellipsis: true,
          customRender: ({ record, text }) => {
            const item = record as BusinessTagAssociation;
            return String(text || item.projectName || item.patrolLocationName || "--");
          },
        },
        { title: "编号", dataIndex: "code", ellipsis: true },
        {
          title: "操作",
          dataIndex: "action",
          width: 100,
          customRender: ({ record }) => {
            const item = record as BusinessTagAssociation;
            return hasBusinessConfigFunction("businessConfig:businessTag:edit") ? (
              <PopConfirm title="确认删除该关联？" okText="确定" cancelText="取消" onConfirm={() => void removeAssociation(item)}>
                <Button type="link" size="small" danger>
                  删除
                </Button>
              </PopConfirm>
            ) : null;
          },
        },
      ],
      fetchApi: async () => {
        const current = ++requestSequence;
        try {
          const result = await getBusinessConfigClient().getBusinessTagAssociations({
            tagId,
            refType: activeType.value,
            name: query.name.trim() || undefined,
            pageNumber: page.pageNumber,
            pageSize: page.pageSize,
          });
          if (current !== requestSequence) return { records: [], total: page.total, pages: 1 };
          if (Array.isArray(result)) {
            page.total = result.length;
            return { records: result, total: result.length, pages: 1 };
          }
          page.total = result.total;
          return { records: result.records, total: result.total, pages: result.pages ?? Math.ceil(result.total / page.pageSize) };
        } catch (error) {
          if (current === requestSequence) message.error(errorText(error));
          return { records: [], total: page.total, pages: 1 };
        }
      },
    });

    const [PcForm] = usePcForm({
      layout: "inline",
      cache: false,
      actionsInline: true,
      submitText: "查询",
      resetText: "重置",
      schema: [
        {
          component: "Input",
          fieldName: "name",
          label: "",
          defaultValue: "",
          componentProps: { placeholder: "请输入名称", allowClear: true },
        },
      ],
      handleSubmit(values) {
        query.name = String(values.name ?? "");
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset() {
        query.name = "";
        page.pageNumber = 1;
        tableApi.query();
      },
    });

    async function loadTag(): Promise<void> {
      loading.value = true;
      try {
        tag.value = await getBusinessConfigClient().getBusinessTagDetails(tagId);
      } catch (error) {
        message.error(errorText(error));
      } finally {
        loading.value = false;
      }
    }

    async function removeAssociation(record: BusinessTagAssociation): Promise<void> {
      try {
        await getBusinessConfigClient().removeBusinessTagAssociations({ tagId, refIds: [record.id] });
        message.success("操作成功");
        tableApi.query();
      } catch (error) {
        message.error(errorText(error));
      }
    }

    function changeType(value: string): void {
      if (!refTypes.some((item) => item.key === value)) return;
      activeType.value = value as BusinessTagRefType;
      page.pageNumber = 1;
      page.total = 0;
      query.name = "";
      tableApi.query();
    }

    onMounted(() => {
      void loadTag();
      void tableApi.query();
    });

    return () => (
      <PageLayout
        title="业务标签详情"
        v-slots={{
          "layout-header": () => <Button onClick={() => void router.push(`${BASE}/business-tag`)}>返回</Button>,
          "layout-content": () => (
            <Spin spinning={loading.value}>
              <section style={{ padding: "16px 0" }}>
                <h3>基础信息</h3>
                <div>标签名称：{tag.value?.name ?? "--"}</div>
                <div>标签描述：{tag.value?.description || "--"}</div>
                <div>编辑时间：{tag.value?.updateTime || "--"}</div>
              </section>
              <h3>关联信息</h3>
              <Tabs activeKey={activeType.value} onChange={(value) => changeType(String(value))}>
                {refTypes.map((item) => (
                  <TabPane key={item.key} tab={item.label} />
                ))}
              </Tabs>
              <Space>
                <PcForm />
                {hasBusinessConfigFunction("businessConfig:businessTag:edit") ? (
                  <Button type="primary" onClick={() => message.info("关联对象选择器正在迁入")}>
                    新增关联
                  </Button>
                ) : null}
              </Space>
              <PcTable />
            </Spin>
          ),
          "footer-page": () => (
            <Page
              current={page.pageNumber}
              pageSize={page.pageSize}
              total={page.total}
              cachePageQuery={false}
              onPageChange={(pageNumber, pageSize) => {
                page.pageNumber = pageNumber;
                page.pageSize = pageSize;
                tableApi.query();
              }}
            />
          ),
        }}
      />
    );
  },
});
