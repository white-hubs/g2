import { defineComponent, onMounted, reactive } from "vue";

import PanelCard from "../../card/card";
import Piechart from "../../chart/pie/pie";
import SelectBtn from "../../select-btn/select-btn";
import { cubeAlarmStatService } from "@/api/server";
import { PeriodStatTypeEnum } from "@/types/protocol";

import "./alarm-overview.less";

interface AlarmState {
  periodType: PeriodStatTypeEnum;
  alarmNum: number;
  alarmHandler: number;
  alarmUnConfirmed: number;
  alarmProgressConfirmed: number;
  alarmSuspend: number;
  selectList: { label: string; value: PeriodStatTypeEnum }[];
  chartData: { name: string; value: number }[];
}

interface AlarmStatisticsVOS {
  alarmNum: number;
  alarmResultStatisticsVOS: { alarmHandlerResult: string; alarmNum: number }[];
  alarmStatusStatisticsVOS: { alarmStatus: string; alarmNum: number }[];
}

interface AlarmStatisticsTypeRankVOS {
  name: string;
  alarmNum: number;
}

export default defineComponent({
  name: "AlarmOverview",
  emits: ["close"],
  setup(props, { emit }) {
    const state = reactive<AlarmState>({
      periodType: PeriodStatTypeEnum.TODAY,
      alarmNum: 0,
      alarmHandler: 0,
      alarmUnConfirmed: 0,
      alarmProgressConfirmed: 0,
      alarmSuspend: 0,
      selectList: [
        { label: "今日", value: PeriodStatTypeEnum.TODAY },
        { label: "本周", value: PeriodStatTypeEnum.THIS_WEEK },
        { label: "本月", value: PeriodStatTypeEnum.THIS_MONTH },
      ],
      chartData: [],
    });

    const changeType = (item: PeriodStatTypeEnum): void => {
      state.periodType = item;
      getData();
    };

    const getData = async (): Promise<void> => {
      try {
        const data = (await cubeAlarmStatService.alarmSummaryStat({
          time: new Date(),
          type: state.periodType,
        })) as unknown as AlarmStatisticsVOS;
        state.alarmNum = data?.alarmNum ?? 0;
        for (const item of data?.alarmStatusStatisticsVOS ?? []) {
          if (item.alarmStatus === "ALARM_HANDLER") {
            state.alarmHandler = item.alarmNum;
          }
          if (item.alarmStatus === "ALARM_UN_CONFIRMED") {
            state.alarmUnConfirmed = item.alarmNum;
          }
          if (item.alarmStatus === "ALARM_PROGRESS_CONFIRMED") {
            state.alarmProgressConfirmed = item.alarmNum;
          }
          if (item.alarmStatus === "ALARM_SUSPEND") {
            state.alarmSuspend = item.alarmNum;
          }
        }
        const data2 = (await cubeAlarmStatService.alarmSummaryStatByTypeRank({
          time: new Date(),
          type: state.periodType,
        })) as unknown as AlarmStatisticsTypeRankVOS[];
        state.chartData = (Array.isArray(data2) ? data2 : []).map((item) => ({
          name: item.name,
          value: item.alarmNum,
        }));
      } catch {
        state.alarmNum = 0;
        state.chartData = [];
      }
    };

    const handleClose = (): void => {
      emit("close");
    };

    onMounted(() => {
      changeType(PeriodStatTypeEnum.TODAY);
    });

    return () => (
      <PanelCard title="报警汇总" icon="icon-baojinghuizong" onClose={handleClose}>
        {{
          btn: () => <SelectBtn list={state.selectList} onChange={changeType} />,
          default: () => (
            <div class="alarmOverview-container">
              <div class="alarmOverview-info">
                <div class="info-total primary-color">
                  <div class="info-total-label">报警总数</div>
                  <div class="info-total-num">
                    {state.alarmNum}
                    <span>个</span>
                  </div>
                </div>
                <div class="info-status">
                  <div class="status-item">
                    <div class="status-item-label">已处理</div>
                    <div class="status-item-num">
                      {state.alarmHandler}
                      <span>个</span>
                    </div>
                  </div>
                  <div class="status-item">
                    <div class="status-item-label">已挂起</div>
                    <div class="status-item-num">
                      {state.alarmSuspend}
                      <span>个</span>
                    </div>
                  </div>
                  <div class="status-item">
                    <div class="status-item-label">处理中</div>
                    <div class="status-item-num">
                      {state.alarmProgressConfirmed}
                      <span>个</span>
                    </div>
                  </div>
                  <div class="status-item">
                    <div class="status-item-label">待接收</div>
                    <div class="status-item-num">
                      {state.alarmUnConfirmed}
                      <span>个</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="alarmOverview-chart">
                <Piechart chartData={state.chartData} />
              </div>
            </div>
          ),
        }}
      </PanelCard>
    );
  },
});
