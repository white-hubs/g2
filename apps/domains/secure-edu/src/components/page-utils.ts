export function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

const chineseValueMap: Record<string, string> = {
  PUBLISHED: "已发布",
  WAIT_PUBLISH: "待发布",
  UNPUBLISHED: "待发布",
  TRAINING: "进行中",
  IN_PROGRESS: "进行中",
  STAY_EXAM: "待考试",
  OVER: "已完成",
  ENDED: "已结束",
  REVOKED: "已撤销",
  STAFF: "员工培训",
  MERCHANT: "商户培训",
  STAFF_EXAM: "员工考核",
  MERCHANT_EXAM: "商户考核",
  ONLINE: "线上培训",
  OFFLINE: "线下培训",
  SIGNED: "正常",
  UNSIGNED: "缺勤",
  EXAMINED: "正常",
  MISS_EXAM: "缺考",
  SINGLE_CHOICE: "单选题",
  MULTIPLE_CHOICE: "多选题",
  JUDGE: "判断题",
  HEADQUARTERS: "集团下发",
  LOCAL_CREATE: "自建任务",
  UNIFIED: "统一题目",
  RANDOM: "随机出题",
};

export function displayValue(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "--";
  }
  if (typeof value === "boolean") {
    return value ? "是" : "否";
  }
  if (Array.isArray(value)) {
    return value.map((item) => displayValue(item)).join("，") || "--";
  }
  if (typeof value === "object") {
    const name =
      (value as { name?: unknown; marketName?: unknown; fileName?: unknown }).name ??
      (value as { marketName?: unknown }).marketName ??
      (value as { fileName?: unknown }).fileName;
    return name === undefined ? "--" : displayValue(name);
  }
  const text = String(value);
  return chineseValueMap[text] ?? text;
}

export function pageResult(value: unknown): { records: Record<string, unknown>[]; total: number } {
  if (!value || typeof value !== "object") {
    return { records: [], total: 0 };
  }
  const record = value as { records?: unknown; total?: unknown };
  return {
    records: Array.isArray(record.records)
      ? record.records.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
      : [],
    total: typeof record.total === "number" ? record.total : 0,
  };
}
