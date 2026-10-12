export interface PageResult<T> {
  records: T[];
  total: number;
  pages?: number;
}

export interface PageQuery {
  pageNumber: number;
  pageSize: number;
  keyword?: string;
  createTime?: string;
}

export interface Reader {
  id?: number;
  name?: string | null;
  mobile?: string | null;
  gender?: string;
  fileVO?: { path?: string; name?: string };
}

export interface MemberGroup {
  id?: number;
  groupName?: string;
  createTime?: string;
  userCount?: number;
  memberUserName?: string;
}

export interface MemberUser {
  id?: number | string;
  name?: string;
  mobile?: string;
  createTime?: string;
  registerAddress?: string;
  lastLoginTime?: string;
  groups?: string;
}

export interface UserCenterClient {
  pageReaders(query: PageQuery & { mobile?: string }): Promise<PageResult<Reader>>;
  getReader(id: number): Promise<Reader>;
  pageGroups(query: PageQuery): Promise<PageResult<MemberGroup>>;
  deleteGroup(id: string): Promise<void>;
  pageUsers(query: PageQuery): Promise<PageResult<MemberUser>>;
  deleteUser(id: string): Promise<void>;
}
