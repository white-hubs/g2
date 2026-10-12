import { defineComponent, reactive, onMounted } from "vue";

import PanelCard from "../../card/card";
import LineChart from "../../chart/line/line";
import SelectBtn from "../../select-btn/select-btn";
import { cubeAlarmStatService } from "@/api/server";
import { Empty } from "@/pc-ui-runtime";
import { PeriodStatTypeEnum } from "@/types/protocol";

import "./alarm-trend.less";

interface AlarmTrendState {
  selectList: { label: string; value: string }[];
  chartData: { value: number; name: string }[];
  type: PeriodStatTypeEnum;
  period: string | null;
}

interface AlarmTrendVOS {
  alarmNum: number;
  period: string;
}

export default defineComponent({
  name: "AlarmTrend",
  emits: ["close"],
  setup(props, { emit }) {
    const state = reactive<AlarmTrendState>({
      selectList: [
        { label: "今日", value: PeriodStatTypeEnum.TODAY },
        { label: "本周", value: PeriodStatTypeEnum.THIS_WEEK },
        { label: "本月", value: PeriodStatTypeEnum.THIS_MONTH },
      ],
      chartData: [],
      type: PeriodStatTypeEnum.TODAY,
      period: null,
    });

    const getData = async (): Promise<void> => {
      const data = (await cubeAlarmStatService.alarmTrendStat({
        time: new Date(),
        type: state.type,
      })) as unknown as AlarmTrendVOS[];

      let unit = "时";
      switch (state.type) {
        case PeriodStatTypeEnum.TODAY:
          unit = "时";
          break;
        case PeriodStatTypeEnum.THIS_WEEK:
        case PeriodStatTypeEnum.THIS_MONTH:
          unit = "日";
          break;
        case PeriodStatTypeEnum.THIS_YEAR:
          unit = "年";
          break;
        case PeriodStatTypeEnum.THIS_QUARTER:
          unit = "季度";
          break;
        default:
          break;
      }

      state.chartData = data.map((item) => ({
        value: item.alarmNum,
        name: item.period + unit,
      }));
    };

    const changeType = (item: PeriodStatTypeEnum): void => {
      state.type = item;
      getData();
    };

    const handleClose = (): void => {
      emit("close");
    };

    onMounted(() => {
      changeType(PeriodStatTypeEnum.TODAY);
    });

    return () => (
      <PanelCard title="报警趋势" icon="icon-baojingqushi" onClose={handleClose}>
        {{
          btn: () => <SelectBtn list={state.selectList} onChange={changeType} />,
          default: () => (
            <div class="energyTrend-container">
              <div class="energyTrend-chart">
                {state.chartData.length > 0 ? (
                  <LineChart
                    yAxisMinInterval={1}
                    chartData={state.chartData}
                    lineStyleColor="rgba(24, 141, 255, 1)"
                    areaStyleColor="rgba(24, 141, 255, .2)"
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
