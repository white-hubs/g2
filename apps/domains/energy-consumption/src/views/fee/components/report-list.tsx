import { defineComponent, onMounted, reactive, ref, watch, type PropType } from "vue";

import { getEnergyReportElectricity, getEnergyReportOther, getEnergyReportTotal } from "@/api";
import { Button, Form, FormItem, Pagination, RangePicker, Table, dayjs, type Dayjs } from "@/pc-ui-runtime";

interface FeeResults {
  period: [Dayjs, Dayjs] | undefined;
  total: number;
  pageSize: number;
  pages: number;
  pageNumber: number;
}

export const ReportList = defineComponent({
  name: "ReportList",
  props: {
    activeKey: { type: String, default: "classify" },
    refresh: { type: Boolean, default: false },
    columns: {
      type: Array as PropType<Array<Record<string, unknown>>>,
      default: () => [],
    },
  },
  emits: ["search"],
  setup(props, { emit }) {
    const scrollY = ref(100);
    const listLoading = ref(false);
    const tableList = ref<unknown[]>([]);
    const listColumns = ref(props.columns);
    const params = reactive<FeeResults>({
      period: [dayjs().startOf("month"), dayjs()],
      total: 0,
      pages: 1,
      pageSize: 10,
      pageNumber: 1,
    });

    const scrollHandle = () => {
      const clientHeight = document.querySelector(".layout-content")?.clientHeight;
      if (clientHeight) scrollY.value = clientHeight - 220;
    };

    const getTableList = async () => {
      listLoading.value = true;
      try {
        const timeArr = params.period
          ? [params.period[0].startOf("day").format("YYYY-MM-DD HH:mm:ss"), params.period[1].endOf("day").format("YYYY-MM-DD HH:mm:ss")]
          : [];
        const period = timeArr.join(",") ?? "";
        let data: { records: unknown[]; total: number; pages: number };
        if (props.activeKey === "total") {
          ({ data } = (await getEnergyReportTotal({ ...params, period })) as { data: typeof data });
        } else if (props.activeKey === "electric") {
          ({ data } = (await getEnergyReportElectricity({ ...params, period })) as { data: typeof data });
        } else if (props.activeKey === "water") {
          ({ data } = (await getEnergyReportOther({
            ...params,
            instrumentTypeList: "water_meter",
            period,
          })) as { data: typeof data });
        } else {
          ({ data } = (await getEnergyReportOther({
            ...params,
            instrumentTypeList: "gas_meter",
            period,
          })) as { data: typeof data });
        }
        tableList.value = data.records;
        params.total = data.total;
        params.pages = data.pages;
        emit("search", { period, tableLength: tableList.value.length });
      } finally {
        listLoading.value = false;
      }
    };

    const tableChange = (current: number, pageSize: number) => {
      params.pageNumber = current;
      params.pageSize = pageSize;
      void getTableList();
    };

    const reset = () => {
      Object.assign(params, {
        period: undefined,
        total: 0,
        pageSize: 10,
        pageNumber: 1,
      });
      void getTableList();
    };

    onMounted(() => {
      scrollHandle();
      window.addEventListener("resize", scrollHandle);
    });

    watch(
      () => props.columns,
      () => {
        listColumns.value = props.columns;
        void getTableList();
      },
      { immediate: true, deep: true },
    );
    watch(
      () => props.activeKey,
      () => void getTableList(),
    );
    watch(
      () => props.refresh,
      () => void getTableList(),
    );

    return () => (
      <div>
        <div style="margin-bottom: 20px;">
          <Form layout="inline" model={params}>
            <FormItem label="选择日期">
              <RangePicker v-model:value={params.period} {...({ placeholder: ["开始时间", "结束时间"] } as object)} />
            </FormItem>
            <FormItem>
              <Button type="primary" onClick={() => void getTableList()}>
                查询
              </Button>
              <Button style="margin-left: 10px;" onClick={reset}>
                重置
              </Button>
            </FormItem>
          </Form>
        </div>
        <div id="myTable">
          <Table
            columns={listColumns.value}
            dataSource={tableList.value}
            scroll={{ y: scrollY.value }}
            pagination={false}
            loading={listLoading.value}
          />
        </div>
        <Pagination
          total={params.total}
          v-model:current={params.pageNumber}
          v-model:pageSize={params.pageSize}
          showTotal={(total: number) => `共 ${total} 条 第${params.pageNumber}/${params.pages}页`}
          showSizeChanger
          onChange={tableChange}
          style="margin-top: 10px;float: right;"
        />
      </div>
    );
  },
});
