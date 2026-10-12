import { CaretUpFilled } from "@ant-design/icons-vue";
import type { SeriesOption } from "echarts";
import { defineComponent, nextTick, onMounted, reactive, ref } from "vue";

import { ComprehensiveEarlyWarning } from "./components/comprehensive-early-warning";
import { ClassifySettingsPage, Comprehensive, EnergyFlowDirection, EnergyProportionStatistics, EnergyTrend, EnergyUnityTrend } from "@/api";
import { CLayout } from "@/components/common/c-layout";
import { GLayout } from "@/components/common/g-layout";
import { ELine } from "@/components/echart/e-line";
import { ESankey } from "@/components/echart/e-sankey";
import { TimeRadioGroup } from "@/components/time-radio-group";
import { Empty, Select } from "@/pc-ui-runtime";
import { fixedNum } from "@/utils/common";

import "./energy-overview.less";

type EnergyName =
  | "zh"
  | "carbon"
  | "other"
  | "renewable_energy"
  | "cool_meter"
  | "heat_meter"
  | "fuel_meter"
  | "gas_meter"
  | "water_meter"
  | "electricity_meter";

const ENERGY_NAME_MAP: Record<string, string> = {
  electricity_meter: "电	kWh",
  water_meter: "水	m³",
  gas_meter: "气	m³",
  fuel_meter: "燃油	kg",
  heat_meter: "集中供热	kg",
  cool_meter: "集中供冷	m³",
  renewable_energy: "可再生资源	kWh",
  other: "其他	kWh",
  carbon: "碳排 kgCO₂e",
  zh: "综合能耗 tce",
};

const getEnergyImg = (elName: string) => new URL(`../../assets/${elName}`, import.meta.url).href;

const rankColor = (index: number) => {
  if (index === 0) return "#FF4070";
  if (index === 1 || index === 2) return "#fd833c";
  if (index === 3 || index === 4) return "#fdcc49";
  if (index === 5 || index === 6) return "#4fc1ff";
  return "#5654F5";
};

export const EnergyOverview = defineComponent({
  name: "EnergyOverview",
  setup() {
    const typeOptions = ref<Array<{ categoryName: string; categoryCode: string }>>([]);
    const dataStatistics = ref<Array<{ instrumentType: EnergyName | string; index: number; value: number; qoqValueRate: number }>>([]);
    const statisticsTimeData = ref<{ timeFlag: string; period: string }>({ timeFlag: "TODAY", period: "" });
    const coTrendTimeData = ref<{ timeFlag: string; period: string }>({ timeFlag: "TODAY", period: "" });
    const xCarbonEmissions = ref<string[]>([]);
    const xCarbonEmissionsSeries = ref<number[]>([]);
    const moveTowardsTimeData = ref<{ timeFlag: string; period: string }>({ timeFlag: "TODAY", period: "" });
    const energyDirectionLinks = ref<unknown[]>([]);
    const energyDirectionNode = ref<unknown[]>([]);
    const energyTrendInstrumentType = reactive({ label: "电", value: "electricity_meter" });
    const energyTrendTimeData = ref<{ timeFlag: string; period: string }>({ timeFlag: "TODAY", period: "" });
    const energyConsumptionTrendData = ref<SeriesOption[]>([]);
    const energyConsumptionXData = ref<string[]>([]);
    const areaTimeData = ref<{ timeFlag: string; period: string }>({ timeFlag: "TODAY", period: "" });
    const areaInstrumentType = reactive({ label: "电", value: "electricity_meter" });
    const consumptionRankingRef = ref(14);
    const consumptionRankingList = ref<Array<{ name: string; value: number }>>([]);
    const areaLineWidth = ref(400);

    const getComprehensive = async () => {
      const { data } = await Comprehensive({ period: statisticsTimeData.value.period });
      dataStatistics.value = (data as typeof dataStatistics.value) || [];
    };

    const getEnergyTrend = async () => {
      const { data: energyTrend } = await EnergyTrend({ period: coTrendTimeData.value.period });
      const list = (energyTrend as Array<{ time: string; dcValue: number }>) || [];
      xCarbonEmissions.value = list.map((res) => res.time.toString());
      xCarbonEmissionsSeries.value = list.map((res) => res.dcValue);
    };

    const getMoveTowards = async () => {
      // 旧仓未解构 `{ data }`：接口体本身含 data(nodes) + links
      const res = (await EnergyFlowDirection({
        period: moveTowardsTimeData.value.period,
        projectCategory: "AREA",
      })) as { data?: { data?: unknown[]; links?: unknown[] } | unknown[]; links?: unknown[] };
      const payload = (res as { data?: { data?: unknown[]; links?: unknown[] } }).data;
      if (payload && typeof payload === "object" && !Array.isArray(payload) && "links" in payload) {
        energyDirectionNode.value = payload.data ?? [];
        energyDirectionLinks.value = payload.links ?? [];
      } else {
        energyDirectionNode.value = (Array.isArray(payload) ? payload : []) as unknown[];
        energyDirectionLinks.value = (res as { links?: unknown[] }).links ?? [];
      }
    };

    const getEnergyConsumptionTrend = async () => {
      const { data: energyConsumptionTrend } = await EnergyUnityTrend({
        period: energyTrendTimeData.value.period,
        instrumentType: energyTrendInstrumentType.value,
      });
      const list = (energyConsumptionTrend as Array<{ time: string; value: number }>) || [];
      energyConsumptionXData.value = list.map((x) => x.time);
      energyConsumptionTrendData.value = [
        {
          name: energyTrendInstrumentType.label,
          type: "line",
          smooth: true,
          data: list.map((res) => res.value),
        },
      ];
    };

    const getAreaEnergyData = async () => {
      const { data: electricityconsumptionranking } = await EnergyProportionStatistics({
        period: areaTimeData.value.period,
        instrumentType: areaInstrumentType.value,
        projectCategory: "AREA",
      });
      const list = ((electricityconsumptionranking as Array<{ name: string; value: number }>) || []).slice(0, 10);
      consumptionRankingList.value = list;
      consumptionRankingRef.value = list.map((x) => x.value).toSorted((a, b) => b - a)[0] || 1;
      await nextTick();
      const areaDom = document.getElementById("consumptionRanking");
      areaLineWidth.value = areaDom ? areaDom.clientWidth - 100 : 600;
    };

    const getData = async () => {
      try {
        await Promise.all([getComprehensive(), getEnergyTrend(), getEnergyConsumptionTrend(), getMoveTowards(), getAreaEnergyData()]);
        const { data } = await ClassifySettingsPage();
        typeOptions.value = ((data as { records?: typeof typeOptions.value })?.records || []) as typeof typeOptions.value;
      } catch {
        /* 看板接口失败时保留空态 */
      }
    };

    onMounted(() => {
      void getData();
    });

    return () => (
      <GLayout title="能耗总览" showSearch={false} contentTableScrollable class="energy-overview-page">
        {{
          "content-table": () => (
            <>
              <CLayout title="数据统计">
                {{
                  "header-btn": () => (
                    <TimeRadioGroup
                      showRangePicker
                      onUpdate:value={(v: string) => {
                        statisticsTimeData.value.period = v;
                      }}
                      onChange={(time: string) => {
                        statisticsTimeData.value.timeFlag = time;
                        void getComprehensive();
                      }}
                    />
                  ),
                  content: () => (
                    <div
                      class="dataStatistics"
                      style={dataStatistics.value.length >= 2 ? { justifyContent: "space-around", overflow: "auto" } : undefined}
                    >
                      {dataStatistics.value.map((item, index) => (
                        <div class="Statistics" key={index}>
                          <div>
                            <div>
                              <span class="name" style={{ color: "#909399" }}>
                                {ENERGY_NAME_MAP[item.instrumentType] || item.instrumentType}
                              </span>
                            </div>
                            <div style={{ fontSize: "12px", marginTop: "0px" }}>
                              环比 <CaretUpFilled style={{ color: "#00b80c" }} />
                              {item.qoqValueRate ? item.qoqValueRate.toFixed(2) : "--"}%
                            </div>
                            <div style={{ marginTop: "10px" }}>{fixedNum(item.value)}</div>
                          </div>
                          <div>
                            <img src={getEnergyImg(`${item.instrumentType}.png`)} style={{ width: "60px", height: "60px" }} />
                          </div>
                        </div>
                      ))}
                      {dataStatistics.value.length === 0 ? <Empty /> : null}
                    </div>
                  ),
                }}
              </CLayout>

              <CLayout title="碳排放趋势" class="energy-mt-15">
                {{
                  "header-btn": () => (
                    <TimeRadioGroup
                      showRangePicker
                      onUpdate:value={(v: string) => {
                        coTrendTimeData.value.period = v;
                      }}
                      onChange={(time: string) => {
                        coTrendTimeData.value.timeFlag = time;
                        void getEnergyTrend();
                      }}
                    />
                  ),
                  default: () => (
                    <div style={{ display: "flex", height: "400px" }}>
                      <div style={{ width: "100%", position: "relative" }}>
                        {xCarbonEmissions.value.length ? (
                          <ELine
                            xData={xCarbonEmissions.value}
                            series={[{ name: "碳量排放", type: "line", data: xCarbonEmissionsSeries.value }]}
                          />
                        ) : (
                          <Empty description="暂无排放趋势数据" />
                        )}
                      </div>
                    </div>
                  ),
                }}
              </CLayout>

              <div class="energy-mt-15 energy-flex">
                <ComprehensiveEarlyWarning />
                <CLayout title="能源走向" class="energy-w-49 energy-ml-10">
                  {{
                    "header-btn": () => (
                      <TimeRadioGroup
                        showRangePicker
                        onUpdate:value={(v: string) => {
                          moveTowardsTimeData.value.period = v;
                        }}
                        onChange={(time: string) => {
                          moveTowardsTimeData.value.timeFlag = time;
                          void getMoveTowards();
                        }}
                      />
                    ),
                    content: () => (
                      <div class="energy-h-400" style={{ overflow: "auto" }}>
                        {energyDirectionLinks.value?.length ? (
                          <ESankey
                            nodes={energyDirectionNode.value as Array<Record<string, unknown>>}
                            links={energyDirectionLinks.value as never}
                          />
                        ) : (
                          <Empty />
                        )}
                      </div>
                    ),
                  }}
                </CLayout>
              </div>

              <div class="energy-mt-15 energy-flex">
                <CLayout title="用能趋势" class="energy-w-50">
                  {{
                    "header-btn": () => (
                      <>
                        <Select
                          style={{ width: 100, marginRight: "10px" }}
                          value={energyTrendInstrumentType.value}
                          fieldNames={{ label: "categoryName", value: "categoryCode" }}
                          options={typeOptions.value}
                          onChange={(_value, option) => {
                            const opt = option as { categoryCode: string; categoryName: string };
                            energyTrendInstrumentType.value = opt.categoryCode;
                            energyTrendInstrumentType.label = opt.categoryName;
                            void getEnergyConsumptionTrend();
                          }}
                        />
                        <TimeRadioGroup
                          showRangePicker
                          onUpdate:value={(v: string) => {
                            energyTrendTimeData.value.period = v;
                          }}
                          onChange={(time: string) => {
                            energyTrendTimeData.value.timeFlag = time;
                            void getEnergyConsumptionTrend();
                          }}
                        />
                      </>
                    ),
                    content: () => (
                      <div class="energy-h-400">
                        {(energyConsumptionTrendData.value[0] as { data?: unknown[] })?.data?.length ? (
                          <ELine legend={{ top: "top" }} xData={energyConsumptionXData.value} series={energyConsumptionTrendData.value} />
                        ) : (
                          <Empty />
                        )}
                      </div>
                    ),
                  }}
                </CLayout>

                <CLayout title="区域用能Top10" class="energy-w-49 energy-ml-10">
                  {{
                    "header-btn": () => (
                      <>
                        <Select
                          style={{ width: 100, marginRight: "10px" }}
                          value={areaInstrumentType.value}
                          fieldNames={{ label: "categoryName", value: "categoryCode" }}
                          options={typeOptions.value}
                          onChange={(_value, option) => {
                            const opt = option as { categoryCode: string; categoryName: string };
                            areaInstrumentType.value = opt.categoryCode;
                            areaInstrumentType.label = opt.categoryName;
                            void getAreaEnergyData();
                          }}
                        />
                        <TimeRadioGroup
                          showRangePicker
                          onUpdate:value={(v: string) => {
                            areaTimeData.value.period = v;
                          }}
                          onChange={(time: string) => {
                            areaTimeData.value.timeFlag = time;
                            void getAreaEnergyData();
                          }}
                        />
                      </>
                    ),
                    content: () =>
                      consumptionRankingList.value?.length ? (
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
                                    width: `${((item.value / consumptionRankingRef.value) * areaLineWidth.value).toFixed(0)}px`,
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
                      ),
                  }}
                </CLayout>
              </div>
            </>
          ),
        }}
      </GLayout>
    );
  },
});

export default EnergyOverview;
