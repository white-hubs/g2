import { RangePicker as AntRangePicker, default as AntDatePicker } from "ant-design-vue/es/date-picker";
import zhCN from "ant-design-vue/es/date-picker/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import { defineComponent, h, type Component } from "vue";

dayjs.locale("zh-cn");

export const datePickerZhCN = zhCN;

/** 与旧仓 cube DateRangePicker 对齐：默认中文 locale + 中文占位。 */
export const RangePicker = defineComponent({
  name: "PcRangePicker",
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => {
      const showTime = Boolean(attrs.showTime);
      const placeholder =
        (attrs.placeholder as [string, string] | undefined) ??
        (showTime ? (["开始时间", "结束时间"] as [string, string]) : (["开始日期", "结束日期"] as [string, string]));
      return h(
        AntRangePicker as Component,
        {
          ...attrs,
          locale: (attrs.locale as typeof zhCN | undefined) ?? zhCN,
          placeholder,
        },
        slots,
      );
    };
  },
}) as typeof AntRangePicker;

export const DatePicker = defineComponent({
  name: "PcDatePicker",
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () =>
      h(
        AntDatePicker as Component,
        {
          ...attrs,
          locale: (attrs.locale as typeof zhCN | undefined) ?? zhCN,
          placeholder: (attrs.placeholder as string | undefined) ?? "请选择日期",
        },
        slots,
      );
  },
}) as typeof AntDatePicker;

export { AntDatePicker, AntRangePicker };
