import type { ArrangeRow, OptionItem } from "@g2-contract/work-report";
import { Button, Page, PageLayout, type PcFormSchemaProp, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, onMounted, onUnmounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getClient } from "../domain-context";
import { BASE } from "../menu-data";
import { dateTime, errorText, positiveInt } from "../shared";

import styles from "../styles.module.css";
export const ArrangePage = defineComponent({
  name: "WorkReportArrangePage",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const query = reactive<{ deptId?: string; period: string[]; keyword: string }>({ deptId: undefined, period: [], keyword: "" });
    const pager = reactive({
      pageNumber: positiveInt(route.query.pageNumber, 1),
      pageSize: positiveInt(route.query.pageSize, 10),
      total: 0,
    });
    const departments = ref<OptionItem[]>([]);
    let version = 0;
    const navigate = (row?: ArrangeRow) =>
      void router.push({ path: `${BASE}/arrange-detail`, query: { type: row ? "edit" : "add", id: row?.id, returnPath: route.fullPath } });
    const [PcTable, tableApi] = usePcTable({
      rowKey: "id",
      tableCode: "WORK_ARRANGE_LIST",
      autoFetch: false,
      pagination: false,
      columns: [
        { title: "公报标题", dataIndex: "title", ellipsis: true },
        { title: "公告类型", dataIndex: "typeName" },
        { title: "发布人", dataIndex: "publisherName" },
        { title: "所属部门", dataIndex: "deptName" },
        { title: "发布时间", dataIndex: "publishTime", customRender: ({ text }) => dateTime(text) },
        {
          title: "操作",
          dataIndex: "action",
          width: 200,
          customRender: ({ record }) => (
            <Button type="link" size="small" onClick={() => navigate(record as ArrangeRow)}>
              详情
            </Button>
          ),
        },
      ],
    });
    const load = async () => {
      const current = ++version;
      tableApi.loading.value = true;
      try {
        const result = await getClient().pageArrangements({
          pageNumber: pager.pageNumber,
          pageSize: pager.pageSize,
          deptId: query.deptId,
          keyword: query.keyword,
          period: query.period.join(","),
        });
        if (current === version) {
          tableApi.setDataSource(result.records);
          pager.total = result.total;
        }
      } catch (error) {
        if (current === version) {
          message.error(errorText(error, "工作安排加载失败"));
        }
      } finally {
        if (current === version) {
          tableApi.loading.value = false;
        }
      }
    };
    const schema = (): PcFormSchemaProp[] => [
      {
        component: "Select",
        fieldName: "deptId",
        label: "发布部门",
        componentProps: {
          options: departments.value.map((item) => ({ label: item.name, value: item.id })),
          allowClear: true,
          showSearch: true,
          optionFilterProp: "label",
          placeholder: "请选择部门",
        },
      },
      {
        component: "RangePicker",
        fieldName: "period",
        label: "时间",
        defaultValue: [],
        componentProps: { valueFormat: "YYYY-MM-DD", allowClear: true },
      },
      {
        component: "Input",
        fieldName: "keyword",
        label: "",
        defaultValue: "",
        componentProps: { placeholder: "请输入发布人/内容", allowClear: true },
      },
    ];
    const [PcForm, formApi] = usePcForm({
      layout: "horizontal",
      schema: schema(),
      syncStateRef: query,
      cache: true,
      actionsInline: true,
      showCollapseButton: false,
      handleSubmit() {
        pager.pageNumber = 1;
        void load();
      },
      handleReset() {
        query.deptId = undefined;
        query.period = [];
        query.keyword = "";
        pager.pageNumber = 1;
        void load();
      },
    });
    onMounted(() => {
      void load();
      void getClient()
        .listOrganizations()
        .then((items) => {
          departments.value = items;
          formApi.updateSchema(schema());
        })
        .catch((error: unknown) => message.error(errorText(error, "发布部门加载失败")));
    });
    onUnmounted(() => {
      version += 1;
    });
    return () => (
      <PageLayout
        title="工作安排"
        v-slots={{
          "layout-header": () => (
            <Button type="primary" onClick={() => navigate()}>
              新增
            </Button>
          ),
          "layout-content": () => (
            <div class={styles.content}>
              <PcForm />
              <PcTable />
            </div>
          ),
          "footer-page": () => (
            <Page
              current={pager.pageNumber}
              pageSize={pager.pageSize}
              total={pager.total}
              cachePageQuery={true}
              onPageChange={(page, size) => {
                pager.pageNumber = page;
                pager.pageSize = size;
                void load();
              }}
            />
          ),
        }}
      />
    );
  },
});
