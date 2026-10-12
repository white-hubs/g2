import { CaretUpFilled } from "@ant-design/icons-vue";
import { defineComponent, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { getChargeBathTrend, getComprehensiveRatioCost, getEnergyReportTotal, getReportChargeTrend, getReportPieChart } from "@/api";
import { CLayout } from "@/components/common/c-layout";
import { GLayout } from "@/components/common/g-layout";
import { EBar } from "@/components/echart/e-bar";
import { ELine } from "@/components/echart/e-line";
import { EPie } from "@/components/echart/e-pie";
import { TimeButtonGroup } from "@/components/time-button-group";
import { Empty, Pagination, RadioGroup, Table } from "@/pc-ui-runtime";
import { fixedNum, timeFormat } from "@/utils/common";

import "./fee-overview.less";

const BASE = "/d/energy-consumption";

interface FeeBarDataType {
  name: string;
  tips: string;
  data: string[];
  type: string;
  stack: string;
}

type TimeFlag = "THIS_WEEK" | "THIS_MONTH" | "THIS_YEAR";

export const FeeOverview = defineComponent({
  name: "FeeOverview",
  setup() {
    const router = useRouter();
    const feeTypeName: Record<string, string> = {
      total: "总费用",
      electricity_meter: "总电费",
      water_meter: "总水费",
      gas_meter: "总燃气费",
    };

    const dataStatistics = ref<Array<{ title: string; content: { current: number; ringRatio: number } }>>([]);
    const comprehensiveTimeData = ref<{ timeFlag: TimeFlag; period: string }>({ timeFlag: "THIS_WEEK", period: "" });

    const getComprehensive = async (period?: string, timeFlag?: TimeFlag) => {
      comprehensiveTimeData.value.timeFlag = timeFlag ?? "THIS_WEEK";
      comprehensiveTimeData.value.period = period ?? "";
      const { data } = (await getComprehensiveRatioCost({
        timePeriodType: comprehensiveTimeData.value.timeFlag,
        period: comprehensiveTimeData.value.period,
        instrumentTypeList: "water_meter,gas_meter,electricity_meter",
      })) as { data: Record<string, { current: number; ringRatio: number }> };
      dataStatistics.value = [];
      Object.keys(data || {}).forEach((x) => {
        dataStatistics.value.push({ title: feeTypeName[x], content: data[x] });
      });
    };

    const feesType = ref("");
    const feesTypes = [
      { label: "总费用", value: "" },
      { label: "总电费", value: "electricity_meter" },
      { label: "总水费", value: "water_meter" },
      { label: "总燃气费", value: "gas_meter" },
    ];
    const chargeTrendTimeData = ref<{ timeFlag: TimeFlag; period: string }>({ timeFlag: "THIS_WEEK", period: "" });
    const xChargeTrend = ref<string[]>([]);
    const xChargeSeries = ref<number[]>([]);
    const eLineRef = ref<{ render: () => void }>();

    const getChargeTrend = async (period?: string, timeFlag?: TimeFlag) => {
      chargeTrendTimeData.value.timeFlag = timeFlag ?? "THIS_WEEK";
      chargeTrendTimeData.value.period = period ?? "";
      const { data: energyTrend } = (await getReportChargeTrend({
        timePeriodType: chargeTrendTimeData.value.timeFlag,
        period: chargeTrendTimeData.value.period,
        instrumentTypeList: feesType.value,
      })) as { data: Array<{ trendX: string; trendY: number }> };
      xChargeTrend.value = energyTrend.map((res) => res.trendX.toString());
      xChargeSeries.value = energyTrend.map((res) => res.trendY);
      eLineRef.value?.render();
    };

    const proportionOfFeeData = ref<Array<{ value: number; name: string }>>([]);
    const feeProportionTimeData = ref<{ timeFlag: TimeFlag; period: string }>({ timeFlag: "THIS_WEEK", period: "" });
    const ePieRef = ref<{ render: () => void }>();

    const getProportionFeeData = async (period?: string, timeFlag?: TimeFlag) => {
      feeProportionTimeData.value.timeFlag = timeFlag ?? "THIS_WEEK";
      feeProportionTimeData.value.period = period ?? "";
      const { data } = (await getReportPieChart({
        timePeriodType: feeProportionTimeData.value.timeFlag,
        period: feeProportionTimeData.value.period,
        instrumentTypeList: "water_meter,gas_meter,electricity_meter",
      })) as { data: Record<string, number> };
      const nameMap: Record<string, string> = {
        electricity_meter: "电费",
        water_meter: "水费",
        gas_meter: "燃气费",
      };
      proportionOfFeeData.value = [];
      Object.keys(data || {}).forEach((x) => {
        proportionOfFeeData.value.push({ name: nameMap[x], value: data[x] });
      });
      ePieRef.value?.render();
    };

    const classifyTimeData = ref<{ timeFlag: TimeFlag; period: string }>({ timeFlag: "THIS_WEEK", period: "" });
    const customTooltip = {
      show: true,
      trigger: "axis",
      formatter: (params: Array<{ value?: number; seriesName: string; color: string }>) => {
        let tooltipContent = "";
        for (let i = 0; i < params.length; i++) {
          if (params[i].value) {
            tooltipContent += `
        <div style="display:inline-block;border-radius:50%;background:${params[i].color};width:10px;height:10px"></div>
        ${params[i].seriesName} :${params[i].value} <br>`;
          }
        }
        return tooltipContent;
      },
    };
    const classifyYData = ref<FeeBarDataType[]>([]);
    const classifyXData = ref<string[]>([]);
    const classifyLegendNames = ref<string[]>([]);

    const getClassifyData = async (period?: string, timeFlag?: TimeFlag) => {
      classifyTimeData.value.timeFlag = timeFlag ?? "THIS_WEEK";
      classifyTimeData.value.period = period ?? "";
      classifyYData.value = [];
      classifyXData.value = [];
      const { data } = (await getChargeBathTrend({
        timePeriodType: classifyTimeData.value.timeFlag,
        period: classifyTimeData.value.period,
        instrumentTypeList: "water_meter,gas_meter,electricity_meter",
      })) as { data: Record<string, Array<{ trendX: string; trendY: string }>> };
      Object.keys(data || {}).forEach((x) => {
        data[x].forEach((i) => {
          classifyXData.value.push(i.trendX);
        });
      });
      classifyXData.value = [...new Set(classifyXData.value)];
      const nameMap: Record<string, string> = {
        electricity_meter: "电费",
        water_meter: "水费",
        gas_meter: "燃气费",
      };
      const seriesList: FeeBarDataType[] = [];
      Object.keys(data || {}).forEach((x) => {
        seriesList.push({
          name: nameMap[x],
          tips: x,
          data: Array.from({ length: classifyXData.value.length }, () => "0"),
          type: "bar",
          stack: "x",
        });
      });
      classifyLegendNames.value = seriesList.map((x) => x.name);
      seriesList.forEach((x) => {
        Object.keys(data).forEach((i) => {
          if (i === x.tips) {
            data[i].forEach((n) => {
              const index = classifyXData.value.findIndex((c) => c === n.trendX);
              x.data.splice(index, 1, n.trendY);
            });
          }
        });
      });
      classifyYData.value = seriesList;
    };

    const listColumns = [
      {
        dataIndex: "statDate",
        title: "日期",
        customRender: ({ text }: { text: string }) => timeFormat(text, false),
      },
      { dataIndex: "totalCost", title: "总费用（元）" },
      {
        dataIndex: "electricityCost",
        title: "电费（元）",
        customRender: ({ text }: { text: string }) => text || "--",
      },
      {
        dataIndex: "waterCost",
        title: "水费（元）",
        customRender: ({ text }: { text: string }) => text || "--",
      },
      {
        dataIndex: "gasCost",
        title: "燃气费（元）",
        customRender: ({ text }: { text: string }) => text || "--",
      },
    ];
    const feeList = ref<unknown[]>([]);
    const listLoading = ref(false);
    const pagination = reactive({
      total: 0,
      pages: 1,
      pageSize: 10,
      current: 1,
    });

    const getFeeList = async () => {
      listLoading.value = true;
      try {
        const { data } = (await getEnergyReportTotal({
          total: pagination.total,
          pageSize: pagination.pageSize,
          pageNumber: pagination.current,
        })) as { data: { records: unknown[]; total: number; pages: number } };
        feeList.value = data.records;
        pagination.total = data.total;
        pagination.pages = data.pages;
      } finally {
        listLoading.value = false;
      }
    };

    const pageChange = (current: number, pageSize: number) => {
      pagination.current = current;
      pagination.pageSize = pageSize;
      pagination.pages = Math.ceil(pagination.total / pagination.pageSize);
      void getFeeList();
    };

    onMounted(() => {
      void getComprehensive();
      void getChargeTrend();
      void getProportionFeeData();
      void getClassifyData();
      void getFeeList();
    });

    return () => (
      <GLayout
        title="费用总览"
        class="fee-overview-page"
        showSearch={false}
        contentTableScrollable
        v-slots={{
          "content-table": () => (
            <>
              <CLayout
                title="综合费用"
                v-slots={{
                  "header-btn": () => (
                    <TimeButtonGroup
                      v-model:value={comprehensiveTimeData.value.period}
                      onChange={(period: string, timeFlag?: TimeFlag) => void getComprehensive(period, timeFlag)}
                    />
                  ),
                  content: () => (
                    <div
                      class="dataStatistics"
                      style={dataStatistics.value.length >= 2 ? "justify-content: space-around;overflow: auto;" : ""}
                    >
                      {dataStatistics.value.map((item, index) => (
                        <div key={index} class="Statistics">
                          <div>
                            <div>
                              <span class="name" style="color: #909399">
                                {item.title}
                              </span>
                            </div>
                            <div style="margin-top: 10px; font-size: 20px">{fixedNum(item.content.current)}</div>
                            <div style="font-size: 12px; margin-top: 0px">
                              环比
                              <CaretUpFilled style={item.content.ringRatio > 0 ? "color: red" : "color: #00b80c"} />
                              {item.content.ringRatio}%
                            </div>
                          </div>
                        </div>
                      ))}
                      {dataStatistics.value.length === 0 ? <Empty /> : null}
                    </div>
                  ),
                }}
              />
              <div class="mt-15px fee-flex">
                <CLayout
                  title="费用趋势"
                  class="w-50"
                  v-slots={{
                    "header-btn": () => (
                      <TimeButtonGroup
                        v-model:value={chargeTrendTimeData.value.period}
                        onChange={(period: string, timeFlag?: TimeFlag) => void getChargeTrend(period, timeFlag)}
                      />
                    ),
                    default: () => (
                      <div style="display: flex; height: 400px">
                        <div style="width: 100%; position: relative">
                          <div style="display: flex; justify-content: space-between; margin: 0 10px">
                            <RadioGroup v-model:value={feesType.value} options={feesTypes} onChange={() => void getChargeTrend()} />
                            <div>单位：元</div>
                          </div>
                          {xChargeTrend.value.length ? (
                            <ELine
                              ref={eLineRef}
                              xData={xChargeTrend.value}
                              rotate={45}
                              series={[
                                {
                                  name: feeTypeName[feesType.value] ?? "总费用",
                                  type: "line",
                                  data: xChargeSeries.value,
                                },
                              ]}
                            />
                          ) : (
                            <Empty description="暂无趋势数据" />
                          )}
                        </div>
                      </div>
                    ),
                  }}
                />
                <CLayout
                  title="费用占比"
                  class="w-50 ml-10"
                  v-slots={{
                    "header-btn": () => (
                      <TimeButtonGroup
                        v-model:value={feeProportionTimeData.value.period}
                        onChange={(period: string, timeFlag?: TimeFlag) => void getProportionFeeData(period, timeFlag)}
                      />
                    ),
                    default: () => (
                      <div style="display: flex; height: 400px">
                        {proportionOfFeeData.value.length > 0 ? (
                          <div style="width: 100%; position: relative">
                            <EPie
                              ref={ePieRef}
                              data={proportionOfFeeData.value}
                              legend={{ bottom: "0", type: "scroll", orient: "horizontal" }}
                            />
                          </div>
                        ) : (
                          <Empty description="暂无费用占比数据" />
                        )}
                      </div>
                    ),
                  }}
                />
              </div>
              <CLayout
                title="分类费用分布"
                class="mt-15px h-460"
                v-slots={{
                  "header-btn": () => (
                    <TimeButtonGroup
                      v-model:value={classifyTimeData.value.period}
                      onChange={(period: string, timeFlag?: TimeFlag) => void getClassifyData(period, timeFlag)}
                    />
                  ),
                  content: () =>
                    classifyYData.value.length > 0 ? (
                      <div class="h-400">
                        <EBar
                          legend={{ data: classifyLegendNames.value }}
                          customTooltip={customTooltip}
                          xAxis={{ data: classifyXData.value }}
                          ydata={[...classifyYData.value]}
                        />
                      </div>
                    ) : (
                      <Empty />
                    ),
                }}
              />
              <CLayout
                title="费用报表"
                class="mt-15px h-460"
                v-slots={{
                  "header-btn": () => (
                    <div
                      style="color: var(--ant-color-primary, #1677ff); cursor: pointer"
                      onClick={() => void router.push(`${BASE}/fee-report`)}
                    >
                      查看更多
                    </div>
                  ),
                  default: () =>
                    feeList.value.length > 0 ? (
                      <div style="width: 100%">
                        <Table
                          style="margin: 0 10px"
                          columns={listColumns}
                          dataSource={feeList.value}
                          scroll={{ y: 200 }}
                          pagination={false}
                          loading={listLoading.value}
                        />
                        <Pagination
                          style="float: right; margin: 20px"
                          v-model:current={pagination.current}
                          v-model:pageSize={pagination.pageSize}
                          total={pagination.total}
                          onChange={pageChange}
                        />
                      </div>
                    ) : (
                      <Empty />
                    ),
                }}
              />
            </>
          ),
        }}
      />
    );
  },
});
