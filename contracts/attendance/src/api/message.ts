import type { BaseAPIResult } from "../common";

export interface MessageConfigResult {
  value: number;
  noticeWays: { noticeWay: string }[];
  label: string;
  sceneCode: string;
}
export interface MessageConfigPayload {
  businessType: string;
  sceneConfigDTOS: MessageConfigResult[];
}
export interface MessageApi {
  satmsgconfigs(params: { satMsgDefineCodes: string }): Promise<BaseAPIResult>;
  satmsgconfig(data: {
    params: {
      msgTmpContent: string;
    }[];
  }): Promise<BaseAPIResult>;
  addsatmsgconfig(data: {
    params: {
      msgTmpContent: string;
    }[];
  }): Promise<BaseAPIResult>;
  getnewmessage(params: { businessType: string; label: string }): Promise<BaseAPIResult<MessageConfigResult[]>>;
  addnewmessage(data: MessageConfigPayload): Promise<BaseAPIResult<{ code: string; name: string }[]>>;
  getNoticeCode(code: string): Promise<BaseAPIResult<{ channelCodes: string[] }>>;
}
