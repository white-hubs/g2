export interface DataDictionaryItem {
  id: string;
  code: string;
  remarks?: string;
  changeNotice?: string;
}

export interface DataDictionary {
  id: string;
  itemCode: string;
  name: string;
  code: string;
  status?: string;
  variable?: string;
  version?: string;
  remarks?: string;
  flag?: boolean;
}
