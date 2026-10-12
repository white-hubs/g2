export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  mobile: string;
  //...其他字段
}

export interface Organization {
  id: string;
  name: string;
  remark: string;
  members: number;
  enabled: boolean;
  sequence: number;
  parentId: string;
  level: number;
  children: Organization[];
  //...其他字段
}

export interface Role {
  id: string;
  name: string;
  remark: string;
  enabled: boolean;
  builtin: boolean;
}
