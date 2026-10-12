import type { Classes } from "@g2-contract/attendance/api/classes-manage";
import type { BaseAPIResult, PageResult } from "@g2-contract/attendance/common";

import type { ClassesType } from "../types/classes";
import { getAttendanceClient } from "./client";

export type * from "@g2-contract/attendance/api/classes-manage";

export const classesInsert = async (params: Classes): Promise<BaseAPIResult> => (await getAttendanceClient()).classesInsert(params);

export const classesPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> => (await getAttendanceClient()).classesPage(params);

export const classesList = async (): Promise<BaseAPIResult<{ id: string; name: string; classesType: ClassesType }[]>> =>
  (await getAttendanceClient()).classesList();

export const classesPageWithDept = async (params: Record<string, unknown>): Promise<BaseAPIResult<PageResult>> =>
  (await getAttendanceClient()).classesPageWithDept(params);

export const classesDetail = async (params: { id: string }): Promise<BaseAPIResult<Classes & { id: string }>> =>
  (await getAttendanceClient()).classesDetail(params);

export const classesUpdate = async (params: Classes & { id: string }): Promise<BaseAPIResult> =>
  (await getAttendanceClient()).classesUpdate(params);

export const classesDel = async (params: { id: string }): Promise<BaseAPIResult> => (await getAttendanceClient()).classesDel(params);

export const classesDelCheck = async (params: { id: string }): Promise<BaseAPIResult> =>
  (await getAttendanceClient()).classesDelCheck(params);
