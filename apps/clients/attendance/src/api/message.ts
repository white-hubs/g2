import type { MessageApi, MessageConfigPayload, MessageConfigResult } from "@g2-contract/attendance/api/message";
import type { BaseAPIResult } from "@g2-contract/attendance/common";

import type { AttendanceTransport } from "../transport";

const baseUrl = "message";
const baseUrl1 = "/bracing";
export function createMessageApi(transport: AttendanceTransport): MessageApi {
  const { Get, Post, Put } = transport;
  const satmsgconfigs = async (params: { satMsgDefineCodes: string }): Promise<BaseAPIResult> =>
    Get(baseUrl + "/sat-msg-configs/", {
      params,
    });

  const satmsgconfig = async (data: {
    params: {
      msgTmpContent: string;
    }[];
  }): Promise<BaseAPIResult> => Put(baseUrl + "/sat-msg-config", data);

  const addsatmsgconfig = async (data: {
    params: {
      msgTmpContent: string;
    }[];
  }): Promise<BaseAPIResult> => Post(baseUrl + "/sat-msg-config", data);

  const getnewmessage = async (params: { businessType: string; label: string }): Promise<BaseAPIResult<MessageConfigResult[]>> =>
    Get(baseUrl1 + "/message/getConfigInfo", {
      params: {
        ...params,
      },
    });

  const addnewmessage = async (data: MessageConfigPayload): Promise<BaseAPIResult<{ code: string; name: string }[]>> =>
    Post(baseUrl1 + "/message/addConfig", data);

  const getNoticeCode = async (code: string): Promise<BaseAPIResult<{ channelCodes: string[] }>> =>
    Get(`/message2/sat-msg-scene-receive/code/${code}`);
  return { satmsgconfigs, satmsgconfig, addsatmsgconfig, getnewmessage, addnewmessage, getNoticeCode };
}
