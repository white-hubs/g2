import type { AreaPlaneMapPayload, AreaPlaneMapVO } from "@g2-contract/emergency-dispatch";

import { unwrapData, unwrapList } from "./unwrap";
import { getEmergencyDispatchClient } from "@/domain-context";

export type { AreaPlaneMapPayload, AreaPlaneMapVO };

export async function listAreaPlaneMapsByAreaId(areaId: string | number): Promise<AreaPlaneMapVO[]> {
  return unwrapList<AreaPlaneMapVO>(await getEmergencyDispatchClient().listAreaPlaneMapsByAreaId(areaId));
}

export async function createAreaPlaneMap(payload: AreaPlaneMapPayload): Promise<AreaPlaneMapVO | void> {
  return unwrapData<AreaPlaneMapVO | void>(await getEmergencyDispatchClient().createAreaPlaneMap(payload));
}

export async function updateAreaPlaneMap(id: string, payload: AreaPlaneMapPayload): Promise<AreaPlaneMapVO | void> {
  return unwrapData<AreaPlaneMapVO | void>(await getEmergencyDispatchClient().updateAreaPlaneMap(id, payload));
}

export async function deleteAreaPlaneMap(id: string): Promise<void> {
  await getEmergencyDispatchClient().deleteAreaPlaneMap(id);
}
