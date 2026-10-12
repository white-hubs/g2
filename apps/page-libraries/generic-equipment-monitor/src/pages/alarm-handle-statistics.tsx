import { defineComponent, h } from "vue";

import AlarmStatistic from "./alarm-statistic";

export default defineComponent({
  name: "GemAlarmHandleStatistics",
  inheritAttrs: false,
  setup(_props, { attrs }) {
    return () => h(AlarmStatistic, { ...attrs, mode: "user", title: "报警处理统计" });
  },
});
