/** 本地 shim：替代未进仓的 @ghcloud/cube-dictionary-service，供地图 core 构建。 */
export type CubeAuth = {
  getAuthHeaders?: () => Record<string, string>;
  token?: string;
};

export class CubeDictionaryService {
  constructor(_auth?: CubeAuth) {}
  async getDictionary(_code?: string): Promise<unknown[]> {
    return [];
  }
  async query(_params?: unknown): Promise<unknown> {
    return {};
  }
}
