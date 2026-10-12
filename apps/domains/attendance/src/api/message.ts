import type { MessageConfigPayload, MessageConfigResult } from "@g2-contract/attendance/api/message";
import type { BaseAPIResult } from "@g2-contract/attendance/common";

import { getAttendanceClient } from "./client";

export type * from "@g2-contract/attendance/api/message";

export const satmsgconfigs = async (params: { satMsgDefineCodes: string }): Promise<BaseAPIResult> =>
  (await getAttendanceClient()).satmsgconfigs(params);

export const satmsgconfig = async (data: {
  params: {
    msgTmpContent: string;
  }[];
}): Promise<BaseAPIResult> => (await getAttendanceClient()).satmsgconfig(data);

export const addsatmsgconfig = async (data: {
  params: {
    msgTmpContent: string;
  }[];
}): Promise<BaseAPIResult> => (await getAttendanceClient()).addsatmsgconfig(data);

export const getnewmessage = async (params: { businessType: string; label: string }): Promise<BaseAPIResult<MessageConfigResult[]>> =>
  (await getAttendanceClient()).getnewmessage(params);

export const addnewmessage = async (data: MessageConfigPayload): Promise<BaseAPIResult<{ code: string; name: string }[]>> =>
  (await getAttendanceClient()).addnewmessage(data);

export const getNoticeCode = async (code: string): Promise<BaseAPIResult<{ channelCodes: string[] }>> =>
  (await getAttendanceClient()).getNoticeCode(code);
