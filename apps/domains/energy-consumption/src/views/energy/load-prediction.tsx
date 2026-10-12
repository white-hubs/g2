import type { SeriesOption } from "echarts";
import { defineComponent, onMounted, reactive, ref, watch } from "vue";

import { LoadforecastionExport, LoadforecastionTrand, MeterArea } from "@/api";
import one from "@/assets/1.png";
import two from "@/assets/2.png";
import { CLayout } from "@/components/common/c-layout";
import { CTree } from "@/components/common/c-tree";
import { GLayout } from "@/components/common/g-layout";
import { EBar } from "@/components/echart/e-bar";
import { TimeGroup } from "@/components/time-group";
import { Button, Table } from "@/pc-ui-runtime";
import { fixedNum } from "@/utils/common";
import { getDays, getHour, getMonth, xInfo } from "@/utils/getTime";

import "./load-prediction.less";

interface LoadRow {
  timeFlag?: string;
  timeQuantum?: string;
  predictedValue?: string | number;
  historicalValue?: string | number;
  deviationValue?: string | number;
  deviationPercent?: string | number;
  predictedTotal?: string | number;
  historicalTotal?: string | number;
}

export const LoadPrediction = defineComponent({
  name: "LoadPrediction",
  setup() {
    const fhyx = ref<Array<string | number>>([]);
    const getInstumenttype = ref<Array<{ code: string; name: string }>>([]);
    const currentInstumenttype = ref("");
    const disabled = ref(false);
    const tabledata = ref<LoadRow[]>([]);
    const ctree = ref<{ activeKey?: { value?: string } | string }>();
    const EnergyAnalysislist = ref<SeriesOption[]>([]);
    const data = reactive<{
      filterFlag: string;
      period: string;
      timeFlag: string;
      ids: string[];
      treeIds: unknown[];
      instrumentType: string;
    }>({
      period: "",
      filterFlag: "",
      timeFlag: "TODAY",
      ids: [],
      treeIds: [],
      instrumentType: "",
    });

    const columns = [
      { title: "时间段", dataIndex: "timeQuantum", key: "timeQuantum" },
      { title: "预测值（kwh）", dataIndex: "predictedValue", key: "predictedValue" },
      { title: "历史值（kwh）", dataIndex: "historicalValue", key: "historicalValue" },
      { title: "偏差值（kwh）", dataIndex: "deviationValue", key: "deviationValue" },
      { title: "偏差百分比", dataIndex: "deviationPercent", key: "deviationPercent" },
    ];

    const resolveActiveKey = () => {
      const key = ctree.value?.activeKey;
      if (typeof key === "string") return key;
      return key?.value || "area";
    };

    const getData = async () => {
      data.filterFlag = resolveActiveKey();
      data.instrumentType = currentInstumenttype.value;
      const { data: Loadtrand } = await LoadforecastionTrand(data);
      const list = (Loadtrand as LoadRow[]) || [];
      fhyx.value = xInfo(list);
      disabled.value = false;
      tabledata.value = list;
      EnergyAnalysislist.value = [
        {
          name: "用电量",
          barWidth: "20%",
          data: list.map((res) => Number(res.historicalValue)),
          type: "bar",
        },
        {
          name: "预测值",
          data: list.map((res) => Number(res.predictedValue)),
          type: "line",
        },
      ];
    };

    const setInstumenttype = (code: string) => {
      currentInstumenttype.value = code;
      void getData();
    };

    const exportreport = async () => {
      const { data: downloadRepole } = await LoadforecastionExport(data);
      const link = document.createElement("a");
      const blob = new Blob([downloadRepole as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      link.style.display = "none";
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", "用能明细.xlsx");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    watch(
      () => data.treeIds,
      () => {
        void getData();
      },
    );

    onMounted(async () => {
      const { data: meterarea } = await MeterArea();
      getInstumenttype.value = ((meterarea as Array<{ code: string; name: string }>) || []).filter(
        (res) => res.code === "electricity_meter",
      );
      if (getInstumenttype.value[0]) {
        data.instrumentType = getInstumenttype.value[0].code;
        currentInstumenttype.value = getInstumenttype.value[0].code;
      }
      data.filterFlag = resolveActiveKey();
    });

    return () => {
      const xAxisData =
        data.period !== "" ? fhyx.value : data.timeFlag === "TODAY" ? getHour() : data.timeFlag === "THIS_MONTH" ? getDays() : getMonth();

      return (
        <GLayout title="负荷预测" showSearch={false} contentTableScrollable class="load-prediction-page">
          {{
            "header-btn": () => (
              <div class="energy-flex-evenly">
                {getInstumenttype.value.map((item) => (
                  <Button
                    key={item.code}
                    class="energy-mr-5"
                    type={item.code === currentInstumenttype.value ? "primary" : "default"}
                    onClick={() => setInstumenttype(item.code)}
                  >
                    {item.name}
                  </Button>
                ))}
                <TimeGroup
                  showRangePicker
                  onUpdate:value={(v: string) => {
                    data.period = v;
                  }}
                  onChange={(value: string) => {
                    data.timeFlag = value;
                    void getData();
                  }}
                />
              </div>
            ),
            "content-table": () => (
              <div>
                <div class="energy-flex">
                  <div class="energy-w-15 energy-bg-white energy-p-10 load-prediction-tabs">
                    {getInstumenttype.value.length > 0 ? (
                      <CTree
                        ref={ctree}
                        disabled={disabled.value}
                        activeKey="area"
                        instrumentType={currentInstumenttype.value}
                        onAreaClick={(_value: string[], all: unknown) => {
                          data.treeIds = all as unknown[];
                          disabled.value = true;
                          void getData();
                        }}
                        onRouteClick={(_value: string[], all: unknown) => {
                          data.treeIds = all as unknown[];
                          disabled.value = true;
                          void getData();
                        }}
                        onAllList={(list: unknown) => {
                          data.treeIds = list as unknown[];
                        }}
                      />
                    ) : null}
                  </div>
                  <div class="energy-w-83 energy-ml-15">
                    <CLayout title="负荷预测" class="energy-h-460">
                      {{
                        content: () => (
                          <div class="energy-h-400">
                            <EBar
                              legend={{ data: ["用电量", "预测值"] }}
                              xAxis={{
                                type: "category",
                                axisTick: { alignWithLabel: true },
                                data: xAxisData,
                              }}
                              name="单位：kwh"
                              ydata={EnergyAnalysislist.value}
                            />
                          </div>
                        ),
                      }}
                    </CLayout>

                    <CLayout title="用能明细" class="energy-mt-15">
                      {{
                        "header-btn": () => (
                          <div class="energy-flex-evenly">
                            <Button type="primary" onClick={() => void exportreport()}>
                              导出报表
                            </Button>
                          </div>
                        ),
                        default: () => (
                          <div class="energy-flex-between">
                            <div
                              class="energy-w-50 energy-h-84 energy-flex energy-items-center energy-flex-evenly"
                              style={{
                                background:
                                  "linear-gradient(51deg, var(--cube-theme-var--primary-1, #f7faff) 0%, rgba(245,249,255,0.22) 37%, var(--cube-theme-var--primary-1, #f7faff) 100%)",
                              }}
                            >
                              <span>
                                预测总能耗值:（kwh）{" "}
                                <span class="energy-font-900 energy-text-32">{fixedNum(Number(tabledata.value[0]?.predictedTotal))}</span>
                              </span>
                              <img src={one} alt="" />
                            </div>
                            <div
                              class="energy-w-50 energy-h-84 energy-flex energy-items-center energy-flex-evenly"
                              style={{
                                background:
                                  "linear-gradient(51deg, var(--cube-theme-var--primary-1, #f7faff) 0%, rgba(245,249,255,0.22) 37%, var(--cube-theme-var--primary-1, #f7faff) 100%)",
                              }}
                            >
                              <span>
                                历史总能耗值:（kwh）{" "}
                                <span class="energy-font-900 energy-text-32">{fixedNum(Number(tabledata.value[0]?.historicalTotal))}</span>
                              </span>
                              <img src={two} alt="" />
                            </div>
                          </div>
                        ),
                      }}
                    </CLayout>

                    <Table pagination={false} columns={columns} dataSource={tabledata.value} scroll={{ y: 300 }} />
                  </div>
                </div>
              </div>
            ),
          }}
        </GLayout>
      );
    };
  },
});

export default LoadPrediction;
