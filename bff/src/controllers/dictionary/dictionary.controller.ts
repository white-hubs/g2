import { Controller, GET, POST, PUT, Param, Body, QueryMap } from "@dangao/bun-server";
import type {
  CreateDataDictionaryParam,
  CreateDictionaryItemParam,
  DataDictionary,
  DataDictionaryItem,
  DictionaryGateway,
  GetDataDictionaryParam,
  UpdateDataDictionaryParam,
} from "@g2-contract/dictionary";

import { CubeAuthProxy } from "@/decorators/cube-auth-proxy.decorator";
import { DictionaryProxyService } from "@/services/proxy/dictionary/dictionary-proxy.service";

/**
 * 字典控制器
 * 实现 DictionaryGateway 接口
 */
@Controller("/gw-bff/dictionary")
export class DictionaryController implements DictionaryGateway {
  constructor(private readonly dictionProxyService: DictionaryProxyService) {}

  /**
   * 获取字典项
   * /api/dictionary/items/:code
   * @param code
   * @returns
   */
  @GET("/items/:code")
  @CubeAuthProxy()
  public async getDictionaryItemByCode(@Param("code") code: string): Promise<DataDictionaryItem> {
    const result = await this.dictionProxyService.getDictionaryItemByCode(code);
    return result;
  }

  /**
   * 新增字典项
   * /api/dictionary/items
   * @param data
   * @returns
   */
  @POST("/items")
  @CubeAuthProxy()
  public async createDictionaryItem(@Body() data: CreateDictionaryItemParam): Promise<DataDictionaryItem> {
    const result = await this.dictionProxyService.createDictionaryItem(data);
    return result;
  }

  /**
   * 获取或创建字典项
   * @param data
   */
  @POST("/items/get-or-create")
  @CubeAuthProxy()
  public async getOrCreateDictionaryItemByCode(@Body() data: CreateDictionaryItemParam): Promise<DataDictionaryItem> {
    const result = await this.dictionProxyService.getDictionaryItemByCode(data.code);
    if (!result) {
      return await this.dictionProxyService.createDictionaryItem(data);
    }
    return result;
  }

  /**
   * 获取字典列表
   * /api/dictionary/datas
   * @param params
   * @returns
   */
  @GET("/datas")
  @CubeAuthProxy()
  public async getDataDictionaryByItem(@QueryMap() params: GetDataDictionaryParam): Promise<DataDictionary[]> {
    const result = await this.dictionProxyService.getDataDictionaryByItem(params);
    return result;
  }

  /**
   * 新增字典
   * /api/dictionary/datas
   * @param body
   * @returns
   */
  @POST("/datas")
  @CubeAuthProxy()
  public async createDataDictionary(@Body() body: CreateDataDictionaryParam): Promise<DataDictionary> {
    const result = await this.dictionProxyService.createDataDictionary(body);
    return result;
  }

  /**
   * 修改字典
   * /api/dictionary/datas
   * @param body
   * @returns
   */
  @PUT("/datas")
  @CubeAuthProxy()
  public async updateDataDictionary(@Body() body: UpdateDataDictionaryParam): Promise<DataDictionary> {
    const result = await this.dictionProxyService.updateDataDictionary(body);
    return result;
  }
}
