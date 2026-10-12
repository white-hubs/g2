import type { FlowApi } from "@g2-contract/attendance/api/flow";
import type { BaseAPIResult, PageResult } from "@g2-contract/attendance/common";

import type { AttendanceTransport } from "../transport";

export function createFlowApi(transport: AttendanceTransport): FlowApi {
  const { Get } = transport;
  const getFlowProcessPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> =>
    Get("/flow/process/instance/historical/page", { params });
  return { getFlowProcessPage };
}
