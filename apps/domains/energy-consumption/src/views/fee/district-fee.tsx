import { CaretDownOutlined, CaretUpFilled } from "@ant-design/icons-vue";
import { computed, defineComponent, nextTick, onMounted, ref, watch } from "vue";

import { FeeLine } from "./components/fee-line";
import { TreeSearch } from "./components/tree-search";
import { EnergyGateList, areaExcel, getChargeArea, getChargeAreaQoq } from "@/api";
import { CLayout } from "@/components/common/c-layout";
import { GLayout } from "@/components/common/g-layout";
import { TimeRadioGroup } from "@/components/time-radio-group";
import { Button, Spin, Table } from "@/pc-ui-runtime";
import type { TabState } from "@/types/fee";
import { downloadBlob, fixedNum } from "@/utils/common";

import "./district-fee.less";

export const DistrictFee = defineComponent({
  name: "DistrictFee",
  setup() {
    const scrollY = ref(0);
    const tabs = ref<TabState>({
      list: [
        { key: "electricity_meter", name: "电" },
        { key: "water_meter", name: "水" },
        { key: "gas_meter", name: "燃气" },
      ],
      activeKey: "electricity_meter",
    });
    const checkedKeys = ref<Array<string | number>>([]);
    const instrumentType = ref(tabs.value.activeKey);
    const selectInfo = ref<unknown[]>([]);
    const feeLineRef = ref<{ queryTrend: (flag?: string) => void }>();

    const qoqLoading = ref(false);
    const qoqPeriod = ref("");
    const qoqTimeFlag = ref("TODAY");
    const qoqData = ref<Array<{ title: string; amount?: number; qoq?: number; id: string }>>([
      { id: "amount", title: "总用电（元）", amount: 0, qoq: 0 },
      { id: "fvAmount", title: "峰用电（元）", amount: 0, qoq: 0 },
      { id: "pvAmount", title: "平用电（元）", amount: 0, qoq: 0 },
      { id: "gvAmount", title: "谷用电（元）", amount: 0, qoq: 0 },
    ]);

    const areaLoading = ref(false);
    const areaPeriod = ref("");
    const areaTimeFlag = ref("TODAY");
    const areaData = ref([]);
    const exportLoading = ref(false);

    const dash = ({ text }: { text: unknown }) => (text === null ? "-" : text);

    const columns = [
      { title: "区域名称", dataIndex: "projectName", key: "projectName", customRender: dash },
      { title: "总电费（元）", dataIndex: "amount", key: "amount", customRender: dash },
      { title: "峰电费（元）", dataIndex: "fvAmount", key: "fvAmount", customRender: dash },
      { title: "平电费（元）", dataIndex: "pvAmount", key: "pvAmount", customRender: dash },
      { title: "谷电费（元）", dataIndex: "gvAmount", key: "gvAmount", customRender: dash },
    ];
    const waterColumns = [
      { title: "区域名称", dataIndex: "projectName", key: "projectName", customRender: dash },
      { title: "水费（元）", dataIndex: "amount", key: "amount", customRender: dash },
    ];
    const gasColumns = [
      { title: "区域名称", dataIndex: "projectName", key: "projectName", customRender: dash },
      { title: "燃气费（元）", dataIndex: "amount", key: "amount", customRender: dash },
    ];

    const getTypeName = (type: string) => {
      switch (type) {
        case "water_meter":
          return "水";
        case "electricity_meter":
          return "电";
        case "gas_meter":
          return "燃气";
        case "vapour":
          return "热力";
        default:
          return "";
      }
    };

    const areaTitle = computed(() => getTypeName(instrumentType.value));

    const queryQoq = async (timeTypeStr?: string) => {
      qoqLoading.value = true;
      try {
        const ids = checkedKeys.value.join(",");
        if (timeTypeStr) qoqTimeFlag.value = timeTypeStr;
        if (selectInfo.value.length === 0) {
          qoqData.value = [
            {
              id: "amount",
              title: instrumentType.value === "gas_meter" ? "总燃气费（元）" : instrumentType.value == "vapour" ? "总蒸汽费" : "",
              amount: 0,
              qoq: 0,
            },
          ];
          return;
        }
        qoqData.value = [
          { id: "amount", title: "总用电（元）", amount: 0, qoq: 0 },
          { id: "fvAmount", title: "峰用电（元）", amount: 0, qoq: 0 },
          { id: "pvAmount", title: "平用电（元）", amount: 0, qoq: 0 },
          { id: "gvAmount", title: "谷用电（元）", amount: 0, qoq: 0 },
        ];
        const result = (await getChargeAreaQoq({
          filterFlag: "area",
          treeIds: selectInfo.value,
          instrumentType: instrumentType.value,
          areaIds: ids,
          timeFlag: qoqTimeFlag.value,
          period: qoqPeriod.value,
        })) as {
          data?: {
            amount?: number;
            amountQoQ?: number;
            fvAmount?: number;
            fvAmountQoQ?: number;
            pvAmount?: number;
            pvAmountQoQ?: number;
            gvAmount?: number;
            gvAmountQoQ?: number;
          };
        };
        if (result.data) {
          const { amount, amountQoQ, fvAmount, fvAmountQoQ, pvAmount, pvAmountQoQ, gvAmount, gvAmountQoQ } = result.data;
          if (instrumentType.value === "electricity_meter") {
            qoqData.value[0].amount = amount || 0;
            qoqData.value[0].qoq = amountQoQ || 0;
            qoqData.value[1].amount = fvAmount || 0;
            qoqData.value[1].qoq = fvAmountQoQ || 0;
            qoqData.value[2].amount = pvAmount || 0;
            qoqData.value[2].qoq = pvAmountQoQ || 0;
            qoqData.value[3].amount = gvAmount || 0;
            qoqData.value[3].qoq = gvAmountQoQ || 0;
          }
          if (["water_meter", "gas_meter"].includes(instrumentType.value)) {
            qoqData.value = [
              {
                id: "amount",
                title: instrumentType.value === "water_meter" ? "总水费（元）" : "总燃气费（元）",
                amount,
                qoq: amountQoQ,
              },
            ];
          }
        }
      } finally {
        qoqLoading.value = false;
      }
    };

    const queryArea = async (timeTypeStr: string) => {
      areaLoading.value = true;
      try {
        const ids = checkedKeys.value.join(",");
        areaTimeFlag.value = timeTypeStr;
        if (selectInfo.value.length === 0) return;
        const result = (await getChargeArea({
          filterFlag: "area",
          instrumentType: instrumentType.value,
          areaIds: ids,
          timeFlag: areaTimeFlag.value,
          treeIds: selectInfo.value,
          period: areaPeriod.value,
        })) as { data: never[] };
        areaData.value = result.data || [];
      } finally {
        areaLoading.value = false;
      }
    };

    const exportHandle = async () => {
      exportLoading.value = true;
      try {
        const ids = checkedKeys.value.join(",");
        const { data } = (await areaExcel({
          filterFlag: "area",
          instrumentType: instrumentType.value,
          areaIds: ids,
          timeFlag: areaTimeFlag.value,
          treeIds: selectInfo.value,
          period: areaPeriod.value,
        })) as { data: Blob };
        const blob =
          data instanceof Blob
            ? data
            : new Blob([data as BlobPart], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              });
        downloadBlob(blob, `${areaTitle.value}费明细.xlsx`);
      } finally {
        exportLoading.value = false;
      }
    };

    const queryAll = async () => {
      await queryQoq();
      await queryArea(areaTimeFlag.value);
      await nextTick();
      feeLineRef.value?.queryTrend();
    };

    watch(
      () => checkedKeys.value,
      () => void queryAll(),
    );

    const queryConfig = async () => {
      const { data } = (await EnergyGateList()) as { data: Array<{ open: boolean; energyType: string }> };
      const tabList: Array<{ key: string; name: string }> = [];
      data.forEach((item) => {
        if (item.open) tabList.push({ key: item.energyType, name: getTypeName(item.energyType) });
      });
      tabs.value.list = tabList;
    };

    onMounted(() => {
      void queryConfig();
      const clientHeight = document.getElementById("myTable")?.clientHeight;
      scrollY.value = clientHeight || 500;
      window.addEventListener("resize", () => {
        scrollY.value = document.getElementById("myTable")?.clientHeight || 500;
      });
    });

    return () => (
      <GLayout
        title="分区费用"
        class="district-fee-page"
        showSearch={false}
        contentTableScrollable
        v-slots={{
          "content-table": () => (
            <div class="flex">
              <div class="w-278 tabs p-10">
                <TreeSearch
                  v-model:value={checkedKeys.value}
                  tabs={tabs.value}
                  onTabChange={(activeKey: string) => {
                    instrumentType.value = activeKey;
                  }}
                  onCheckClick={(data: unknown[]) => {
                    selectInfo.value = data;
                    void queryArea(areaTimeFlag.value);
                  }}
                />
              </div>
              <div class="ml-15 right-panel">
                <CLayout
                  title={`用${areaTitle.value}费用统计`}
                  v-slots={{
                    "header-btn": () => (
                      <TimeRadioGroup showRangePicker v-model:value={qoqPeriod.value} onChange={(flag: string) => void queryQoq(flag)} />
                    ),
                    content: () => (
                      <Spin spinning={qoqLoading.value}>
                        <div class="flex justify-around" style="min-height:60px">
                          {qoqData.value.map((item) => (
                            <div key={item.id} class="text-center mt-15 mult mult-wrap">
                              <div class="font-400 color-muted">{item.title}</div>
                              <div class="mult-bootom">
                                <div class="font-700 mt-5 text-32">{fixedNum(item.amount || 0)}</div>
                                <div class="my-10 ml-10 text-12 color-sub">
                                  <span>
                                    环比
                                    {Number(item.qoq) < 0 ? (
                                      <CaretDownOutlined class="ml-3" />
                                    ) : (
                                      <CaretUpFilled style="color:#00B80C" class="ml-3" />
                                    )}
                                    {item.qoq || 0}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Spin>
                    ),
                  }}
                />
                <FeeLine
                  ref={feeLineRef}
                  title={`${areaTitle.value}费趋势`}
                  class="mt-15 h-460"
                  checkedKeys={checkedKeys.value}
                  instrumentType={instrumentType.value}
                  treeids={selectInfo.value}
                />
                <CLayout
                  title={`${areaTitle.value}费明细`}
                  class="mt-15"
                  v-slots={{
                    "header-btn": () => (
                      <Button type="primary" class="ml-15" loading={exportLoading.value} onClick={() => void exportHandle()}>
                        导出报表
                      </Button>
                    ),
                    content: () => (
                      <>
                        <div class="flex_top">
                          <span class="desc">单位：元</span>
                          <TimeRadioGroup
                            v-model:value={areaPeriod.value}
                            showRangePicker
                            onChange={(flag: string) => void queryArea(flag)}
                          />
                        </div>
                        <div id="myTable" class="h-460">
                          <Spin spinning={areaLoading.value}>
                            <Table
                              pagination={false}
                              columns={
                                instrumentType.value === "water_meter"
                                  ? waterColumns
                                  : instrumentType.value === "gas_meter"
                                    ? gasColumns
                                    : columns
                              }
                              dataSource={areaData.value}
                              scroll={{ y: scrollY.value }}
                            />
                          </Spin>
                        </div>
                      </>
                    ),
                  }}
                />
              </div>
            </div>
          ),
        }}
      />
    );
  },
});
