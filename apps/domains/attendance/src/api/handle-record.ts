import type { BaseAPIResult, PageResult } from "@g2-contract/attendance/common";

import { getAttendanceClient } from "./client";

export type * from "@g2-contract/attendance/api/handle-record";

export const getHandleLogPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).getHandleLogPage(params);

export const exportHandleLog = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
  (await getAttendanceClient()).exportHandleLog(params);
