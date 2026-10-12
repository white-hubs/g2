import { dayjs } from "@g2-platform/pc-ui";

type CalendarData = {
  date: string;
  weekday: number;
  weekdayChinese: string;
}[];

export function convertToChineseWeekday(day: number): string {
  const chineseWeekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return chineseWeekdays[day];
}

export const getCalendarData = (start: string, end: string): CalendarData => {
  const calendarData = [];
  const len = dayjs(end).diff(start, "day");

  // 根据起始日期和结束日期获取日历数据
  for (let i = 0; i <= len; i++) {
    const date = dayjs(start).add(i, "day").format("YYYY-MM-DD");
    const weekday = dayjs(date).day();
    calendarData.push({ date, weekday, weekdayChinese: convertToChineseWeekday(weekday) });
  }

  return calendarData;
};
