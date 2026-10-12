import type { Classes, ClassesManageApi } from "@g2-contract/attendance/api/classes-manage";
import type { BaseAPIResult, PageResult } from "@g2-contract/attendance/common";
import type { ClassesType } from "@g2-contract/attendance/types/classes";

import type { AttendanceTransport } from "../transport";

export function createClassesManageApi(transport: AttendanceTransport): ClassesManageApi {
  const { Delete, Get, Post } = transport;
  const classesInsert = async (params: Classes): Promise<BaseAPIResult> => Post("/attendance/att/classes/add", params);

  const classesPage = async (params: unknown): Promise<BaseAPIResult<PageResult>> => Get("/attendance/att/classes/page", { params });

  const classesList = async (): Promise<BaseAPIResult<{ id: string; name: string; classesType: ClassesType }[]>> =>
    Get("/attendance/att/classes/list");

  const classesPageWithDept = async (params: Record<string, unknown>): Promise<BaseAPIResult<PageResult>> => {
    params.deptWhere = true;
    return Get("/attendance/att/classes/page", { params });
  };

  const classesDetail = async (params: { id: string }): Promise<BaseAPIResult<Classes & { id: string }>> =>
    Get("/attendance/att/classes/detail?id=" + params.id);

  const classesUpdate = async (params: Classes & { id: string }): Promise<BaseAPIResult> => Post("/attendance/att/classes/edit", params);

  const classesDel = async (params: { id: string }): Promise<BaseAPIResult> => Delete("/attendance/att/classes/remove?id=" + params.id);

  const classesDelCheck = async (params: { id: string }): Promise<BaseAPIResult> =>
    Get("/attendance/att/classes/checkGroupUse?id=" + params.id);
  return { classesInsert, classesPage, classesList, classesPageWithDept, classesDetail, classesUpdate, classesDel, classesDelCheck };
}
