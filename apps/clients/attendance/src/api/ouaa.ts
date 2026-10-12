import type { OuaaApi } from "@g2-contract/attendance/api/ouaa";
import type { BaseAPIResult } from "@g2-contract/attendance/common";

import type { AttendanceTransport } from "../transport";

export function createOuaaApi(transport: AttendanceTransport): OuaaApi {
  const { Get } = transport;
  const getTenantInfo = async (
    tenantCode: string | number,
  ): Promise<
    BaseAPIResult<{
      lntAndLat: string | null;
    }>
  > => Get(`/ouaa/tenant-under-tenant/${tenantCode}`);
  return { getTenantInfo };
}
