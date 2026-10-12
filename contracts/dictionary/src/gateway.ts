import type { CreateDataDictionaryParam, CreateDictionaryItemParam, GetDataDictionaryParam, UpdateDataDictionaryParam } from "./request";
import type { DataDictionary, DataDictionaryItem } from "./response";

export interface DictionaryGateway {
  /**
   * 获取字典项详情
   * @param code 字典项编号
   * @returns
   */
  getDictionaryItemByCode: (code: string) => Promise<DataDictionaryItem>;

  /**
   * 新增字典项
   * @param params 新增参数
   * @returns
   */
  createDictionaryItem: (params: CreateDictionaryItemParam) => Promise<DataDictionaryItem>;

  /**
   * 获取或创建字典项
   * 1. 先尝试获取字典项
   * 2. 如果不存在，则创建新的字典项
   * 3. 返回字典项数据
   * @param params
   * @returns
   */
  getOrCreateDictionaryItemByCode: (params: CreateDictionaryItemParam) => Promise<DataDictionaryItem>;

  /**
   * 获取字典列表
   * @param params 查询参数
   * @returns
   */
  getDataDictionaryByItem: (params: GetDataDictionaryParam) => Promise<DataDictionary[]>;

  /**
   * 新增字典
   * @param params 新增参数
   * @returns
   */
  createDataDictionary: (params: CreateDataDictionaryParam) => Promise<DataDictionaryItem>;

  /**
   * 修改字典
   * @param params 修改参数
   * @returns
   */
  updateDataDictionary: (params: UpdateDataDictionaryParam) => Promise<DataDictionaryItem>;
}
