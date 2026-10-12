import type { BaseAPIResult, PageResult } from "@g2-contract/attendance/common";

import { mainStore } from "../store";
import { getAttendanceClient } from "./client";

export type * from "@g2-contract/attendance/api/attendance-ledger";

export const DayLedgerExport = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
  (await getAttendanceClient()).DayLedgerExport(params, mainStore().permissionId);

export const SummaryLedgerExport = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
  (await getAttendanceClient()).SummaryLedgerExport(params);

export const DayLedgerPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).DayLedgerPage(params, mainStore().permissionId);

export const SummaryLedgerPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).SummaryLedgerPage(params, mainStore().permissionId);

export const SequentialPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).SequentialPage(params);

export const SequentialDetail = async (params: unknown): Promise<BaseAPIResult> => (await getAttendanceClient()).SequentialDetail(params);

export const SequentialLedgerExport = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
  (await getAttendanceClient()).SequentialLedgerExport(params);
