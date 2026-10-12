import { message } from "@g2-platform/pc-ui";

import { getDataDictionaryByItemPage } from "./api/dictionary";
import { initializeKeywordAlias } from "./keyword-alias";
import { functionDictionaryStore } from "./store/function-dictionary";

export async function initializeAttendance(): Promise<void> {
  const results = await Promise.allSettled([
    initializeKeywordAlias(),
    (async () => {
      const result = await getDataDictionaryByItemPage("APP_BUSINESS_CONFIG");
      const records = result.data.records as { code: string; variable: string }[];
      const config = records.find((item) => item.code === "ATTENDANCE_MANAGEMENT_ABILITY");
      if (!config) {
        return;
      }
      const parsed = JSON.parse(config.variable) as Record<string, { name: string; value: boolean }>;
      functionDictionaryStore.splice(
        0,
        functionDictionaryStore.length,
        ...Object.entries(parsed)
          .filter(([, item]) => item.value === true)
          .map(([code, item]) => ({ code, ...item })),
      );
    })(),
  ]);
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("考勤配置加载失败", result.reason);
      message.error("考勤配置加载失败，请刷新重试");
    }
  }
}
