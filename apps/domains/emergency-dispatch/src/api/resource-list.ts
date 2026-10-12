import type {
  AreaTreeNode,
  CandidatePageQuery,
  PageResult,
  ResourceCandidate,
  ResourcePageQuery,
  ResourceRefPayload,
  ResourceRefStatistics,
  ResourceRefType,
  ResourceRefVO,
} from "@g2-contract/emergency-dispatch";

import { unwrapData, unwrapList, unwrapPage } from "./unwrap";
import { getEmergencyDispatchClient } from "@/domain-context";

export type {
  AreaTreeNode,
  CandidatePageQuery,
  PageResult,
  ResourceCandidate,
  ResourcePageQuery,
  ResourceRefStatistics,
  ResourceRefType,
  ResourceRefVO,
};

export function typeText(type: ResourceRefType): string {
  if (type === "PERSON") return "人员";
  if (type === "MATERIAL") return "物资";
  return "设备";
}

export async function pageResourceRefs(query: ResourcePageQuery): Promise<PageResult<ResourceRefVO>> {
  const page = unwrapPage<ResourceRefVO>(await getEmergencyDispatchClient().pageResourceRefs(query));
  return { records: page.records, total: page.total, pages: page.pages ?? 0 };
}

export async function listResourceRefs(query: Partial<ResourcePageQuery>): Promise<ResourceRefVO[]> {
  return unwrapList<ResourceRefVO>(await getEmergencyDispatchClient().listResourceRefs(query));
}

/** 旧仓 bug：create 未传 body；此处显式传 payload 数组 */
export async function createResourceRef(payload: ResourceRefPayload[]): Promise<unknown> {
  return getEmergencyDispatchClient().createResourceRef(payload);
}

export async function deleteResourceRef(id: string): Promise<void> {
  await getEmergencyDispatchClient().deleteResourceRef(id);
}

export async function getResourceRefStatistics(): Promise<ResourceRefStatistics> {
  return unwrapData<ResourceRefStatistics>(await getEmergencyDispatchClient().getResourceRefStatistics()) ?? {};
}

export async function getAreaTree(): Promise<AreaTreeNode[]> {
  return unwrapList<AreaTreeNode>(await getEmergencyDispatchClient().getAreaTree());
}

export async function pageResourceCandidates(query: CandidatePageQuery): Promise<PageResult<ResourceCandidate>> {
  const page = unwrapPage<ResourceCandidate>(await getEmergencyDispatchClient().pageResourceCandidates(query));
  return { records: page.records, total: page.total, pages: page.pages ?? 0 };
}
