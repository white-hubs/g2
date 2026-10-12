export interface ColdStoreQuery {
  pageNumber: number;
  pageSize: number;
  keyword?: string;
  type?: string;
  method?: string;
}

export interface ColdStoreMonitorCardQuery {
  pageNumber: number;
  pageSize: number;
  area?: string;
  keyword?: string;
}

export interface ColdStoreSavePayload {
  code: string;
  name: string;
  type: string;
  area: string;
  designTemp: string;
  method: string;
  mainDevice: string;
  insulation: string;
  /** 冷库关联建筑区域 ID。 */
  building?: string;
  location: string;
  builtTime?: string;
  responsibleId?: string;
  deviceIds: string[];
  cameraDeviceIds: string[];
}
