import type { BaseAPIResult } from "../common";

export interface DictionaryApi {
  getCascadeDictionaryItem(itemCode: string): Promise<BaseAPIResult<{ name: string; code: string; variable: string }[]>>;
  getDataDictionaryByItemPage(itemCode: string): Promise<BaseAPIResult<{ records: { name: string; code: string; variable: string }[] }>>;
}
