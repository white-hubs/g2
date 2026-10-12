import type { Pagination } from "@g2-contract/base";

import type { GetOrganizationsParams, ListUsersParams } from "./request";
import type { Organization, Role, User } from "./response";

export interface OuaaGateway {
  getUsersByIds: (ids: string) => Promise<User[]>;
  /** 扁平列表：上游 /organizations/list */
  getOrganizations: (params: GetOrganizationsParams) => Promise<Organization[]>;
  /** 树形结构：上游 /organizations */
  getOrganizationTree: (params: GetOrganizationsParams) => Promise<Organization[]>;
  getRoles: () => Promise<Role[]>;
  listUsers: (params: ListUsersParams) => Promise<Pagination<User>>;
}
