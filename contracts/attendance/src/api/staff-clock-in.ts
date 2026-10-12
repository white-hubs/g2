import type { BaseAPIResult, PageResult } from "../common";
import type { ClockInClassesStatus, ClockInStatus } from "../types/classes";

export interface ClockInRules {
  /**
   * 打卡设备集合
   */
  deviceList?: DeviceParam[];
  /**
   * 是否需要人脸识别
   */
  faceRecognition: boolean;
  /**
   * 打卡地点集合
   */
  locationList?: LocationParam[];
  /**
   * 规则名称
   */
  name: string;
  /**
   * 是否允许外勤
   */
  outClock: boolean;
  /**
   * 打卡方式，DEVICE,GPS
   */
  ways: string;
}

export interface DeviceParam {
  id: string;
  code: string;
  /**
   * 设备型号
   */
  modelName: string;
  /**
   * 设备名称
   */
  name: string;
  /**
   * 设备类型
   */
  genreName: string;
}

export interface LocationParam {
  /**
   * 地点
   */
  address: string;
  /**
   * 维度
   */
  latitude: string;
  /**
   * 经度
   */
  longitude: string;
  /**
   * 范围（米
   */
  ranges: number;
}

/**
 * 考勤信息
 *
 * AttClockInLedgerDetailsResult
 */
export interface AttClockInLedgerDetailsResult {
  id?: number;
  /**
   * 台账id
   */
  iedgerId?: number;

  /**
   * 几号
   */
  today: number;
  /**
   * 周几
   */
  week: string;
  state: ClockInStatus | "";

  details: {
    /**
     * 下班异常信息
     */
    endWorkState?: string;
    /**
     * 下班时间
     */
    endWorkTime?: string;
    /**
     * 上班异常信息
     */
    startWorkState?: string;
    /**
     * 上班时间
     */
    startWorkTime?: string;
    /**
     * 打卡状态
     */
    state: ClockInClassesStatus;
    stateDetails: { name: ClockInStatus; value: string }[];
    endWorkOmit: boolean | "";
    startWorkOmit: boolean | "";
    startWorkOut: boolean | "";
    endWorkOut: boolean | "";
  }[];
}
export interface StaffClockInApi {
  getHolidayApi(year: number, month: number): Promise<BaseAPIResult<{ almanac: { month: string }[] }[]>>;
  getDeviceList(params: unknown): Promise<BaseAPIResult>;
  getEquipmentAccountList(params: unknown): Promise<BaseAPIResult>;
  getDeviceGenre(): Promise<BaseAPIResult>;
  clockInRulesInsert(params: ClockInRules): Promise<BaseAPIResult>;
  clockInRulesPage(params: unknown): Promise<BaseAPIResult<PageResult>>;
  clockInRulesDetail(params: { id: string }): Promise<BaseAPIResult<ClockInRules & { id: string }>>;
  clockInRulesUpdate(params: ClockInRules & { id: string }): Promise<BaseAPIResult>;
  clockInRulesDel(params: { id: string }): Promise<BaseAPIResult>;
  clockInLedgerPage(params: unknown): Promise<BaseAPIResult<PageResult>>;
  clockInLedgerExport(params: unknown): Promise<BaseAPIResult<Blob>>;
  clockInRecordPage(params: unknown): Promise<BaseAPIResult<PageResult>>;
  clockInRecordExport(params: unknown): Promise<BaseAPIResult<Blob>>;
  clockInLogByDate(params: unknown): Promise<BaseAPIResult<PageResult>>;
  clockInRecordInsert(params: unknown): Promise<BaseAPIResult>;
  clockInRecordStatusUpdate(id: string): Promise<BaseAPIResult>;
}
