/**
 * mdata 服务面契约：主数据门面（纯类型；ADR-0057）。
 */

/** `@g2-client/mdata` 经 `ensureClient` 返回的业务 API。 */
export interface MdataClient {
  /** `GET /api/mdata/tenant/mine` */
  getTenantMine: () => Promise<unknown>;
  /** `GET /api/mdata/area/list`（树形区域列表，对齐旧仓 getAreaTree） */
  getAreaTree: (query?: Record<string, unknown>) => Promise<unknown>;
  /** `GET /api/mdata/area/list` */
  getAreaList: (query?: Record<string, unknown>) => Promise<unknown>;
  /** 旧用户中心操作日志：GET /api/mdata/operation/log/record/page */
  pageOperationLogs: (query: {
    pageNumber: number;
    pageSize: number;
    period: string;
    userName?: string;
    method?: string;
    result?: string;
  }) => Promise<unknown>;
}
