import type { PlatformContext } from "@g2-composition/contract";
import type { AttendanceClient } from "@g2-contract/attendance";
import { type AttendanceHttpClient } from "./transport";
export declare function createAttendanceClient(http: AttendanceHttpClient): AttendanceClient;
export declare function create(ctx: PlatformContext): Promise<AttendanceClient>;
export type { AttendanceClient } from "@g2-contract/attendance";
//# sourceMappingURL=client.d.ts.map