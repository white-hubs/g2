import dayjs from "dayjs";
export const timePeriod = (time: string): string => {
  switch (time) {
    case "TODAY":
      return `${dayjs().format("YYYY-MM-DD")} 00:00:00,${dayjs().format("YYYY-MM-DD")} 23:59:59`;
    case "YESTERDAY":
      return `${dayjs().subtract(1, "day").format("YYYY-MM-DD")} 00:00:00,${dayjs().subtract(1, "day").format("YYYY-MM-DD")} 23:59:59`;
    case "MONTH":
      return `${dayjs().startOf("month").format("YYYY-MM-DD")} 00:00:00,${dayjs().endOf("month").format("YYYY-MM-DD")} 23:59:59`;
    case "YEAR":
      return `${dayjs().startOf("year").format("YYYY-MM-DD")} 00:00:00,${dayjs().endOf("year").format("YYYY-MM-DD")} 23:59:59`;
    default:
      return `${dayjs().format("YYYY-MM-DD")} 00:00:00,${dayjs().format("YYYY-MM-DD")} 23:59:59`;
  }
};

// 获取assets静态资源
export const getAssetsFile = (url: string): string => {
  return new URL(`../assets/images/${url}`, import.meta.url).href;
};
