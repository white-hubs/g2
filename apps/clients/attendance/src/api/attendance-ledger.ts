import type { AttendanceLedgerApi } from "@g2-contract/attendance/api/attendance-ledger";
import type { BaseAPIResult, PageResult } from "@g2-contract/attendance/common";

import type { AttendanceTransport } from "../transport";

export function createAttendanceLedgerApi(transport: AttendanceTransport): AttendanceLedgerApi {
  const { Get, service } = transport;
  const DayLedgerExport = async (params: unknown, permissionId = ""): Promise<BaseAPIResult<Blob>> =>
    service.get("/attendance/daily/ledger/getLedgerDetailsExcel", {
      headers: {
        permission: permissionId,
      },
      params,
    });

  const SummaryLedgerExport = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
    service.get("/attendance/att/summary/export", {
      params,
    });

  const DayLedgerPage = async (params: unknown, permissionId = ""): Promise<BaseAPIResult<PageResult>> =>
    Get("/attendance/daily/ledger/getLedgerDetails", {
      headers: {
        permission: permissionId,
      },
      params,
    });

  const SummaryLedgerPage = async (params: unknown, permissionId = ""): Promise<BaseAPIResult<PageResult>> =>
    Get("/attendance/att/summary/page", {
      headers: {
        permission: permissionId,
      },
      params,
    });

  const SequentialPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
    Get("/attendance/att/sequential/page", {
      params,
    });

  const SequentialDetail = async (params: unknown): Promise<BaseAPIResult> =>
    Get("/attendance/att/sequential/detail", {
      params,
    });

  const SequentialLedgerExport = async (params: unknown): Promise<BaseAPIResult<Blob>> =>
    service.get("/attendance/att/sequential/export", {
      params,
    });
  return {
    DayLedgerExport,
    SummaryLedgerExport,
    DayLedgerPage,
    SummaryLedgerPage,
    SequentialPage,
    SequentialDetail,
    SequentialLedgerExport,
  };
}
