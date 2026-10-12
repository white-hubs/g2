import type { DictionaryApi } from "@g2-contract/attendance/api/dictionary";
import type { BaseAPIResult } from "@g2-contract/attendance/common";

import type { AttendanceTransport } from "../transport";

export function createDictionaryApi(transport: AttendanceTransport): DictionaryApi {
  const { Get } = transport;
  const getCascadeDictionaryItem = async (itemCode: string): Promise<BaseAPIResult<{ name: string; code: string; variable: string }[]>> =>
    Get("/dictionary/getCascadeDictionaryItem?itemCode=" + itemCode);

  const getDataDictionaryByItemPage = async (
    itemCode: string,
  ): Promise<BaseAPIResult<{ records: { name: string; code: string; variable: string }[] }>> =>
    Get("/dictionary/getDataDictionaryByItemPage?itemCode=" + itemCode);
  return { getCascadeDictionaryItem, getDataDictionaryByItemPage };
}
