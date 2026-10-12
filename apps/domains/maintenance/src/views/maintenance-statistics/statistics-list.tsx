import type { MaintenanceStatisticsRecord } from "@g2-client/maintenance/client";
import {
  Button,
  Page,
  PageLayout,
  type PcFormSchemaProp,
  type PcTableColumn,
  PopOver,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { getMaintenanceClient } from "@/domain-context";
import { downloadBlob, timeFormat, toPeriod } from "@/utils/format";
import {
  PRODUCT_CATEGORY_FIELD_NAMES,
  lastCategoryCode,
  loadProductCategoryTree,
  type ProductCategoryNode,
} from "@/utils/product-category";

const TASK_LIST_PATH = "/d/maintenance/maintenance-task";

export const MaintenanceStatisticsList = defineComponent({
  name: "MaintenanceStatisticsList",
  setup() {
    const client = getMaintenanceClient();
    const router = useRouter();
    const query = reactive<{ categoryCode?: string[]; date?: string[]; keyword: string }>({
      categoryCode: undefined,
      date: undefined,
      keyword: "",
    });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const exporting = ref(false);

    const requestQuery = (): { categoryCode?: string; keyword: string; period?: string } => ({
      categoryCode: lastCategoryCode(query.categoryCode),
      keyword: query.keyword,
      period: toPeriod(query.date),
    });

    const ellipsisCell = (text?: string | null): JSX.Element => (
      <PopOver placement="topLeft" content={text ?? ""}>
        {text || "--"}
      </PopOver>
    );

    const columns: PcTableColumn[] = [
      { title: "设备名称", dataIndex: "name", ellipsis: true, customRender: ({ text }) => ellipsisCell(text as string | undefined) },
      {
        title: "产品品类",
        dataIndex: "categoryName",
        ellipsis: true,
        customRender: ({ text }) => ellipsisCell(text as string | undefined),
      },
      {
        title: "维保次数",
        dataIndex: "num",
        ellipsis: true,
        // 旧页点击次数跳转到「已完成」任务列表，并按设备名称过滤。
        customRender: ({ text, record }) => (
          <Button
            type="link"
            onClick={() =>
              void router.push({
                path: TASK_LIST_PATH,
                query: { deviceName: (record as MaintenanceStatisticsRecord).name ?? "", type: "COMPLETED" },
              })
            }
          >
            {text ?? "--"}
          </Button>
        ),
      },
      {
        title: "最近维保时间",
        dataIndex: "lastTime",
        ellipsis: true,
        customRender: ({ text }) => ellipsisCell(timeFormat(text as string | undefined, true)),
      },
    ];

    const [PcTable, tableApi] = usePcTable({
      columns,
      rowKey: "id",
      tableCode: "MAINTENANCE_STATISTICS",
      autoFetch: false,
      fetchApi: async () => client.pageDeviceStatistics({ pageNumber: page.pageNumber, pageSize: page.pageSize, ...requestQuery() }),
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });

    const search = (): void => {
      page.pageNumber = 1;
      tableApi.query();
    };

    const exportStatistics = async (): Promise<void> => {
      if (exporting.value) {
        return;
      }
      exporting.value = true;
      try {
        downloadBlob(await client.exportDeviceStatistics(requestQuery()), "维保统计.xlsx");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "导出失败");
      } finally {
        exporting.value = false;
      }
    };

    const categorySchema = (options: ProductCategoryNode[]): PcFormSchemaProp => ({
      component: "Cascader",
      fieldName: "categoryCode",
      label: "产品品类",
      defaultValue: undefined,
      componentProps: {
        placeholder: "请选择产品品类",
        options,
        fieldNames: PRODUCT_CATEGORY_FIELD_NAMES,
        changeOnSelect: true,
        allowClear: true,
        style: { width: "220px" },
      },
    });

    const [PcForm, formApi] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      schema: [
        categorySchema([]),
        {
          component: "RangePicker",
          fieldName: "date",
          label: "时间范围",
          defaultValue: undefined,
          componentProps: { valueFormat: "YYYY-MM-DD", allowClear: true },
        },
        {
          component: "Input",
          fieldName: "keyword",
          label: "",
          defaultValue: "",
          componentProps: { placeholder: "设备名称", allowClear: true },
        },
      ],
      handleSubmit: () => {
        search();
      },
      handleReset: () => {
        query.categoryCode = undefined;
        query.date = undefined;
        query.keyword = "";
        search();
      },
    });

    onMounted(() => {
      tableApi.query();
      loadProductCategoryTree()
        .then((tree) => {
          formApi.updateFieldSchema(categorySchema(tree));
        })
        .catch((error: unknown) => {
          message.error(error instanceof Error ? error.message : "产品品类加载失败");
        });
    });

    const slots = {
      "layout-header": () => (
        <Button type="primary" loading={exporting.value} onClick={() => void exportStatistics()}>
          导出
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
          cachePageQuery
          current={page.pageNumber}
          pageSize={page.pageSize}
          total={page.total}
          onPageChange={(pageNumber: number, pageSize: number) => {
            page.pageNumber = pageNumber;
            page.pageSize = pageSize;
            tableApi.query();
          }}
        />
      ),
    };

    return () => <PageLayout title="维保统计" v-slots={slots} />;
  },
});
