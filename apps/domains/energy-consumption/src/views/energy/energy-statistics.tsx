import { CaretUpFilled } from "@ant-design/icons-vue";
import type { SeriesOption } from "echarts";
import { defineComponent, onMounted, reactive, ref } from "vue";

import {
  AreaProjectTree,
  CarbonClassifyStatisticsData,
  CarbonStatisticsData,
  CarboEmissionTrends,
  ClassifySettingsPage,
  EnergyProportionStatistics,
  SubItemTreePage,
} from "@/api";
import one from "@/assets/1.png";
import two from "@/assets/2.png";
import three from "@/assets/3.png";
import { CLayout } from "@/components/common/c-layout";
import { GLayout } from "@/components/common/g-layout";
import { EBar } from "@/components/echart/e-bar";
import { ELine } from "@/components/echart/e-line";
import { EPie } from "@/components/echart/e-pie";
import { TimeRadioGroup } from "@/components/time-radio-group";
import { Empty, Select, TreeSelect } from "@/pc-ui-runtime";
import { fixedNum } from "@/utils/common";

import "./energy-statistics.less";

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

export const EnergyStatistics = defineComponent({
  name: "EnergyStatistics",
  setup() {
    const typeOptions = ref<Array<{ categoryName: string; categoryCode: string }>>([]);
    const carbonDataStatistics = ref([
      { title: "今日碳排量tCO2e", num: 0 as number | string, image: one, hb: 0 as number | string },
      { title: "本月碳排量 tCO2e", num: 0 as number | string, image: three, hb: 0 as number | string },
      { title: "本年碳排量 tCO2e", num: 0 as number | string, image: two, hb: 0 as number | string },
    ]);
    const trendTimeData = ref<{ type: string; period: string }>({ type: "TODAY", period: "" });
    const carbonTrendX = ref<string[]>([]);
    const carbonEmissionTrendSeries = ref<number[]>([]);
    const classifyStatisticsTimeData = ref<{ timeFlag: string; period: string }>({ timeFlag: "TODAY", period: "" });
    const classifyStatisticsYData = ref<SeriesOption[]>([]);
    const classifyStatisticsXData = ref<string[]>([]);
    const classifyLegendNames = ref<string[]>([]);
    const subItemOptions = ref<Record<string, unknown>[]>([]);
    const subTimeSearchType = reactive<{ instrumentType: string; projectIds: string[] }>({
      instrumentType: "electricity_meter",
      projectIds: [],
    });
    const subitemProportionateData = ref<{ type: string; period: string }>({ type: "TODAY", period: "" });
    const proportionOfCarbonEmissionsData = ref<Array<{ value: number; name: string }>>([]);
    const areaOptions = ref<Record<string, unknown>[]>([]);
    const areaSearchType = reactive<{ instrumentType: string; projectIds: string[] }>({
      instrumentType: "electricity_meter",
      projectIds: [],
    });
    const areaProportionateData = ref<{ type: string; period: string }>({ type: "TODAY", period: "" });
    const proportionOfCarbonEmissionsAreaData = ref<Array<{ value: number; name: string }>>([]);

    const getCarbonDataStatistics = async () => {
      const { data } = await CarbonStatisticsData({ exportType: "CARBON" });
      const d = data as {
        qoqDayValueRate: number;
        dayValue: number;
        qoqMonthValueRate?: number;
        monthValue: number;
        qoqYearValueRate?: number;
        yearValue: number;
      };
      carbonDataStatistics.value[0].hb = d.qoqDayValueRate;
      carbonDataStatistics.value[0].num = d.dayValue;
      carbonDataStatistics.value[1].hb = d.qoqMonthValueRate ?? "--";
      carbonDataStatistics.value[1].num = d.monthValue;
      carbonDataStatistics.value[2].hb = d.qoqYearValueRate ?? "--";
      carbonDataStatistics.value[2].num = d.yearValue;
    };

    const getCarboEmissionTrends = async () => {
      const { data } = await CarboEmissionTrends(trendTimeData.value);
      const list = (data as Array<{ time: string | number; dcValue: number }>) || [];
      carbonTrendX.value = list.map((res) => res.time.toString());
      carbonEmissionTrendSeries.value = list.map((res) => res.dcValue);
    };

    const getClassifyStatisticsData = async () => {
      classifyStatisticsYData.value = [];
      const { data } = await CarbonClassifyStatisticsData(classifyStatisticsTimeData.value);
      const list = (data as Array<{ time: string | number; name: string; dcValue: number }>) || [];
      classifyStatisticsXData.value = list.map((x) => x.time.toString());
      const seriesList: Array<{ name: string; data: number[]; type: string; stack: string }> = [];
      list.forEach((item) => {
        if (!seriesList.find((x) => x.name === item.name)) {
          seriesList.push({
            name: item.name,
            data: Array.from({ length: list.length }, () => 0),
            type: "bar",
            stack: "x",
          });
        }
      });
      classifyLegendNames.value = seriesList.map((x) => x.name);
      seriesList.forEach((x) => {
        list.forEach((item, index) => {
          if (x.name === item.name) x.data.splice(index, 1, item.dcValue);
        });
      });
      classifyStatisticsYData.value = seriesList as SeriesOption[];
    };

    const getSubItemProperty = async () => {
      const { data } = await EnergyProportionStatistics({
        ...subitemProportionateData.value,
        ...subTimeSearchType,
        projectIds: subTimeSearchType.projectIds.join(","),
        projectCategory: "ITEM",
      });
      proportionOfCarbonEmissionsData.value = ((data as Array<{ name: string; dcValue: number }>) || [])
        .map((res) => ({ value: res.dcValue, name: res.name }))
        .filter((res) => res.value !== 0);
    };

    const getSubItemTree = async (type: string) => {
      const { data } = await SubItemTreePage({ instrumentType: type });
      const tree = (data as Array<{ children?: Record<string, unknown>[] }>) || [];
      subItemOptions.value = (tree[0]?.children as Record<string, unknown>[]) || [];
      await getSubItemProperty();
    };

    const getAreaProperty = async () => {
      const { data } = await EnergyProportionStatistics({
        ...areaProportionateData.value,
        ...areaSearchType,
        projectIds: areaSearchType.projectIds.join(","),
        projectCategory: "AREA",
      });
      proportionOfCarbonEmissionsAreaData.value = ((data as Array<{ name: string; dcValue: number }>) || [])
        .map((res) => ({ value: res.dcValue, name: res.name }))
        .filter((res) => res.value !== 0);
    };

    const geAreaTree = async (type: string) => {
      const { data } = await AreaProjectTree({ instrumentType: type });
      areaOptions.value = (data as Record<string, unknown>[]) || [];
      await getAreaProperty();
    };

    const getData = async () => {
      await Promise.all([
        getCarboEmissionTrends(),
        getCarbonDataStatistics(),
        getSubItemTree(subTimeSearchType.instrumentType),
        geAreaTree(areaSearchType.instrumentType),
      ]);
    };

    onMounted(async () => {
      await getData();
      await getClassifyStatisticsData();
      const { data } = await ClassifySettingsPage();
      typeOptions.value = ((data as { records?: typeof typeOptions.value })?.records || []) as typeof typeOptions.value;
    });

    return () => (
      <GLayout title="碳排统计" showSearch={false} contentTableScrollable class="energy-statistics-page">
        {{
          "content-table": () => (
            <div>
              <CLayout title="碳排统计" class="energy-h-250">
                {{
                  content: () => (
                    <div class="energy-flex-between">
                      {carbonDataStatistics.value.map((item) => (
                        <div class="energy-w-30 energy-text-center energy-mt-30" key={item.title}>
                          <div class="energy-font-400">{item.title}</div>
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

              <CLayout title="碳排放趋势" class="energy-mt-15 energy-h-460">
                {{
                  "header-btn": () => (
                    <TimeRadioGroup
                      showRangePicker
                      onUpdate:value={(v: string) => {
                        trendTimeData.value.period = v;
                      }}
                      onChange={(time: string) => {
                        trendTimeData.value.type = time;
                        void getCarboEmissionTrends();
                      }}
                    />
                  ),
                  content: () =>
                    carbonEmissionTrendSeries.value.length > 0 ? (
                      <div class="energy-h-400">
                        <ELine
                          title="单位：tCO2e"
                          legend={{ data: ["碳量排放"], top: "top" }}
                          xData={carbonTrendX.value}
                          series={[
                            {
                              name: "碳量排放",
                              type: "line",
                              smooth: true,
                              data: carbonEmissionTrendSeries.value,
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

              <CLayout title="碳排放分类统计" class="energy-mt-15 energy-h-460">
                {{
                  "header-btn": () => (
                    <TimeRadioGroup
                      showRangePicker
                      onUpdate:value={(v: string) => {
                        classifyStatisticsTimeData.value.period = v;
                      }}
                      onChange={(time: string) => {
                        classifyStatisticsTimeData.value.timeFlag = time;
                        void getClassifyStatisticsData();
                      }}
                    />
                  ),
                  content: () =>
                    classifyStatisticsYData.value.length > 0 ? (
                      <div class="energy-h-400">
                        <EBar
                          legend={{ data: classifyLegendNames.value }}
                          customTooltip={customTooltip}
                          xAxis={{ data: classifyStatisticsXData.value }}
                          ydata={[...classifyStatisticsYData.value]}
                        />
                      </div>
                    ) : (
                      <Empty />
                    ),
                }}
              </CLayout>

              <div class="energy-flex-between energy-my-10">
                <CLayout title="碳排分项占比" class="energy-w-49">
                  {{
                    "header-btn": () => (
                      <TimeRadioGroup
                        showRangePicker
                        onUpdate:value={(v: string) => {
                          subitemProportionateData.value.period = v;
                        }}
                        onChange={(time: string) => {
                          subitemProportionateData.value.type = time;
                          void getSubItemProperty();
                        }}
                      />
                    ),
                    content: () => (
                      <>
                        <div class="energy-p-5 energy-flex">
                          <div class="energy-text-12 energy-w-150 energy-color-hint" style={{ lineHeight: "34px" }}>
                            单位：kgCO₂e
                          </div>
                          <Select
                            style={{ width: 120, marginRight: "10px" }}
                            value={subTimeSearchType.instrumentType}
                            fieldNames={{ label: "categoryName", value: "categoryCode" }}
                            options={typeOptions.value}
                            onChange={(value) => {
                              subTimeSearchType.projectIds = [];
                              subTimeSearchType.instrumentType = String(value);
                              void getSubItemTree(subTimeSearchType.instrumentType);
                            }}
                          />
                          <TreeSelect
                            value={subTimeSearchType.projectIds}
                            multiple
                            showArrow
                            showCheckedStrategy="SHOW_ALL"
                            treeCheckable
                            class="energy-w-278"
                            maxTagCount={4}
                            placeholder="分项层级"
                            treeData={subItemOptions.value as never[]}
                            fieldNames={{ children: "children", label: "projectName", value: "id" }}
                            onChange={(value) => {
                              subTimeSearchType.projectIds = (value as string[]) || [];
                              void getSubItemProperty();
                            }}
                          />
                        </div>
                        {proportionOfCarbonEmissionsData.value.length > 0 ? (
                          <div class="energy-h-240">
                            <EPie
                              data={proportionOfCarbonEmissionsData.value}
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

                <CLayout title="碳排区域占比" class="energy-w-49">
                  {{
                    "header-btn": () => (
                      <TimeRadioGroup
                        showRangePicker
                        onUpdate:value={(v: string) => {
                          areaProportionateData.value.period = v;
                        }}
                        onChange={(time: string) => {
                          areaProportionateData.value.type = time;
                          void getAreaProperty();
                        }}
                      />
                    ),
                    content: () => (
                      <>
                        <div class="energy-p-5 energy-flex">
                          <div class="energy-text-12 energy-w-150 energy-color-hint" style={{ lineHeight: "34px" }}>
                            单位：kgCO₂e
                          </div>
                          <Select
                            style={{ width: 120, marginRight: "10px" }}
                            value={areaSearchType.instrumentType}
                            fieldNames={{ label: "categoryName", value: "categoryCode" }}
                            options={typeOptions.value}
                            onChange={(value) => {
                              areaSearchType.projectIds = [];
                              areaSearchType.instrumentType = String(value);
                              void geAreaTree(areaSearchType.instrumentType);
                            }}
                          />
                          <TreeSelect
                            value={areaSearchType.projectIds}
                            multiple
                            showArrow
                            showCheckedStrategy="SHOW_ALL"
                            treeCheckable
                            class="energy-w-278"
                            maxTagCount={4}
                            placeholder="区域层级"
                            treeData={areaOptions.value as never[]}
                            fieldNames={{ children: "children", label: "areaName", value: "id" }}
                            onChange={(value) => {
                              areaSearchType.projectIds = (value as string[]) || [];
                              void getAreaProperty();
                            }}
                          />
                        </div>
                        {proportionOfCarbonEmissionsAreaData.value.length > 0 ? (
                          <div class="energy-h-240">
                            <EPie
                              data={proportionOfCarbonEmissionsAreaData.value}
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
              </div>
            </div>
          ),
        }}
      </GLayout>
    );
  },
});

export default EnergyStatistics;
