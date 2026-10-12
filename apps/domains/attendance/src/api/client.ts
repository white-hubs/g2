import type { AttendanceClient } from "@g2-contract/attendance";

import { getDomainContext } from "../domain-context";

export const getAttendanceClient = (): Promise<AttendanceClient> => getDomainContext().ensureClient<AttendanceClient>("attendanceClient");
