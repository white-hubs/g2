export const executeCycleOptions = [
  { label: "每日", value: "EVERY_DAY" },
  { label: "每周", value: "EVERY_WEEK" },
  { label: "每月", value: "EVERY_MONTH" },
];

export const weekCycleOptions = Array.from({ length: 7 }, (_, k) => ({
  label: `周${["日", "一", "二", "三", "四", "五", "六"][k]}`,
  value: String(k + 1),
}));
