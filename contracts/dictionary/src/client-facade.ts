import type { CreateDataDictionaryParam, CreateDictionaryItemParam, GetDataDictionaryParam, UpdateDataDictionaryParam } from "./request";
import type { DataDictionary, DataDictionaryItem } from "./response";

export interface DictionaryClient {
  getDictionaryItemByCode: (code: string) => Promise<DataDictionaryItem | null>;
  createDictionaryItem: (params: CreateDictionaryItemParam) => Promise<DataDictionaryItem>;
  getOrCreateDictionaryItem: (params: CreateDictionaryItemParam) => Promise<DataDictionaryItem>;
  getDataDictionaryByItem: (params: GetDataDictionaryParam) => Promise<DataDictionary[]>;
  getDictionaryByItem: (params: GetDataDictionaryParam) => Promise<DataDictionary[]>;
  createDataDictionary: (params: CreateDataDictionaryParam) => Promise<DataDictionary>;
  updateDataDictionary: (params: UpdateDataDictionaryParam) => Promise<DataDictionary>;
}
