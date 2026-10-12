import { unwrapData, unwrapPage } from "./unwrap";
import { getEmergencyDispatchClient } from "@/domain-context";
import type {
  EvacuationRouteCreatePayload,
  EvacuationRouteDevicesPayload,
  EvacuationRoutePageQuery,
  EvacuationRouteUpdatePayload,
  EvacuationRouteVO,
  PageResult,
} from "@/types/evacuation-route";

export type {
  EvacuationRouteCreatePayload,
  EvacuationRouteDevicesPayload,
  EvacuationRoutePageQuery,
  EvacuationRouteUpdatePayload,
  EvacuationRouteVO,
  PageResult,
};

export async function pageEvacuationRoutes(query: EvacuationRoutePageQuery): Promise<PageResult<EvacuationRouteVO>> {
  const page = unwrapPage<EvacuationRouteVO>(await getEmergencyDispatchClient().pageEvacuationRoutes(query));
  return { records: page.records, total: page.total, pages: page.pages };
}

export async function createEvacuationRoute(payload: EvacuationRouteCreatePayload): Promise<EvacuationRouteVO | void> {
  return unwrapData<EvacuationRouteVO | void>(await getEmergencyDispatchClient().createEvacuationRoute(payload));
}

export async function updateEvacuationRoute(id: string, payload: EvacuationRouteUpdatePayload): Promise<EvacuationRouteVO | void> {
  return unwrapData<EvacuationRouteVO | void>(await getEmergencyDispatchClient().updateEvacuationRoute(id, payload));
}

export async function deleteEvacuationRoute(id: string): Promise<void> {
  await getEmergencyDispatchClient().deleteEvacuationRoute(id);
}

export async function updateEvacuationRouteDevices(id: string, payload: EvacuationRouteDevicesPayload): Promise<void> {
  await getEmergencyDispatchClient().updateEvacuationRouteDevices(id, payload);
}
