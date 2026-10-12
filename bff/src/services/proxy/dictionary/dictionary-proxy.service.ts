import { Injectable, Inject, CONFIG_SERVICE_TOKEN, ConfigService } from "@dangao/bun-server";
import type {
  CreateDataDictionaryParam,
  CreateDictionaryItemParam,
  DataDictionary,
  DataDictionaryItem,
  GetDataDictionaryParam,
  UpdateDataDictionaryParam,
} from "@g2-contract/dictionary";

import { ProxyClient } from "@/clients/proxy-client";
import { buildUrl } from "@/services/request-utils";
import { unwrapUpstreamResponse } from "@/services/upstream-response";

/**
 * 字典代理服务
 * 负责与后端字典服务通信
 */
@Injectable()
export class DictionaryProxyService {
  private readonly baseUrl: string;

  constructor(
    private readonly proxyClient: ProxyClient,
    @Inject(CONFIG_SERVICE_TOKEN) private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>("app.dictionaryUrl") || "";
  }

  /**
   * 创建字典项
   */
  async createDictionaryItem(data: CreateDictionaryItemParam): Promise<DataDictionaryItem> {
    const url = `${this.baseUrl}/addDictionaryItem`;
    const response = await this.proxyClient.request<DataDictionaryItem>(url, {
      method: "POST",
      body: data,
      passthroughError: true,
    });
    return unwrapUpstreamResponse<DataDictionaryItem>(response.data);
  }

  /**
   * 获取字典项
   */
  async getDictionaryItemByCode(code: string): Promise<DataDictionaryItem> {
    const url = `${this.baseUrl}/getDictionaryItemByCode/${encodeURIComponent(code)}`;
    const response = await this.proxyClient.request<DataDictionaryItem>(url, {
      method: "GET",
      passthroughError: true,
    });
    return unwrapUpstreamResponse<DataDictionaryItem>(response.data);
  }

  /**
   * 创建字典
   */
  async createDataDictionary(data: CreateDataDictionaryParam): Promise<DataDictionary> {
    const url = `${this.baseUrl}/addDataDictionary`;
    const response = await this.proxyClient.request<DataDictionary>(url, {
      method: "POST",
      body: data,
      passthroughError: true,
    });
    return unwrapUpstreamResponse<DataDictionary>(response.data);
  }

  /**
   * 编辑字典
   */
  async updateDataDictionary(data: UpdateDataDictionaryParam): Promise<DataDictionary> {
    const url = `${this.baseUrl}/updateDataDictionary`;
    const response = await this.proxyClient.request<DataDictionary>(url, {
      method: "PUT",
      body: data,
      passthroughError: true,
    });
    return unwrapUpstreamResponse<DataDictionary>(response.data);
  }

  /**
   * 根据字典项获取字典列表
   */
  public async getDataDictionaryByItem(query: GetDataDictionaryParam): Promise<DataDictionary[]> {
    const url = `${this.baseUrl}/getDataDictionaryByItem`;
    const fullUrl = buildUrl(url, { ...query });
    const response = await this.proxyClient.request<DataDictionary[]>(fullUrl, {
      method: "GET",
      passthroughError: true,
    });
    return unwrapUpstreamResponse<DataDictionary[]>(response.data);
  }
}
