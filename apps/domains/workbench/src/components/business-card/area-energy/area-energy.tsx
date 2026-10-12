import { defineComponent, reactive, ref, onMounted } from "vue";

import { timePeriod } from "../../../utils/index";
import PanelCard from "../../card/card";
import PieChart from "../../chart/pie2/pie2";
import SelectBtn from "../../select-btn/select-btn";
import { cubeEnergyStatService } from "@/api/server";
import { Select } from "@/pc-ui-runtime";

import "./area-energy.less";

interface AreaEnergyState {
  instrumentType: string;
  yName: string;
  timeFlag: string;
  unit: string;
  period: string;
  chartData: { name: string; value: number }[];
}

export default defineComponent({
  name: "AreaEnergy",
  emits: ["close"],
  setup(props, { emit }) {
    const state = reactive<AreaEnergyState>({
      instrumentType: "electricity_meter",
      yName: "单位:kwh",
      timeFlag: "Day",
      unit: "Kwh",
      period: timePeriod("TODAY"),
      chartData: [],
    });

    const typeOptions = ref([]);

    const getData = async (): Promise<void> => {
      try {
        const res = await cubeEnergyStatService.getEnergyStatProject({
          projectCategory: "AREA",
          instrumentType: state.instrumentType,
          period: state.period,
        });

        state.chartData = (
          res as unknown as {
            name: string;
            value: number;
          }[]
        ).map((item) => ({
          name: item.name ?? "",
          value: item.value ?? 0,
        }));
      } catch {}
    };

    const changeType = (item: string): void => {
      state.instrumentType = item;
      state.unit = item === "electricity_meter" ? "Kwh" : "m³";
      getData();
    };

    const changeSelect = (item: string): void => {
      state.timeFlag = item;
      switch (state.timeFlag) {
        case "Day":
          state.period = timePeriod("TODAY");
          break;
        case "Month":
          state.period = timePeriod("MONTH");
          break;
        case "Year":
          state.period = timePeriod("YEAR");
          break;
      }
      getData();
    };

    const classifyList = async (): Promise<void> => {
      try {
        const { records } = (await cubeEnergyStatService.ClassifySettingsPage()) as unknown as { records: [] };
        typeOptions.value = records;
      } catch {}
    };

    onMounted(() => {
      classifyList();
      getData();
    });

    const handleClose = (): void => {
      emit("close");
    };

    return () => (
      <PanelCard title="区域能耗" icon="icon-quyunenghao" onClose={handleClose}>
        {{
          btn: () => <SelectBtn onChange={changeSelect} />,
          default: () => (
            <div class="itemEnergy-container">
              <Select
                style={{ width: "100px", marginRight: "10px" }}
                value={state.instrumentType}
                fieldNames={{ label: "categoryName", value: "categoryCode" }}
                options={typeOptions.value}
                onChange={(value: unknown) => changeType(String(value ?? ""))}
              />
              <div class="itemEnergy-chart">
                <PieChart chartData={state.chartData} unit={state.unit} />
              </div>
            </div>
          ),
        }}
      </PanelCard>
    );
  },
});
