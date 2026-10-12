import { defineComponent, onMounted, ref } from "vue";

import { alarmRecords, alarmStatisticsStatusGroup } from "@/api";
import { CLayout } from "@/components/common/c-layout";
import { EPie } from "@/components/echart/e-pie";
import { RollTable, type RollTableColumn } from "@/components/echart/roll-table";
import { TimeRadioGroup } from "@/components/time-radio-group";
import { Empty } from "@/pc-ui-runtime";

/** 能耗总览 — 能耗报警面板 */
export const ComprehensiveEarlyWarning = defineComponent({
  name: "ComprehensiveEarlyWarning",
  setup() {
    const trendTimeData = ref<{ timeFlag: string; period: string }>({ timeFlag: "TODAY", period: "" });
    const synthesizeList = ref<Array<{ name: string; num: number | string; id: string }>>([]);
    const energyAlarmData = ref<Array<{ value: number; name: string }>>([]);
    const alarmRecordsDataList = ref<Record<string, unknown>[]>([]);
    const alarmRecordsColumns = ref<RollTableColumn[]>([]);

    const getData = async () => {
      const { data: alarmStatisticsStatusGroupData } = await alarmStatisticsStatusGroup({
        applicationCode: "ENERGY_CONSUMPTION",
        period: trendTimeData.value.period,
      });
      const statusList =
        (alarmStatisticsStatusGroupData as Array<{
          alarmStatus: string;
          alarmStatusName: string;
          alarmNum: number;
        }>) || [];
      synthesizeList.value = statusList.map((e) => ({
        id: e.alarmStatus,
        name: e.alarmStatusName,
        num: e.alarmNum,
      }));
      energyAlarmData.value = statusList
        .map((res) => ({ value: res.alarmNum, name: res.alarmStatusName }))
        .filter((item) => item.value > 0);

      const { data: alarmRecordsData } = await alarmRecords({
        applicationCode: "ENERGY_CONSUMPTION",
        period: trendTimeData.value.period,
        pageNumber: 1,
        pageSize: 1000,
      });
      alarmRecordsDataList.value =
        ((alarmRecordsData as { records?: Record<string, unknown>[] })?.records as Record<string, unknown>[]) || [];
      alarmRecordsColumns.value = [
        { title: "报警事件", dataIndex: "alarmEventName", width: 120 },
        { title: "仪表", dataIndex: "alarmTargetName", width: 120 },
        { title: "状态", dataIndex: "alarmStatus", width: 120, slots: { customRender: "alarmStatus" } },
      ];
    };

    onMounted(() => {
      void getData();
    });

    const renderStatus = (record: Record<string, unknown>) => {
      if (record.alarmStatus === "ALARM_UN_CONFIRMED") {
        return <span style={{ color: "#f14545" }}>待处理</span>;
      }
      if (record.alarmStatus === "ALARM_PROGRESS_CONFIRMED") {
        return <span style={{ color: "#ffab10" }}>处理中</span>;
      }
      return <span style={{ color: "#00f27b" }}>已处理</span>;
    };

    return () => (
      <CLayout title="能耗报警" class="energy-w-50">
        {{
          "header-btn": () => (
            <TimeRadioGroup
              showRangePicker
              onUpdate:value={(v: string) => {
                trendTimeData.value.period = v;
              }}
              onChange={(time: string) => {
                trendTimeData.value.timeFlag = time;
                void getData();
              }}
            />
          ),
          content: () => (
            <>
              <div
                class="energy-flex-between energy-items-center energy-rd-10 energy-p-15 energy-box-border"
                style={{ flexWrap: "nowrap" }}
              >
                {synthesizeList.value.map((item) => (
                  <div
                    key={item.id}
                    class="energy-bg-card energy-h-70 energy-box-border energy-p-15 energy-text-center energy-mt-5"
                    style={{ width: "150px" }}
                  >
                    <span class="energy-color-label">{item.name}</span>
                    <div class="energy-text-18">{item.num}</div>
                  </div>
                ))}
              </div>
              <div class="energy-flex energy-h-290">
                <div style={{ width: "40%", height: "100%", position: "relative" }}>
                  {energyAlarmData.value.length > 0 ? (
                    <EPie
                      radius={["0%", "70%"]}
                      legend={{ top: "bottom" }}
                      label={{ show: true, position: "inner" }}
                      data={energyAlarmData.value}
                    />
                  ) : (
                    <Empty description="暂无报警级别数据" />
                  )}
                </div>
                <div style={{ width: "60%", height: "100%", position: "relative", overflowY: "scroll" }}>
                  {alarmRecordsDataList.value.length > 0 ? (
                    <RollTable
                      column={alarmRecordsColumns.value}
                      data={alarmRecordsDataList.value}
                      v-slots={{
                        alarmStatus: ({ record }: { record: Record<string, unknown> }) => renderStatus(record),
                      }}
                    />
                  ) : (
                    <Empty description="暂无报警记录" />
                  )}
                </div>
              </div>
            </>
          ),
        }}
      </CLayout>
    );
  },
});

export default ComprehensiveEarlyWarning;
