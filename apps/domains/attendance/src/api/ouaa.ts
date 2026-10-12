import type { BaseAPIResult } from "@g2-contract/attendance/common";

import { getAttendanceClient } from "./client";

export type * from "@g2-contract/attendance/api/ouaa";

export const getTenantInfo = async (
  tenantCode: string | number,
): Promise<
  BaseAPIResult<{
    lntAndLat: string | null;
  }>
> => (await getAttendanceClient()).getTenantInfo(tenantCode);
