export interface PageResult<T> {
  records: T[];
  total: number;
  pages: number;
}

export interface BulletinPageQuery {
  pageNumber: number;
  pageSize: number;
  keyword?: string;
  type?: string;
  level?: string;
  period?: string;
  status?: "DISPLAY" | "HIDE";
}

export interface BulletinRow {
  id: string;
  title?: string;
  type?: string;
  typeName?: string;
  level?: string;
  levelName?: string;
  noticeTime?: string;
  createBy?: string;
  status?: "DISPLAY" | "HIDE";
  isTopping?: boolean | "0" | "1";
}

export interface BulletinFile {
  id: string;
  name?: string;
  path?: string;
  suffix?: string;
  size?: number;
}

export interface RecipientOption {
  id: string;
  name: string;
  mobile?: string;
  organizations?: { id?: string; name?: string }[];
}

export type PersonnelType = "department" | "position" | "role" | "user";

export interface NoticeConfig {
  way: string | string[];
  personnelType?: PersonnelType;
  deptIds: (string | RecipientOption)[];
  postIds: (string | RecipientOption)[];
  roleIds: (string | RecipientOption)[];
  userIds: (string | RecipientOption)[];
}

export interface BulletinDetail extends BulletinRow {
  content?: string;
  tagId?: string;
  tagName?: string;
  publishAgency?: string;
  files?: BulletinFile[];
  noticeConfigs?: NoticeConfig[];
}

export interface AnnouncementPayload {
  id?: string;
  title: string;
  type: string;
  level: string;
  tagId?: string;
  publishAgency?: string;
  content: string;
  fileIds: string[];
  noticeConfigCommands: {
    way: string;
    personnelType: PersonnelType;
    deptIds: string[];
    postIds: string[];
    roleIds: string[];
    userIds: string[];
  }[];
}

export interface ModelTypeRow {
  id: string;
  modelType?: string;
  typeName: string;
  oneLevelType?: "ANNOUNCEMENT" | "NEW_INFORMATION";
}

export interface NoticeLevel {
  code: string;
  name: string;
}

export interface DeliveryRecord {
  id?: string;
  sendTime?: string;
  userName?: string;
  sendStatusDesc?: string;
}

export interface RecipientPageQuery {
  pageNumber: number;
  pageSize: number;
  keyword?: string;
  name?: string;
}

export interface TechnicalBulletinClient {
  pageAnnouncements(query: BulletinPageQuery): Promise<PageResult<BulletinRow>>;
  getAnnouncement(id: string): Promise<BulletinDetail>;
  saveAnnouncement(body: AnnouncementPayload): Promise<unknown>;
  deleteAnnouncement(id: string): Promise<unknown>;
  deleteAnnouncements(ids: string[]): Promise<unknown>;
  updateVisibility(body: { id: string; isTopping: boolean; status: "DISPLAY" | "HIDE" }[]): Promise<unknown>;

  listNoticeTypes(query?: { keyword?: string; pageNumber?: number; pageSize?: number }): Promise<ModelTypeRow[]>;
  listNoticeLabels(query?: { keyword?: string }): Promise<ModelTypeRow[]>;
  listInstitutions(query?: { keyword?: string }): Promise<ModelTypeRow[]>;
  listNoticeLevels(): Promise<NoticeLevel[]>;
  createModelType(body: { modelType: string; oneLevelType?: string; typeName: string }): Promise<unknown>;
  updateModelType(id: string, body: { modelType: string; oneLevelType?: string; typeName: string }): Promise<unknown>;
  deleteModelType(id: string): Promise<unknown>;

  listDepartments(query: RecipientPageQuery): Promise<RecipientOption[]>;
  pagePositions(query: RecipientPageQuery): Promise<PageResult<RecipientOption>>;
  pageRoles(query: RecipientPageQuery): Promise<PageResult<RecipientOption>>;
  pageUsers(query: RecipientPageQuery): Promise<PageResult<RecipientOption>>;
  listDeliveryRecords(businessKey: string): Promise<DeliveryRecord[]>;
}
