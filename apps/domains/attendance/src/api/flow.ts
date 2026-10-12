import type { BaseAPIResult, PageResult } from "@g2-contract/attendance/common";

import { getAttendanceClient } from "./client";

export type * from "@g2-contract/attendance/api/flow";

export const getFlowProcessPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).getFlowProcessPage(params);
