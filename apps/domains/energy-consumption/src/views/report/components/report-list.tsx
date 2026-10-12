import { defineComponent, onBeforeUnmount, onMounted, reactive, ref, watch, type PropType } from "vue";

import { AreaProjectTree, ClassifySettingsPage, classifyEnergyPage, subItemEnergyPage } from "@/api";
import {
  AntRangePicker,
  Button,
  Cascader,
  Form,
  FormItem,
  Pagination,
  Select,
  Table,
  datePickerZhCN,
  dayjs,
  type Dayjs,
} from "@/pc-ui-runtime";

type ColumnItem = Record<string, unknown>;

export const ReportList = defineComponent({
  name: "ReportList",
  props: {
    activeKey: { type: String, default: "classify" },
    refresh: { type: Boolean, default: false },
    columns: { type: Array as PropType<ColumnItem[]>, default: () => [] },
  },
  emits: ["search"],
  setup(props, { emit }) {
    const instrumentTypeOptions = ref<Array<Record<string, unknown>>>([]);
    const areaOptions = ref<Array<Record<string, unknown>>>([]);
    const scrollY = ref(100);
    const listLoading = ref(false);
    const tableList = ref<Record<string, unknown>[]>([]);
    const listColumns = ref<ColumnItem[]>([]);

    const params = reactive({
      period: [dayjs().startOf("month"), dayjs()] as [Dayjs, Dayjs],
      instrumentType: undefined as string | undefined,
      projectId: [] as string[],
      total: 0,
      pages: 1,
      pageSize: 10,
      pageNumber: 1,
    });

    const scrollHandle = () => {
      const clientHeight = document.querySelector(".layout-content")?.clientHeight;
      if (clientHeight) {
        scrollY.value = clientHeight - 220;
      }
    };

    const getTableList = async () => {
      const area = params.projectId?.length ? params.projectId[params.projectId.length - 1] : "";
      listLoading.value = true;
      const timeArr = params.period
        ? [params.period[0].startOf("day").format("YYYY-MM-DD HH:mm:ss"), params.period[1].endOf("day").format("YYYY-MM-DD HH:mm:ss")]
        : [];
      if (props.activeKey === "classify") {
        const { data } = await classifyEnergyPage({
          ...params,
          period: timeArr.join(",") ?? "",
          projectId: area,
        });
        const page = data as { records: Record<string, unknown>[]; total: number; pages: number };
        tableList.value = page.records;
        params.total = page.total;
        params.pages = page.pages;
      } else if (props.activeKey === "subItem") {
        const { data } = await subItemEnergyPage({
          ...params,
          projectCategory: "ITEM",
          period: timeArr.join(",") ?? "",
          projectId: area,
        });
        const page = data as { records: Record<string, unknown>[]; total: number; pages: number };
        tableList.value = page.records;
        params.total = page.total;
        params.pages = page.pages;
      } else {
        const { data } = await subItemEnergyPage({
          ...params,
          projectCategory: "AREA",
          period: timeArr.join(",") ?? "",
          projectId: area,
        });
        const page = data as { records: Record<string, unknown>[]; total: number; pages: number };
        tableList.value = page.records;
        params.total = page.total;
        params.pages = page.pages;
      }
      emit("search", {
        period: timeArr.join(",") ?? "",
        projectId: area,
        instrumentType: params.instrumentType,
        tableLength: tableList.value.length,
      });
      listLoading.value = false;
    };

    const tableChange = (current: number, pageSize: number) => {
      params.pageNumber = current;
      params.pageSize = pageSize;
      void getTableList();
    };

    const handleSearch = () => {
      params.pageNumber = 1;
      void getTableList();
    };

    const reset = () => {
      Object.assign(params, {
        instrumentType: undefined,
        period: [dayjs().startOf("month"), dayjs()],
        projectId: [],
        total: 0,
        pages: 1,
        pageSize: 10,
        pageNumber: 1,
      });
      void getTableList();
    };

    onMounted(async () => {
      scrollHandle();
      window.addEventListener("resize", scrollHandle);
      const { data } = await ClassifySettingsPage();
      instrumentTypeOptions.value = (data as { records: Array<Record<string, unknown>> }).records;
      const res = await AreaProjectTree({});
      areaOptions.value = res.data as Array<Record<string, unknown>>;
    });

    onBeforeUnmount(() => {
      window.removeEventListener("resize", scrollHandle);
    });

    watch(
      () => props.columns,
      () => {
        listColumns.value = props.columns ?? [];
        void getTableList();
      },
      { immediate: true, deep: true },
    );

    watch(
      () => props.activeKey,
      () => {
        void getTableList();
      },
    );

    watch(
      () => props.refresh,
      () => {
        void getTableList();
      },
    );

    return () => (
      <div>
        <div style={{ marginBottom: "20px" }}>
          <Form layout="inline" model={params}>
            <FormItem label="选择日期">
              <AntRangePicker
                value={params.period}
                locale={datePickerZhCN}
                placeholder={["开始时间", "结束时间"]}
                onUpdate:value={(v: [Dayjs, Dayjs] | [string, string] | null) => {
                  params.period = (v as [Dayjs, Dayjs] | null) ?? ([dayjs().startOf("month"), dayjs()] as [Dayjs, Dayjs]);
                }}
              />
            </FormItem>
            {props.activeKey === "classify" || props.activeKey === "area" ? (
              <FormItem label="选择分类">
                <Select
                  placeholder="请选择"
                  value={params.instrumentType}
                  style={{ width: "180px" }}
                  options={instrumentTypeOptions.value}
                  allowClear
                  fieldNames={{ label: "categoryName", value: "categoryCode" }}
                  onUpdate:value={(v) => {
                    params.instrumentType = v == null ? undefined : String(v);
                  }}
                />
              </FormItem>
            ) : null}
            {props.activeKey === "subItem" ? (
              <FormItem label="选择分项">
                <Select
                  placeholder="请选择"
                  value={params.instrumentType}
                  style={{ width: "180px" }}
                  options={instrumentTypeOptions.value}
                  allowClear
                  fieldNames={{ label: "categoryName", value: "categoryCode" }}
                  onUpdate:value={(v) => {
                    params.instrumentType = v == null ? undefined : String(v);
                  }}
                />
              </FormItem>
            ) : null}
            {props.activeKey === "area" ? (
              <FormItem label="选择区域">
                <Cascader
                  value={params.projectId}
                  placeholder="请输入"
                  changeOnSelect
                  style={{ width: "180px" }}
                  fieldNames={{ label: "areaName", value: "id", children: "children" }}
                  options={areaOptions.value}
                  onUpdate:value={(v) => {
                    const arr = Array.isArray(v) ? v : [];
                    params.projectId = arr.map((x) => String(x));
                  }}
                />
              </FormItem>
            ) : null}
            <FormItem>
              <Button type="primary" onClick={handleSearch}>
                查询
              </Button>
              <Button style={{ marginLeft: "10px" }} onClick={reset}>
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
            rowKey={(_r: unknown, index?: number) => String(index)}
          />
        </div>
        <Pagination
          total={params.total}
          current={params.pageNumber}
          pageSize={params.pageSize}
          showTotal={(total: number) => `共 ${total} 条 第${params.pageNumber}/${params.pages}页`}
          showSizeChanger
          onChange={tableChange}
          style={{ marginTop: "10px", float: "right" }}
        />
      </div>
    );
  },
});

export default ReportList;
