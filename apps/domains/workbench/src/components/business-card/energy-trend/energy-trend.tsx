import dayjs from "dayjs";
import { defineComponent, reactive, ref, onMounted } from "vue";

import PanelCard from "../../card/card";
import LineChart from "../../chart/line/line";
import SelectBtn from "../../select-btn/select-btn";
import { cubeEnergyStatService } from "@/api/server";
import { Select, Empty } from "@/pc-ui-runtime";

import "./energy-trend.less";

type EnergyTypeTimeStat = Record<string, unknown>;

interface EnergyTrendState {
  instrumentType: string;
  yName: string;
  timeFlag: string;
  period: string;
  chartData: { name: string; value: number }[];
}

export default defineComponent({
  name: "EnergyTrend",
  emits: ["close"],
  setup(props, { emit }) {
    const typeOptions = ref([]);
    const state = reactive<EnergyTrendState>({
      instrumentType: "electricity_meter",
      yName: "单位:kwh",
      timeFlag: "Day",
      period: `${dayjs().format("YYYY-MM-DD")} 00:00:00,${dayjs().format("YYYY-MM-DD")} 23:59:59`,
      chartData: [],
    });

    const getData = async (): Promise<void> => {
      cubeEnergyStatService
        .getStatTrend({
          instrumentType: state.instrumentType,
          period: state.period,
        })
        .then((res: unknown) => {
          const list = Array.isArray(res) ? (res as EnergyTypeTimeStat[]) : [];
          state.chartData = list.map((item) => ({
            name: String(item.time ?? ""),
            value: Number(item.value ?? 0),
          }));
        });
    };

    const changeType = (item: string): void => {
      state.yName = item === "electricity_meter" ? "单位:kwh" : "单位:m³";
      state.instrumentType = item;
      getData();
    };

    const changeSelect = (item: string): void => {
      state.timeFlag = item;
      state.period = ((): string => {
        switch (item) {
          case "Day":
            return `${dayjs().format("YYYY-MM-DD")} 00:00:00,${dayjs().format("YYYY-MM-DD")} 23:59:59`;
          case "Month":
            return `${dayjs().startOf("month").format("YYYY-MM-DD")} 00:00:00,${dayjs().endOf("month").format("YYYY-MM-DD")} 23:59:59`;
          case "Year":
            return `${dayjs().startOf("year").format("YYYY-MM-DD")} 00:00:00,${dayjs().endOf("year").format("YYYY-MM-DD")} 23:59:59`;
          default:
            return state.period;
        }
      })();
      getData();
    };

    const classifyList = async (): Promise<void> => {
      try {
        const { records } = (await cubeEnergyStatService.ClassifySettingsPage()) as unknown as { records: [] };
        typeOptions.value = records;
      } catch {}
    };

    onMounted(() => {
      getData();
      classifyList();
    });

    const handleClose = (): void => {
      emit("close");
    };

    return () => (
      <PanelCard title="能耗趋势" icon="icon-nenghaoqushi" onClose={handleClose}>
        {{
          btn: () => <SelectBtn onChange={changeSelect} />,
          default: () => (
            <div class="energyTrend-container">
              <Select
                style={{ width: "100px", marginRight: "10px" }}
                value={state.instrumentType}
                fieldNames={{ label: "categoryName", value: "categoryCode" }}
                options={typeOptions.value}
                onChange={(value: unknown) => changeType(String(value ?? ""))}
              />
              <div class="energyTrend-chart">
                {state.chartData.length > 0 ? (
                  <LineChart
                    chartData={state.chartData}
                    lineStyleColor="rgba(255, 127, 21, 1)"
                    areaStyleColor="rgba(255, 127, 21, .2)"
                    yName={state.yName}
                  />
                ) : (
                  <div class="empty-container">
                    <Empty description="暂无数据" />
                  </div>
                )}
              </div>
            </div>
          ),
        }}
      </PanelCard>
    );
  },
});
