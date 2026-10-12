/**
 * ouaa 服务面契约：权限/用户/租户/验证码/短信等门面（纯类型；ADR-0057）。
 */

import type { OuaaGateway } from "./gateway";

export type OuaaJsonBody = Record<string, unknown>;

export interface DepartmentNode {
  id: string;
  name: string;
  parentId?: string;
  enabled?: boolean;
  level?: number;
  remark?: string;
  sequence?: string;
  children?: DepartmentNode[];
}

export interface DepartmentsQuery {
  enabled?: boolean;
}

/** `@g2-client/ouaa` 经 `ensureClient` 返回的业务 API。 */
export interface OuaaClient extends OuaaGateway {
  /** Legacy CubeOuaaService.getDept: authenticated organizations tree. */
  getDepartments: (query?: DepartmentsQuery) => Promise<DepartmentNode[]>;
  /** TODO(dual-track) `GET /api/ouaa/user-permissions` */
  getUserPermissions: () => Promise<unknown>;
  /** TODO(dual-track) `GET /api/ouaa/context/user` */
  getUserProfile: () => Promise<unknown>;
  /** TODO(dual-track) `GET /api/ouaa/tenant-under-tenant/{tenantCode}` */
  getTenantUnderTenant: (tenantCode: string) => Promise<unknown>;
  /** TODO(dual-track) `GET /api/ouaa/context/terminal-application-groups` */
  getTerminalApplicationGroups: () => Promise<unknown>;
  /** TODO(dual-track) `GET /api/ouaa/context/application/group/menus?id=` */
  getApplicationGroupMenus: (groupId: string) => Promise<unknown>;
  /** TODO(dual-track) `POST /api/ouaa/sms/code/send` */
  sendSmsCode: (body: OuaaJsonBody) => Promise<unknown>;
  /** TODO(dual-track) `POST /api/ouaa/public/user/auth/bind-login` */
  bindLogin: (body: OuaaJsonBody) => Promise<unknown>;
  /** TODO(dual-track) `GET /api/ouaa/retrieve-password/token?...` */
  getRetrievePasswordToken: (query: string) => Promise<unknown>;
  /** TODO(dual-track) `PUT /api/ouaa/retrieve-password/reset` */
  resetPassword: (body: OuaaJsonBody) => Promise<unknown>;
  /** TODO(dual-track) `POST /api/ouaa/captcha/get` */
  getCaptcha: (body: OuaaJsonBody) => Promise<unknown>;
  /** TODO(dual-track) `POST /api/ouaa/captcha/check` */
  checkCaptcha: (body: OuaaJsonBody) => Promise<unknown>;

  /** ghcloud 报警指派人员：`GET /api/ouaa/authenticated/user-under-tenant/page` */
  listTenantUsers: (params?: unknown) => Promise<unknown>;
  /** 旧流引擎人员选择器使用的三种候选范围。 */
  listFlowUsers: (params: Record<string, unknown>) => Promise<unknown>;
  listFlowUsersByIds: (params: Record<string, unknown>) => Promise<unknown>;
  listFlowUsersByRoleIds: (params: Record<string, unknown>) => Promise<unknown>;
  listFlowDepartments: (params: Record<string, unknown>) => Promise<unknown>;
  listFlowDepartmentOptions: (params: Record<string, unknown>) => Promise<unknown>;
  /** 职位列表（报警指派人员筛）：`GET /api/ouaa/authenticated/position/list`。 */
  listPositions: (params?: unknown) => Promise<unknown>;
}

/** cube-services Gateway / DTO（与壳侧 /api 双轨并存；TODO(dual-track) 收敛） */
export * from "./gateway-surface";
