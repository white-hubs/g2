export interface CreateDictionaryItemParam {
  code: string;
  remarks?: string;
  changeNotice?: string;
}

export interface GetDataDictionaryParam {
  itemCode: string;
  name?: string;
  code?: string;
  disable?: boolean;
  codes?: string[];
  tenant?: string;
}

export interface CreateDataDictionaryParam {
  itemCode: string;
  name?: string;
  code?: string;
  status?: string;
  variable?: string;
  version?: string;
  remarks?: string;
  flag?: boolean;
  tenant?: string;
}

export interface UpdateDataDictionaryParam {
  id: string;
  itemCode?: string;
  name?: string;
  code?: string;
  status?: string;
  variable?: string;
  version?: string;
  remarks?: string;
  flag?: boolean;
  tenant?: string;
}
