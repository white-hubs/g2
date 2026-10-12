export interface InspectionAnalyzeRequest {
  /**
   * 巡检任务 ID
   */
  id: string;
  /**
   * 巡检对象 ID
   */
  objId: string;
  /**
   * 图片文件 ID
   */
  images: string;
}

export interface InspectionStandardVO {
  standardId?: string;
  id?: string | number;
  standardName?: string;
  name?: string;
  safetyTips?: string[];
  standardItems?: InspectionStandardItemVO[];
  [key: string]: unknown;
}

export interface InspectionStandardItemVO {
  itemId?: string;
  id?: string | number;
  itemName?: string;
  name?: string;
  content?: string;
  resultVO?: InspectionResultVO;
  [key: string]: unknown;
}

export interface InspectionResultVO {
  id?: string | number;
  name?: string;
  options?: InspectionResultOptionVO[];
  [key: string]: unknown;
}

export interface InspectionResultOptionVO {
  itemName: string;
  itemValue: string;
  errorFlag: boolean;
}
