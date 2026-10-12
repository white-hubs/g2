import type { SeriesOption } from "echarts";
import { defineComponent, ref, type PropType } from "vue";

import { getChargeTrend } from "@/api";
import { CLayout } from "@/components/common/c-layout";
import { ELine } from "@/components/echart/e-line";
import { TimeRadioGroup } from "@/components/time-radio-group";
import { Spin } from "@/pc-ui-runtime";
import type { TrendState } from "@/types/fee";

type TimeType = "TODAY" | "THIS_MONTH" | "THIS_YEAR";

export const FeeLine = defineComponent({
  name: "FeeLine",
  props: {
    title: { type: String, default: "" },
    period: { type: String, default: "" },
    timeFlag: { type: String, default: "TODAY" },
    checkedKeys: { type: Array as PropType<Array<string | number>>, default: () => [] },
    instrumentType: { type: String, required: true },
    treeids: { type: Array as PropType<unknown[]>, default: () => [] },
  },
  setup(props, { expose }) {
    const trendLoading = ref(false);
    const trendPeriod = ref("");
    const trendTimeFlag = ref<TimeType>("THIS_MONTH");
    const trendData = ref<unknown[]>([]);
    const eLineRef = ref<{ render: () => void; clear: () => void }>();
    const xData2 = ref<"year" | "month" | "day" | string[]>("day");
    const seriesData = ref<SeriesOption[]>([]);

    const electricFn = () => {
      seriesData.value = trendData.value as SeriesOption[];
      eLineRef.value?.clear();
      eLineRef.value?.render();
    };

    const useFn = () => {
      seriesData.value = [];
      const title = props.instrumentType === "gas_meter" ? "燃气费" : props.instrumentType === "water_meter" ? "水费" : "";
      seriesData.value.push({
        name: title,
        type: "line",
        smooth: true,
        itemStyle: {
          color: props.instrumentType === "gas_meter" ? "#fac858" : "#5470c6",
        },
        areaStyle: {},
        data: (trendData.value as TrendState[]).map((item) => item.amount),
      } as SeriesOption);
      eLineRef.value?.clear();
      eLineRef.value?.render();
    };

    const queryTrend = async (timeTypeStr?: TimeType) => {
      trendLoading.value = true;
      try {
        trendData.value = [];
        const ids = props.checkedKeys.join(",");
        trendTimeFlag.value = timeTypeStr === undefined ? "THIS_MONTH" : timeTypeStr;
        if (props.treeids.length === 0) {
          trendLoading.value = false;
          return;
        }
        const { data } = (await getChargeTrend({
          filterFlag: "area",
          treeIds: props.treeids,
          instrumentType: props.instrumentType,
          areaIds: ids,
          timeFlag: trendTimeFlag.value,
          period: trendPeriod.value,
        })) as {
          data: Array<{
            timeFlag: string;
            amount?: number;
            fvAmount?: number;
            gvAmount?: number;
            pvAmount?: number;
          }>;
        };
        xData2.value = data.map((res) => res.timeFlag);
        if (["water_meter", "gas_meter"].includes(props.instrumentType)) {
          trendData.value = data || [];
          useFn();
        } else {
          trendData.value = [
            { name: "峰时", type: "line", stack: "Total", data: data.map((res) => res.fvAmount) },
            { name: "平时", type: "line", stack: "Total", data: data.map((res) => res.gvAmount) },
            { name: "谷时", type: "line", stack: "Total", data: data.map((res) => res.pvAmount) },
          ];
          electricFn();
        }
      } finally {
        trendLoading.value = false;
      }
    };

    expose({ queryTrend });

    return () => (
      <CLayout
        title={props.title}
        class="mt-15px"
        v-slots={{
          "header-btn": () => (
            <TimeRadioGroup v-model:value={trendPeriod.value} showRangePicker onChange={(flag: TimeType) => void queryTrend(flag)} />
          ),
          content: () => (
            <Spin spinning={trendLoading.value}>
              <div style="height: 400px">
                <ELine ref={eLineRef} legend={{ top: "top" }} xData={xData2.value} series={seriesData.value} />
              </div>
            </Spin>
          ),
        }}
      />
    );
  },
});
