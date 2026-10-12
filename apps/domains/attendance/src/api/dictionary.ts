import type { BaseAPIResult } from "@g2-contract/attendance/common";

import { getAttendanceClient } from "./client";

export type * from "@g2-contract/attendance/api/dictionary";

export const getCascadeDictionaryItem = async (
  itemCode: string,
): Promise<BaseAPIResult<{ name: string; code: string; variable: string }[]>> =>
  (await getAttendanceClient()).getCascadeDictionaryItem(itemCode);

export const getDataDictionaryByItemPage = async (
  itemCode: string,
): Promise<BaseAPIResult<{ records: { name: string; code: string; variable: string }[] }>> =>
  (await getAttendanceClient()).getDataDictionaryByItemPage(itemCode);
