export interface Area {
  id: string;
  aliasName: string;
  code: string;
  children: Area[];
  parentId: string | null;
  name: string;
  //...其他字段
}
