import {
  replaceFumigationWorks,
  upsertFumigationWork,
  type FumigationWork,
  type PrecheckResult,
  type PrecheckStepId,
  type WorkStatus,
} from "./state";
import { getFumigationPrechecks, getFumigationWork, listFumigationWorks } from "@/api/fumigation-client";

export interface LoadFumigationWorksParams {
  pageNumber?: number;
  pageSize?: number;
  keyword?: string;
  status?: WorkStatus | "";
}

export const loadFumigationWorksToCache = async (params: LoadFumigationWorksParams = {}): Promise<FumigationWork[]> => {
  const resp = await listFumigationWorks({
    pageNumber: params.pageNumber ?? 1,
    pageSize: params.pageSize ?? 100,
    keyword: params.keyword ?? "",
    status: params.status ?? "",
  });
  const records = resp.records as FumigationWork[];
  replaceFumigationWorks(records);
  return records;
};

export const loadFumigationWorkToCache = async (workId: string): Promise<FumigationWork | undefined> => {
  if (workId === "") {
    return undefined;
  }
  const work = (await getFumigationWork(workId)) as FumigationWork;
  upsertFumigationWork(work);
  return work;
};

export const loadFumigationPrechecksToCache = async (work: FumigationWork): Promise<Record<PrecheckStepId, PrecheckResult>> => {
  const prechecks = (await getFumigationPrechecks(work.id)) as Record<PrecheckStepId, PrecheckResult>;
  upsertFumigationWork({ ...work, prechecks });
  return prechecks;
};
