import { defineComponent, reactive, ref, onMounted } from "vue";

import { timePeriod } from "../../../utils/index";
import PanelCard from "../../card/card";
import PieChart from "../../chart/pie2/pie2";
import SelectBtn from "../../select-btn/select-btn";
import { cubeEnergyStatService } from "@/api/server";
import { Select } from "@/pc-ui-runtime";

import "./item-energy.less";

interface ItemEnergyState {
  instrumentType: string;
  yName: string;
  unit: string;
  period: string;
  timeFlag: string;
  chartData: { name: string; value: number }[];
}

export default defineComponent({
  name: "ItemEnergy",
  emits: ["close"],
  setup(props, { emit }) {
    const typeOptions = ref([]);
    const state = reactive<ItemEnergyState>({
      instrumentType: "electricity_meter",
      yName: "单位:kwh",
      unit: "Kwh",
      period: timePeriod("TODAY"),
      timeFlag: "Day",
      chartData: [],
    });

    const getData = async (): Promise<void> => {
      try {
        const res = await cubeEnergyStatService.getEnergyStatProject({
          projectCategory: "ITEM",
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
      state.period = ((): string => {
        switch (item) {
          case "Day":
            return timePeriod("TODAY");
          case "Month":
            return timePeriod("MONTH");
          case "Year":
            return timePeriod("YEAR");
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
      classifyList();
      getData();
    });

    const handleClose = (): void => {
      emit("close");
    };

    return () => (
      <PanelCard title="分项能耗" icon="icon-fenxiangnenghao1" onClose={handleClose}>
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
