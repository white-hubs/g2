export interface InspectResultItemOption {
  itemName: string;
  itemValue: string;
  errorFlag?: boolean;
}

export interface InspectResultItem {
  id?: string;
  name?: string;
  options?: InspectResultItemOption[];
  [key: string]: unknown;
}

export interface InspectItemContent {
  id: string | undefined;
  name: string | undefined;
  resultId: string | undefined;
  resultItemValue: string | undefined;
  /** 开启「结果巡检项」时为结果值多选；关闭时为 true/false */
  imageResult?: string[] | string | boolean | undefined;
  /** 开启「结果巡检项」时为结果值多选；关闭时为 true/false */
  remarkResult?: string[] | string | boolean | undefined;
  itemTag: string | undefined;
  isResultItem?: boolean;
  isEdit?: boolean;
  nameError?: boolean | undefined;
  nameErrorMsg?: string | undefined;
  resultIdError?: boolean | undefined;
  resultIdErrorMsg?: string | undefined;
  resultItemValueError?: boolean | undefined;
  resultItemValueErrorMsg?: string | undefined;
  remarkResultError?: boolean | undefined;
  remarkResultErrorMsg?: string | undefined;
  imageResultError?: boolean | undefined;
  imageResultErrorMsg?: string | undefined;
  itemTagError?: boolean | undefined;
  itemTagErrorMsg?: string | undefined;
  options?: InspectResultItemOption[] | undefined;
  errOptions?: InspectResultItemOption[] | undefined;
  imageFlag?: boolean | undefined;
  businessType?: string | undefined;
}
