/** 工作台首页卡片（对齐旧仓 CubeWorkbenchService.Card） */
export interface WorkbenchCard {
  id: string;
  applicationCode: string;
  applicationId: string;
  cardSize: string;
  code: string;
  defaultCard: boolean;
  name: string;
  sort: number;
}

export interface WorkbenchNoUseCardQuery {
  keyword: string;
}

export interface WorkbenchUserMemoModifyParam {
  title: string;
  content: string;
}

export interface WorkbenchUserMemoPageQuery {
  pageNumber: number;
  pageSize: number;
  keyword?: string;
}

export interface WorkbenchUserMemo {
  id: string | number;
  title: string;
  content: string;
  createTime: string;
  updateTime: string;
}

export interface WorkbenchUserMemoPage {
  total: number;
  pages: number;
  records: WorkbenchUserMemo[];
}

export interface AssistantSkillOption {
  id: string;
  label: string;
}
