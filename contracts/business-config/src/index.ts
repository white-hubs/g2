export interface StreamMediaConfig {
  id: string;
  name: string;
  username: string;
  intranetAddress: string;
  ipAddress: string;
}

export interface StreamMediaConfigInput {
  id?: string;
  name: string;
  username: string;
  password?: string;
  intranetAddress: string;
  ipAddress: string;
}

export interface FileCleanupPolicy {
  id: string;
  sceneCode: string;
  sceneName: string;
  expirationPolicy: string;
  configInfo: string;
}

export interface FileCleanupPolicyInput {
  id?: string;
  sceneCode: string;
  expirationPolicy: string;
  configInfo: string;
}

export interface FileCleanupScene {
  sceneCode: string;
  sceneName: string;
}

export interface AreaFile {
  id: string;
  name?: string | null;
  path?: string | null;
}

export interface BusinessArea {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  level: number;
  sort?: number | null;
  aliasName?: string | null;
  visualizationAreaType?: string | null;
  children?: BusinessArea[];
  areaExtend?: {
    introduce?: string | null;
    pictureFiles?: AreaFile[] | string | null;
    videoFiles?: AreaFile[] | string | null;
    floorPlanFileId?: string | null;
    floorPlanFile?: AreaFile | null;
    coordinateAxis?: string | null;
  };
  areaManagerIds?: string[];
  areaManagerName?: string[];
}

export interface BusinessAreaInput extends Omit<BusinessArea, "children" | "areaExtend" | "id"> {
  id?: string;
  areaExtend: {
    introduce?: string | null;
    pictureFiles: string[];
    videoFiles: string[];
    floorPlanFileId: string | null;
    coordinateAxis: string | null;
  };
}

export interface BusinessAreaImportResult {
  success?: number;
  fail?: number;
  errorMsg?: string[];
}

export interface AliasRecord {
  id?: string;
  code: string;
  name: string;
  itemCode?: string;
  variable?: string;
  changeNotice?: string;
  canDelete?: boolean;
  alias?: { name?: string; path?: string; icon?: string; sort?: number };
  icon?: string;
  sort?: number;
  children?: AliasRecord[];
}

export interface TenantUser {
  id: string;
  userId?: string;
  name: string;
  mobile?: string;
  gender?: string;
  positions?: { name: string }[];
  workStatus?: string;
}

export interface BusinessOrganization {
  id: string;
  name: string;
  children?: BusinessOrganization[];
}

export interface BusinessApplication {
  code: string;
  name: string;
  icon?: string;
  alias?: { name?: string; icon?: string };
}

export interface VideoAnalysisBox {
  id: string;
  itemCode: string;
  name: string;
  code: string;
  variable?: string;
  version?: string;
  remarks?: string;
  flag?: boolean;
}

export interface VideoAnalysisBoxInput {
  id?: string;
  itemCode?: string;
  name: string;
  variable: string;
}

export interface ThirdPartyServiceConfig {
  id: string;
  itemCode: string;
  name: string;
  code: string;
  variable?: string;
  version?: string;
  remarks?: string;
}

export interface BusinessTag {
  id: string;
  name: string;
  description: string;
  updateTime: string;
  parentId: string;
  level: number;
  childList: BusinessTag[] | null;
}

export type BusinessTagRefType =
  | "AREA"
  | "STALL"
  | "DEVICE"
  | "PROPERTY"
  | "SITE_POINT"
  | "PATROL_POINT"
  | "RISK_SOURCE"
  | "SMALL_ENGINEERING";

export interface BusinessTagAssociation {
  id: string;
  name?: string;
  [field: string]: unknown;
}

export interface BusinessConfigClient {
  pageStreamMedia(query: {
    keyword?: string;
    pageNumber: number;
    pageSize: number;
  }): Promise<{ records: StreamMediaConfig[]; total: number }>;
  createStreamMedia(input: StreamMediaConfigInput): Promise<void>;
  updateStreamMedia(input: StreamMediaConfigInput): Promise<void>;
  deleteStreamMedia(id: string): Promise<void>;
  pageFileCleanupPolicies(query: {
    pageNumber: number;
    pageSize: number;
    sceneCode?: string;
  }): Promise<{ records: FileCleanupPolicy[]; total: number }>;
  getFileCleanupScenes(): Promise<FileCleanupScene[]>;
  createFileCleanupPolicy(input: FileCleanupPolicyInput): Promise<void>;
  updateFileCleanupPolicy(input: FileCleanupPolicyInput): Promise<void>;
  deleteFileCleanupPolicy(id: string): Promise<void>;
  listBusinessAreaTree(query?: { keyword?: string }): Promise<BusinessArea[]>;
  getBusinessArea(id: string): Promise<BusinessArea>;
  createBusinessArea(input: BusinessAreaInput): Promise<void>;
  updateBusinessArea(input: BusinessAreaInput): Promise<void>;
  deleteBusinessArea(id: string): Promise<void>;
  saveBusinessAreaSort(rows: BusinessArea[]): Promise<void>;
  exportBusinessArea(query: { keyword?: string }): Promise<Blob>;
  exportBusinessAreaTemplate(): Promise<Blob>;
  importBusinessArea(file: File): Promise<BusinessAreaImportResult>;
  uploadBusinessConfigFile(input: { file: File; sceneCode?: string; businessKey?: string; useTemporary?: boolean }): Promise<AreaFile>;
  getBusinessConfigFile(id: string): Promise<AreaFile>;
  getUserTerminals(): Promise<{ code: string; name: string; alias?: string }[]>;
  listTerminalAliases(): Promise<AliasRecord[]>;
  saveTerminalAlias(input: { code: string; name: string; path: string }): Promise<void>;
  deleteBusinessAlias(id: string): Promise<void>;
  listBusinessApplications(): Promise<BusinessApplication[]>;
  saveApplicationAlias(input: { code: string; name: string; icon: string }): Promise<void>;
  listAliasApplicationGroups(terminal: string): Promise<{ id: string; name: string; applicationPageVOS: BusinessApplication[] }[]>;
  listAliasMenus(applicationCode: string, terminal: string): Promise<AliasRecord[]>;
  saveMenuAliases(input: { terminalCode: string; applicationCode: string; alias: { code: string; name: string; icon: string; sort: number }[] }): Promise<void>;
  getBusinessSetting(code: string): Promise<ThirdPartyServiceConfig | undefined>;
  saveBusinessSetting(input: ThirdPartyServiceConfig): Promise<void>;
  listPhoneEncryptionUsers(): Promise<{ id: string; userId: string }[]>;
  listTenantUsers(query: { keyword?: string; organizationIds?: string[]; enabled?: boolean }): Promise<TenantUser[]>;
  listBusinessOrganizations(): Promise<BusinessOrganization[]>;
  savePhoneEncryptionUsers(userIds: string[], existing: { id: string; userId: string }[]): Promise<void>;
  deleteVideoAnalysisBox(id: string): Promise<void>;
  listVideoAnalysisBoxes(): Promise<VideoAnalysisBox[]>;
  createVideoAnalysisBox(input: VideoAnalysisBoxInput): Promise<void>;
  updateVideoAnalysisBox(input: VideoAnalysisBoxInput): Promise<void>;
  getThirdPartyServices(): Promise<ThirdPartyServiceConfig[]>;
  getThirdPartyService(id: string): Promise<ThirdPartyServiceConfig>;
  updateThirdPartyService(input: ThirdPartyServiceConfig): Promise<void>;
  listBusinessTags(query: { name?: string; period?: string }): Promise<BusinessTag[]>;
  createBusinessTag(input: { name: string; description?: string; parentId?: string }): Promise<void>;
  updateBusinessTag(input: { id: string; name: string; description?: string; parentId?: string }): Promise<void>;
  deleteBusinessTag(id: string): Promise<void>;
  getBusinessTagDetails(id: string): Promise<BusinessTag>;
  getBusinessTagAssociationIds(tagId: string, refType: BusinessTagRefType): Promise<string[]>;
  getBusinessTagAssociations(query: {
    tagId: string;
    refType: BusinessTagRefType;
    name?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Promise<BusinessTagAssociation[] | { records: BusinessTagAssociation[]; total: number; pages?: number }>;
  addBusinessTagAssociations(input: { tagId: string; refRequests: { tagRefType: BusinessTagRefType; refId: string }[] }): Promise<void>;
  removeBusinessTagAssociations(input: { tagId: string; refIds: string[] }): Promise<void>;
}
