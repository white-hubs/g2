import type { BaseAPIResult, PageResult } from "@g2-contract/attendance/common";

import { mainStore } from "../store";
import { getAttendanceClient } from "./client";

export type * from "@g2-contract/attendance/api/attendance-pre";

export const beforeStatPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).beforeStatPage(params, mainStore().permissionId);

export const beforeStatExport = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
  (await getAttendanceClient()).beforeStatExport(params);
