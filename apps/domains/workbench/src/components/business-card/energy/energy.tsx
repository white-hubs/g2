import { RiseOutlined, FallOutlined } from "@ant-design/icons-vue";
import { defineComponent, reactive, onMounted } from "vue";

import { timePeriod } from "../../../utils/index";
import PanelCard from "../../card/card";
import { cubeEnergyStatService } from "@/api/server";
import WorkbenchIcon from "@/components/icon/workbench-icon";

import "./energy.less";

interface EnergyState {
  typeIcon: string;
  selectList: { label: string; value: string }[];
  yesterdayNum: string;
  yesterdayProportion: number;
  toDayProportion: number;
  todayNum: string;
  monthNum: string;
  monthProportion: number;
  yearProportion: number;
  yearNum: string;
}

interface EnergyStat {
  ringRatioZhValue: number;
  currentZhValue: number;
}

const EnergyItem = ({
  iconType,
  title,
  num,
  proportion,
  typeIcon,
}: {
  iconType: string;
  title: string;
  num: string;
  proportion: number;
  typeIcon: string;
}) => (
  <div class="energy-item">
    <div class="item-icon">
      <div class="energy-item__icon-main">
        <WorkbenchIcon iconClass={iconType} />
      </div>
      <div class="energy-item__icon-type">
        <WorkbenchIcon iconClass={typeIcon} />
      </div>
    </div>
    <div class="item-tips">{title}</div>
    <div class="item-num">{num}</div>
    <div class="item-contrast">
      环比
      <span class={proportion > 0 ? "contrast-up" : "contrast-down"}>
        {proportion > 0 ? <RiseOutlined /> : <FallOutlined />}
        {proportion}%
      </span>
    </div>
  </div>
);

export default defineComponent({
  name: "Energy",
  emits: ["close"],
  setup(props, { emit }) {
    const state = reactive<EnergyState>({
      typeIcon: "icon-dian",
      selectList: [
        { label: "电", value: "electricity_meter" },
        { label: "水", value: "water_meter" },
        { label: "气", value: "gas_meter" },
      ],
      yesterdayNum: "0",
      yesterdayProportion: 0,
      toDayProportion: 0,
      todayNum: "0",
      monthNum: "0",
      monthProportion: 0,
      yearProportion: 0,
      yearNum: "0",
    });

    const getData = async (): Promise<void> => {
      try {
        await Promise.all([
          cubeEnergyStatService.getSummaryStat({ period: timePeriod("TODAY"), timeType: "TODAY" }).then((res) => {
            state.toDayProportion = (res as unknown as EnergyStat).ringRatioZhValue;
            state.todayNum = Number((res as unknown as EnergyStat).currentZhValue).toFixed(2);
          }),
          cubeEnergyStatService.getSummaryStat({ period: timePeriod("YESTERDAY"), timeType: "TODAY" }).then((res) => {
            state.yesterdayProportion = (res as unknown as EnergyStat).ringRatioZhValue;
            state.yesterdayNum = Number((res as unknown as EnergyStat).currentZhValue).toFixed(2);
          }),
          cubeEnergyStatService.getSummaryStat({ period: timePeriod("MONTH"), timeType: "THIS_MONTH" }).then((res) => {
            state.monthProportion = (res as unknown as EnergyStat).ringRatioZhValue;
            state.monthNum = Number((res as unknown as EnergyStat).currentZhValue).toFixed(2);
          }),
          cubeEnergyStatService.getSummaryStat({ period: timePeriod("YEAR"), timeType: "THIS_YEAR" }).then((res) => {
            state.yearProportion = (res as unknown as EnergyStat).ringRatioZhValue;
            state.yearNum = Number((res as unknown as EnergyStat).currentZhValue).toFixed(2);
          }),
        ]);
      } catch {}
    };

    onMounted(() => {
      getData();
    });

    const handleClose = (): void => {
      emit("close");
    };

    return () => (
      <PanelCard title="综合能耗" icon="icon-zonghenenghao1" onClose={handleClose}>
        <div class="energy-container">
          <EnergyItem
            iconType="icon-jinrishishi"
            title="今日数据"
            num={state.todayNum}
            proportion={state.toDayProportion}
            typeIcon={state.typeIcon}
          />
          <EnergyItem
            iconType="icon-zuorishuju"
            title="昨日数据"
            num={state.yesterdayNum}
            proportion={state.yesterdayProportion}
            typeIcon={state.typeIcon}
          />
          <EnergyItem
            iconType="icon-zuorishuju"
            title="本月数据"
            num={state.monthNum}
            proportion={state.monthProportion}
            typeIcon={state.typeIcon}
          />
          <EnergyItem
            iconType="icon-zuorishuju"
            title="今年数据"
            num={state.yearNum}
            proportion={state.yearProportion}
            typeIcon={state.typeIcon}
          />
        </div>
      </PanelCard>
    );
  },
});
