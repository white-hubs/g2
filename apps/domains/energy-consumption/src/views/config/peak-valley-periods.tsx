import { defineComponent, onMounted, ref } from "vue";

import { EnergyCollectPeriodItype, PeakValleyPeriods } from "@/api";
import { GLayout } from "@/components/common/g-layout";
import { Button, TimePicker, message } from "@/pc-ui-runtime";

import "./peak-valley-periods.less";

type PeriodItem = { start: string; end: string };

export const PeakValleyPeriodsPage = defineComponent({
  name: "PeakValleyPeriodsPage",
  setup() {
    const peakList = ref<PeriodItem[]>([]);
    const flatList = ref<PeriodItem[]>([]);
    const valleyList = ref<PeriodItem[]>([]);
    const pointedList = ref<PeriodItem[]>([]);

    const loadPeriods = async () => {
      const res = await EnergyCollectPeriodItype("default");
      const data = res.data as Array<{ code: string; startTime: string; endTime: string }>;
      peakList.value = data.filter((x) => x.code === "FV").map((x) => ({ start: x.startTime, end: x.endTime }));
      flatList.value = data.filter((x) => x.code === "PV").map((x) => ({ start: x.startTime, end: x.endTime }));
      valleyList.value = data.filter((x) => x.code === "GV").map((x) => ({ start: x.startTime, end: x.endTime }));
      pointedList.value = data.filter((x) => x.code === "JV").map((x) => ({ start: x.startTime, end: x.endTime }));
    };

    const add = (type: string) => {
      const item = { start: "", end: "" };
      if (type === "peak") peakList.value.push(item);
      if (type === "flat") flatList.value.push(item);
      if (type === "valley") valleyList.value.push(item);
      if (type === "pointed") pointedList.value.push(item);
    };

    const deleteItem = (type: string, index: number) => {
      if (type === "peak") peakList.value.splice(index, 1);
      if (type === "flat") flatList.value.splice(index, 1);
      if (type === "valley") valleyList.value.splice(index, 1);
      if (type === "pointed") pointedList.value.splice(index, 1);
    };

    const save = async () => {
      const peakPeriods = peakList.value.map((x, index) => ({
        code: "FV",
        startTime: x.start,
        endTime: x.end,
        sort: 2 + index * 0.1,
      }));
      const flatPeriods = flatList.value.map((x, index) => ({
        code: "PV",
        startTime: x.start,
        endTime: x.end,
        sort: 3 + index * 0.1,
      }));
      const valleyPeriods = valleyList.value.map((x, index) => ({
        code: "GV",
        startTime: x.start,
        endTime: x.end,
        sort: 4 + index * 0.1,
      }));
      const pointedPeriods = pointedList.value.map((x, index) => ({
        code: "JV",
        startTime: x.start,
        endTime: x.end,
        sort: 1 + index * 0.1,
      }));
      await PeakValleyPeriods({
        instrumentType: "default",
        dataList: [...peakPeriods, ...flatPeriods, ...valleyPeriods, ...pointedPeriods],
      });
      message.success("操作成功");
    };

    const initialization = async () => {
      await PeakValleyPeriods({
        instrumentType: "default",
        dataList: [
          { code: "FV", startTime: "07:00:00", endTime: "22:59:00", sort: 2 },
          { code: "PV", startTime: "23:00:00", endTime: "06:59:00", sort: 3 },
          { code: "GV", startTime: "", endTime: "", sort: 4 },
          { code: "JV", startTime: "", endTime: "", sort: 1 },
        ],
      });
      peakList.value = [{ start: "07:00:00", end: "22:59:00" }];
      flatList.value = [{ start: "23:00:00", end: "06:59:00" }];
      valleyList.value = [{ start: "", end: "" }];
      pointedList.value = [{ start: "", end: "" }];
      message.success("操作成功");
    };

    const renderPeriod = (label: string, type: string, list: PeriodItem[]) => (
      <div class="period-of-time">
        <div>
          {label}：
          <a style={{ marginLeft: "10px" }} onClick={() => add(type)}>
            添加+
          </a>
        </div>
        {list.length > 0 ? (
          <div>
            {list.map((item, index) => (
              <div class="itemTime" key={`${type}-${index}`}>
                <TimePicker
                  value={item.start}
                  format="HH:mm:ss"
                  valueFormat="HH:mm:ss"
                  onUpdate:value={(v) => {
                    item.start = v == null ? "" : String(v);
                  }}
                />
                到
                <TimePicker
                  value={item.end}
                  format="HH:mm:ss"
                  valueFormat="HH:mm:ss"
                  onUpdate:value={(v) => {
                    item.end = v == null ? "" : String(v);
                  }}
                />
                <a style={{ marginLeft: "10px" }} onClick={() => deleteItem(type, index)}>
                  删除
                </a>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );

    onMounted(() => {
      void loadPeriods();
    });

    return () => (
      <GLayout
        title="峰平谷设置"
        contentTableScrollable
        v-slots={{
          "content-table": () => (
            <div>
              {renderPeriod("峰时段", "peak", peakList.value)}
              {renderPeriod("平时段", "flat", flatList.value)}
              {renderPeriod("谷时段", "valley", valleyList.value)}
              {renderPeriod("尖时段", "pointed", pointedList.value)}
              <Button type="primary" onClick={() => void save()}>
                保存
              </Button>
              <Button style={{ marginLeft: "10px" }} onClick={() => void initialization()}>
                回到初始化
              </Button>
            </div>
          ),
        }}
      />
    );
  },
});

export default PeakValleyPeriodsPage;
