import type { BaseAPIResult } from "../common";

export interface OuaaApi {
  getTenantInfo(tenantCode: string | number): Promise<
    BaseAPIResult<{
      lntAndLat: string | null;
    }>
  >;
}
