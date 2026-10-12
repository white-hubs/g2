import type { PlatformContext } from "@g2-composition/contract";
import type { AttendanceClient } from "@g2-contract/attendance";

import { createAttendanceGroupApi } from "./api/attendance-group";
import { createAttendanceLedgerApi } from "./api/attendance-ledger";
import { createAttendancePreApi } from "./api/attendance-pre";
import { createAttendanceRecordApi } from "./api/attendance-record";
import { createClassesManageApi } from "./api/classes-manage";
import { createDictionaryApi } from "./api/dictionary";
import { createFlowApi } from "./api/flow";
import { createHandleRecordApi } from "./api/handle-record";
import { createMessageApi } from "./api/message";
import { createOuaaApi } from "./api/ouaa";
import { createSchedulingManageApi } from "./api/scheduling-manage";
import { createAttendanceSelectionApi } from "./api/selection";
import { createStaffBusinessTripApi } from "./api/staff-business-trip";
import { createStaffClockInApi } from "./api/staff-clock-in";
import { createStaffLeaveApi } from "./api/staff-leave";
import { createStaffOffDutyApi } from "./api/staff-off-duty";
import { createStaffOvertimeApi } from "./api/staff-overtime";
import { createStaffSupplementApi } from "./api/staff-supplement";
import { type AttendanceHttpClient, type HttpClientModule, createAttendanceTransport } from "./transport";

export function createAttendanceClient(http: AttendanceHttpClient): AttendanceClient {
  const transport = createAttendanceTransport(http);
  return {
    ...createAttendanceSelectionApi(transport),
    ...createStaffBusinessTripApi(transport),
    ...createDictionaryApi(transport),
    ...createAttendancePreApi(transport),
    ...createAttendanceGroupApi(transport),
    ...createStaffLeaveApi(transport),
    ...createClassesManageApi(transport),
    ...createAttendanceLedgerApi(transport),
    ...createStaffOffDutyApi(transport),
    ...createStaffOvertimeApi(transport),
    ...createFlowApi(transport),
    ...createHandleRecordApi(transport),
    ...createMessageApi(transport),
    ...createOuaaApi(transport),
    ...createAttendanceRecordApi(transport),
    ...createStaffClockInApi(transport),
    ...createStaffSupplementApi(transport),
    ...createSchedulingManageApi(transport),
    async sceneNotificationMethod(sceneCode) {
      const [channels, scene] = await Promise.all([
        transport.Get<{ channelCode: string; channelName: string }[]>("/message2/sat-msg-channels"),
        transport.Get<{ channelCodes: string[] }>(`/message2/sat-msg-scene-receive/code/${encodeURIComponent(sceneCode)}`),
      ]);
      return channels.data
        .filter((channel) => scene.data.channelCodes.includes(channel.channelCode))
        .map((channel) => ({ label: channel.channelName, value: channel.channelCode }));
    },
  };
}
export async function create(ctx: PlatformContext): Promise<AttendanceClient> {
  const module = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createAttendanceClient(module.createHttpClientForPlatform(ctx));
}
export type { AttendanceClient } from "@g2-contract/attendance";
