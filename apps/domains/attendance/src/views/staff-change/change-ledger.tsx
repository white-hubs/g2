import {
  Button,
  DatePicker,
  PageLayout as Layout,
  Page,
  type PcTableColumn,
  type PickerMode,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { type VNode, defineComponent, reactive, ref, watchEffect } from "vue";

import { KEYWORD_ALIAS } from "@/keyword-alias";

import "./change-ledger.less";

/** 换班台账 */
export const ChangeLedger = defineComponent({
  setup: () => {
    // const = useRoute()
    const searchData = reactive<{
      timeType: PickerMode;
    }>({
      timeType: "month",
    });
    const pageChange = (pageNumber: number, pageSize: number): void => {
      pagination.value.pageNumber = pageNumber || 1;
      pagination.value.pageSize = pageSize;
      getTableData();
    };
    const getTableData = (): void => {};
    const reset = (): void => {
      Object.assign(searchData, {
        timeType: "month",
      });
    };
    const exportExcel = (): void => {
      exportLoading.value = true;
    };
    const layoutSlots = {
      "layout-header": (): VNode => (
        <Button type="primary" onClick={exportExcel} loading={exportLoading.value}>
          导出
        </Button>
      ),
      "layout-content": (): VNode => (
        <>
          <div class="classes-Summary-form">
            <div class="search">
              <QueryForm />
            </div>
            <div class="search">
              <PcDataTable />
            </div>
          </div>
        </>
      ),
      "footer-page": (): VNode => (
        <>
          <Page
            cachePageQuery={false}
            current={pagination.value.pageNumber}
            pageSize={pagination.value.pageSize}
            total={pagination.value.total}
            onPageChange={pageChange}
          />
        </>
      ),
    };
    const exportLoading = ref(false);
    const pagination = ref({
      pageSize: 10,
      pageNumber: 1,
      total: 0,
    });
    const dataSource = ref([{}]);
    const columns = [
      {
        title: `${KEYWORD_ALIAS.staff}姓名`,
        dataIndex: "department",
      },
      {
        title: "换班申请时间",
        dataIndex: "department",
      },
      {
        title: "换班处理时间",
        dataIndex: "department",
      },
      {
        title: "换班类型",
        dataIndex: "department",
      },
      {
        title: "换班人员",
        dataIndex: "department",
      },
      {
        title: "班次信息",
        dataIndex: "department",
      },
    ];
    const [QueryForm, queryFormApi] = usePcForm({
      layout: "inline",
      cache: false,
      schema: [
        {
          fieldName: "filter0",
          label: "",
          component: defineComponent({
            inheritAttrs: false,
            setup: () => () => (
              <>
                <DatePicker />
              </>
            ),
          }),
        },
      ],
      handleSubmit: () => void getTableData(),
      handleReset: () => void reset(),
    });
    watchEffect(() => queryFormApi.setFormValues({}));
    const [PcDataTable, tableApi] = usePcTable({
      columns: [],
      autoFetch: false,
      rowKey: "id",
      tableCode: "attendance-views-staff-change-change-ledger-tsx-0",
    });
    watchEffect(() => {
      tableApi.setColumns(columns as PcTableColumn[]);
      tableApi.setDataSource(dataSource.value);
      tableApi.loading.value = false;
    });

    return (): VNode => <Layout title="换班台账" v-slots={layoutSlots} />;
  },
});
