import { CaretUpFilled } from "@ant-design/icons-vue";
import type { SeriesOption } from "echarts";
import { defineComponent, nextTick, onMounted, reactive, ref } from "vue";

import { TypeTree } from "./type-tree";
import {
  ClassifySettingsPage,
  EnergyProportionStatistics,
  EnergySituation,
  getDeviceUseRanking,
  getDeviceUseTrend,
  UsageSubItemProperty,
  UsageSubItemTrend,
  UsageTrend,
} from "@/api";
import one from "@/assets/1.png";
import two from "@/assets/2.png";
import three from "@/assets/3.png";
import { CLayout } from "@/components/common/c-layout";
import { GLayout } from "@/components/common/g-layout";
import { EBar } from "@/components/echart/e-bar";
import { EBarRank } from "@/components/echart/e-bar-rank";
import { ELine } from "@/components/echart/e-line";
import { EPie } from "@/components/echart/e-pie";
import { TimeRadioGroup } from "@/components/time-radio-group";
import { Empty, Pagination, Radio, RadioGroup } from "@/pc-ui-runtime";
import { fixedNum } from "@/utils/common";

import "./dosage-analysis.less";

const RadioButton = Radio.Button;

const unitMap = new Map([
  ["electricity_meter", "kWh"],
  ["water_meter", "m³"],
  ["gas_meter", "m³"],
  ["fuel_meter", "kg"],
  ["heat_meter", "kg"],
  ["cool_meter", "m³"],
  ["renewable_energy", "kWh"],
  ["other", "kWh"],
]);

const rankColor = (index: number) => {
  if (index === 0) return "#FF4070";
  if (index === 1 || index === 2) return "#fd833c";
  if (index === 3 || index === 4) return "#fdcc49";
  if (index === 5 || index === 6) return "#4fc1ff";
  return "#5654F5";
};

const customTooltip = {
  show: true,
  trigger: "axis",
  formatter: (params: Array<{ value?: number; seriesName?: string; color?: string }>) => {
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

export const DosageAnalysisPage = defineComponent({
  name: "DosageAnalysisPage",
  setup() {
    const typeOptions = ref<Array<{ categoryName: string; categoryCode: string }>>([]);
    const instrumentType = ref("electricity_meter");
    const search = reactive<{ searchType: string[]; tabType: string }>({ searchType: [], tabType: "" });
    const usageSituation = ref([
      { title: "日总用能", num: 0 as number | string, image: one, hb: 0 as number | string },
      { title: "月总用能", num: 0 as number | string, image: three, hb: 0 as number | string },
      { title: "年总用能", num: 0 as number | string, image: two, hb: 0 as number | string },
    ]);
    const trendTimeData = ref<{ type: string; period: string }>({ type: "TODAY", period: "" });
    const trendXData = ref<string[]>([]);
    const trendsTimeSeries = ref<number[]>([]);
    const distributionTimeData = ref<{ type: string; period: string }>({ type: "TODAY", period: "" });
    const distributionYData = ref<SeriesOption[]>([]);
    const distributionXData = ref<string[]>([]);
    const usageProportionateData = ref<{ type: string; period: string }>({ type: "TODAY", period: "" });
    const proportionOfUsageData = ref<Array<{ value: number; name: string }>>([]);
    const rankTimeData = ref<{ type: string; period: string }>({ type: "TODAY", period: "" });
    const consumptionRankingRef = ref(14);
    const consumptionRankingList = ref<Array<{ name: string; value: number }>>([]);
    const rankLineWidth = ref(400);
    const energyStaticsTimeData = ref<{ type: string; period: string }>({ type: "TODAY", period: "" });
    const energyStaticsXData = ref<string[]>([]);
    const energyStaticsYData = ref<SeriesOption[]>([]);
    const energyRankTimeData = ref<{ type: string; period: string }>({ type: "TODAY", period: "" });
    const energyRankXData = ref<{ type: string; data: string[] }>({ type: "category", data: [] });
    const energyRankYData = ref<{ name: string; data: number[]; type: string }>({
      name: "energyRank",
      data: [],
      type: "bar",
    });
    const pagination = reactive({ pageNumber: 1, pageSize: 10, total: 0 });

    const setTreeHeight = () => {
      void nextTick(() => {
        const rightStat = document.querySelector<HTMLElement>(".right-stat");
        const treeLists = document.querySelectorAll<HTMLElement>(".energy-tree-list");
        if (rightStat) {
          const height = `${(rightStat.clientHeight || 1000) - 100}px`;
          treeLists.forEach((el) => {
            el.style.maxHeight = height;
          });
        }
      });
    };

    const getEnergySituation = async () => {
      const { data } = await EnergySituation({ instrumentType: instrumentType.value });
      const d = data as {
        qoqDayValueRate?: number;
        dayValue?: number;
        qoqMonthValueRate?: number;
        monthValue?: number;
        qoqYearValueRate?: number;
        yearValue?: number;
      };
      usageSituation.value[0].hb = d.qoqDayValueRate ?? "--";
      usageSituation.value[0].num = d.dayValue ?? "--";
      usageSituation.value[1].hb = d.qoqMonthValueRate ?? "--";
      usageSituation.value[1].num = d.monthValue ?? "--";
      usageSituation.value[2].hb = d.qoqYearValueRate ?? "--";
      usageSituation.value[2].num = d.yearValue ?? "--";
    };

    const getUsageTrend = async () => {
      const { data } = await UsageTrend({
        ...trendTimeData.value,
        instrumentType: instrumentType.value,
        projectCategory: search.tabType,
        projectIds: search.searchType.join(","),
      });
      const list = (data as Array<{ time: string | number; value: number }>) || [];
      trendXData.value = list.map((res) => res.time.toString());
      trendsTimeSeries.value = list.map((res) => res.value);
    };

    const getDistributionData = async () => {
      distributionYData.value = [];
      distributionXData.value = [];
      const { data } = await UsageSubItemTrend({
        ...distributionTimeData.value,
        instrumentType: instrumentType.value,
        projectCategory: search.tabType,
        projectIds: search.searchType.join(","),
      });
      const list = (data as Array<{ time: string | number; name: string; value: number }>) || [];
      distributionXData.value = list.map((x) => x.time.toString());
      const seriesList: Array<{ name: string; data: number[]; type: string; stack: string }> = [];
      list.forEach((item) => {
        if (!seriesList.find((x) => x.name === item.name)) {
          seriesList.push({ name: item.name, data: Array.from({ length: list.length }, () => 0), type: "bar", stack: "x" });
        }
      });
      seriesList.forEach((x) => {
        list.forEach((item, index) => {
          if (x.name === item.name) x.data.splice(index, 1, item.value);
        });
      });
      distributionYData.value = seriesList as SeriesOption[];
    };

    const getSubItemProperty = async () => {
      const { data } = await UsageSubItemProperty({
        ...usageProportionateData.value,
        instrumentType: instrumentType.value,
        projectCategory: search.tabType,
        projectIds: search.searchType.join(","),
      });
      proportionOfUsageData.value = ((data as Array<{ name: string; value: number }>) || [])
        .map((res) => ({ value: res.value, name: res.name }))
        .filter((res) => res.value !== 0);
    };

    const getRankEnergyData = async () => {
      const { data: electricityconsumptionranking } = await EnergyProportionStatistics({
        period: rankTimeData.value.period,
        instrumentType: instrumentType.value,
        projectCategory: search.tabType,
        projectIds: search.searchType.join(","),
      });
      const list = (electricityconsumptionranking as Array<{ name: string; value: number }>) || [];
      consumptionRankingList.value = list;
      consumptionRankingRef.value = list.map((x) => x.value).toSorted((a, b) => b - a)[0] || 1;
      await nextTick();
      const rankDom = document.getElementById("consumptionRanking");
      rankLineWidth.value = rankDom ? rankDom.clientWidth - 100 : 600;
    };

    const getEnergyStaticsData = async () => {
      const { data } = await getDeviceUseTrend({
        ...energyStaticsTimeData.value,
        instrumentType: instrumentType.value,
        deviceId: search.searchType.join(","),
      });
      const list = (data as Array<{ trendX: string | number; trendY: number }>) || [];
      energyStaticsXData.value = list.map((res) => res.trendX.toString());
      energyStaticsYData.value = [
        {
          name: "用能统计",
          data: list.map((res) => res.trendY),
          type: "bar",
          barMaxWidth: 40,
          stack: "x",
        },
      ];
    };

    const getEnergyRankData = async () => {
      energyRankXData.value = { type: "category", data: [] };
      energyRankYData.value = { name: "energyRank", data: [], type: "bar" };
      const { data } = await getDeviceUseRanking({
        period: energyRankTimeData.value.period,
        instrumentType: instrumentType.value,
        pageSize: pagination.pageSize,
        pageNumber: pagination.pageNumber,
      });
      const page = data as { total?: number; records?: Array<{ value: string; code: string | number }> };
      pagination.total = page.total || 0;
      const records = (page.records || []).toSorted((a, b) => Number(a.value) - Number(b.value));
      energyRankXData.value = { type: "category", data: records.map((x) => x.code.toString()) };
      energyRankYData.value = {
        name: "energyRank",
        data: records.map((x) => Number(x.value)),
        type: "bar",
      };
    };

    const getData = () => {
      void nextTick(async () => {
        if (search.tabType !== "DEVICE") {
          await Promise.all([getDistributionData(), getSubItemProperty(), getUsageTrend(), getRankEnergyData()]);
        } else {
          pagination.pageNumber = 1;
          await getEnergyStaticsData();
          if (search.searchType.length > 0) await getEnergyRankData();
        }
        await getEnergySituation();
        const { data } = await ClassifySettingsPage();
        typeOptions.value = ((data as { records?: typeof typeOptions.value })?.records || []) as typeof typeOptions.value;
      });
    };

    const checkedClick = (searchType: string[], tabType: string) => {
      search.searchType = searchType.map(String);
      search.tabType = tabType;
      getData();
      setTreeHeight();
    };

    onMounted(() => {
      getData();
    });

    return () => (
      <GLayout title="用能分析" showSearch={false} contentTableScrollable class="dosage-analysis-page">
        {{
          "content-table": () => (
            <div>
              <CLayout title="用能情况" class="energy-h-250">
                {{
                  "header-btn": () => (
                    <RadioGroup
                      value={instrumentType.value}
                      buttonStyle="solid"
                      onUpdate:value={(v: string) => {
                        instrumentType.value = v;
                        getData();
                      }}
                    >
                      {typeOptions.value.map((item) => (
                        <RadioButton key={item.categoryCode} value={item.categoryCode}>
                          {item.categoryName}
                        </RadioButton>
                      ))}
                    </RadioGroup>
                  ),
                  content: () => (
                    <div class="energy-flex-between">
                      {usageSituation.value.map((item) => (
                        <div class="energy-w-30 energy-text-center energy-mt-30" key={item.title}>
                          <div class="energy-font-400">
                            {item.title}
                            {unitMap.get(instrumentType.value)}
                          </div>
                          <div class="energy-font-900 energy-mt-5 energy-text-32">{fixedNum(Number(item.num))}</div>
                          <div class="energy-my-10 energy-text-12 energy-color-sub">
                            <span>
                              环比 <CaretUpFilled style={{ color: "#00b80c" }} />
                              {item.hb}%
                            </span>
                          </div>
                          <div>
                            <img src={item.image} alt="" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ),
                }}
              </CLayout>

              <div class="energy-flex">
                <div class="energy-w-16 energy-bg-white energy-mt-15 energy-mr-10 energy-p-10">
                  <TypeTree activeKey="ITEM" instrumentType={instrumentType.value} onCheckedItem={checkedClick} class="energy-type-tree" />
                </div>
                <div class="energy-w-87">
                  {search.tabType === "DEVICE" ? (
                    <div class="right-stat">
                      <CLayout title="用能统计" class="energy-mt-15 energy-h-460">
                        {{
                          "header-btn": () => (
                            <TimeRadioGroup
                              showRangePicker
                              onUpdate:value={(v: string) => {
                                energyStaticsTimeData.value.period = v;
                              }}
                              onChange={(time: string) => {
                                energyStaticsTimeData.value.type = time;
                                void getEnergyStaticsData();
                              }}
                            />
                          ),
                          content: () =>
                            energyStaticsYData.value.length > 0 ? (
                              <div class="energy-h-400">
                                <EBar
                                  name={`单位：${unitMap.get(instrumentType.value)}`}
                                  legend={{ show: false }}
                                  xAxis={{ data: energyStaticsXData.value }}
                                  ydata={[...energyStaticsYData.value]}
                                />
                              </div>
                            ) : (
                              <Empty />
                            ),
                        }}
                      </CLayout>
                      {search.searchType.length === 0 ? (
                        <CLayout title="用能排名" class="energy-mt-15 energy-h-500">
                          {{
                            "header-btn": () => (
                              <TimeRadioGroup
                                showRangePicker
                                onUpdate:value={(v: string) => {
                                  energyRankTimeData.value.period = v;
                                }}
                                onChange={(time: string) => {
                                  energyRankTimeData.value.type = time;
                                  pagination.pageNumber = 1;
                                  void getEnergyRankData();
                                }}
                              />
                            ),
                            content: () =>
                              energyRankYData.value?.data?.length ? (
                                <div class="energy-h-450">
                                  <div class="energy-h-400">
                                    <EBarRank
                                      name={`单位：${unitMap.get(instrumentType.value)}`}
                                      legend={{ show: false }}
                                      customTooltip={customTooltip}
                                      yAxis={energyRankXData.value as never}
                                      series={energyRankYData.value as never}
                                    />
                                  </div>
                                  <Pagination
                                    style={{ textAlign: "right" }}
                                    showSizeChanger
                                    showQuickJumper
                                    current={pagination.pageNumber}
                                    pageSize={pagination.pageSize}
                                    total={pagination.total}
                                    onChange={(page) => {
                                      pagination.pageNumber = page;
                                      void getEnergyRankData();
                                    }}
                                    onShowSizeChange={(_pageNumber, pageSize) => {
                                      pagination.pageSize = pageSize;
                                      void getEnergyRankData();
                                    }}
                                  />
                                </div>
                              ) : (
                                <div class="energy-h-300">
                                  <Empty />
                                </div>
                              ),
                          }}
                        </CLayout>
                      ) : null}
                    </div>
                  ) : (
                    <div class="right-stat">
                      <CLayout title="用能趋势图" class="energy-mt-15 energy-h-460">
                        {{
                          "header-btn": () => (
                            <TimeRadioGroup
                              showRangePicker
                              onUpdate:value={(v: string) => {
                                trendTimeData.value.period = v;
                              }}
                              onChange={(time: string) => {
                                trendTimeData.value.type = time;
                                void getUsageTrend();
                              }}
                            />
                          ),
                          content: () =>
                            trendsTimeSeries.value.length > 0 ? (
                              <div class="energy-h-400">
                                <ELine
                                  title={`单位：${unitMap.get(instrumentType.value)}`}
                                  legend={{ data: ["用能趋势"], top: "top" }}
                                  xData={trendXData.value}
                                  series={[
                                    {
                                      name: "用能趋势",
                                      type: "line",
                                      smooth: true,
                                      data: trendsTimeSeries.value,
                                      areaStyle: {},
                                    },
                                  ]}
                                />
                              </div>
                            ) : (
                              <Empty />
                            ),
                        }}
                      </CLayout>

                      <CLayout title="用能分布" class="energy-mt-15 energy-h-460">
                        {{
                          "header-btn": () => (
                            <TimeRadioGroup
                              showRangePicker
                              onUpdate:value={(v: string) => {
                                distributionTimeData.value.period = v;
                              }}
                              onChange={(time: string) => {
                                distributionTimeData.value.type = time;
                                void getDistributionData();
                              }}
                            />
                          ),
                          content: () =>
                            distributionYData.value.length > 0 ? (
                              <div class="energy-h-400">
                                <EBar
                                  name={`单位：${unitMap.get(instrumentType.value)}`}
                                  legend={{ show: false }}
                                  customTooltip={customTooltip}
                                  xAxis={{ data: distributionXData.value }}
                                  ydata={[...distributionYData.value]}
                                />
                              </div>
                            ) : (
                              <Empty />
                            ),
                        }}
                      </CLayout>

                      <div class="energy-flex-between energy-my-10 energy-min-h-270">
                        <CLayout title="用能占比统计" class="energy-w-49">
                          {{
                            "header-btn": () => (
                              <TimeRadioGroup
                                showRangePicker
                                onUpdate:value={(v: string) => {
                                  usageProportionateData.value.period = v;
                                }}
                                onChange={(time: string) => {
                                  usageProportionateData.value.type = time;
                                  void getSubItemProperty();
                                }}
                              />
                            ),
                            content: () => (
                              <>
                                <div class="energy-p-5 energy-flex">
                                  <div class="energy-text-12 energy-w-150 energy-color-hint" style={{ lineHeight: "34px" }}>
                                    单位：{unitMap.get(instrumentType.value)}
                                  </div>
                                </div>
                                {proportionOfUsageData.value.length > 0 ? (
                                  <div class="energy-h-240">
                                    <EPie
                                      data={proportionOfUsageData.value}
                                      legend={{ bottom: "0", type: "scroll", orient: "horizontal" }}
                                    />
                                  </div>
                                ) : (
                                  <Empty />
                                )}
                              </>
                            ),
                          }}
                        </CLayout>

                        <CLayout title={search.tabType === "AREA" ? "区域排名" : "分项排名"} class="energy-w-49">
                          {{
                            "header-btn": () => (
                              <TimeRadioGroup
                                showRangePicker
                                onUpdate:value={(v: string) => {
                                  rankTimeData.value.period = v;
                                }}
                                onChange={(time: string) => {
                                  rankTimeData.value.type = time;
                                  void getRankEnergyData();
                                }}
                              />
                            ),
                            content: () => (
                              <>
                                <div class="energy-text-12 energy-w-150 energy-color-hint energy-p-5" style={{ lineHeight: "34px" }}>
                                  单位：{unitMap.get(instrumentType.value)}
                                </div>
                                {consumptionRankingList.value?.length ? (
                                  <div id="consumptionRanking" class="energy-h-400 energy-overflow-auto">
                                    {consumptionRankingList.value.map((item, index) => (
                                      <div class="energy-p-15 energy-flex" key={index}>
                                        <div class="energy-flex energy-color-rank">
                                          <div
                                            class="energy-w-20 energy-h-20 energy-rd-full energy-text-center energy-color-white"
                                            style={{ background: rankColor(index) }}
                                          >
                                            {index + 1}
                                          </div>
                                          <div class="energy-text-12 energy-ml-10 energy-mr-10">{item.name}</div>
                                        </div>
                                        <div class="energy-bg-bar energy-h-20 energy-flex-1 energy-overflow-hidden">
                                          <div
                                            class="energy-h-100"
                                            style={{
                                              width: `${((item.value / consumptionRankingRef.value) * rankLineWidth.value).toFixed(0)}px`,
                                              background: rankColor(index),
                                            }}
                                          >
                                            <div class="energy-pl-10">{item.value}</div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <Empty />
                                )}
                              </>
                            ),
                          }}
                        </CLayout>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ),
        }}
      </GLayout>
    );
  },
});

export default DosageAnalysisPage;
