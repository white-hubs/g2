import { getEmergencyManagementClient } from "../domain-context";
import { unwrapPage } from "../utils";

export const emergencyApi = {
  client: () => getEmergencyManagementClient(),
  async listPlanDocuments(params: Record<string, unknown>) {
    return unwrapPage(await getEmergencyManagementClient().listPlanDocuments(params));
  },
  async listRules(params: Record<string, unknown>) {
    return unwrapPage(await getEmergencyManagementClient().listRules(params));
  },
  async listEventTypes(params: Record<string, unknown>) {
    return unwrapPage(await getEmergencyManagementClient().listEventTypes(params));
  },
  async listFileTypes(params: Record<string, unknown>) {
    return unwrapPage(await getEmergencyManagementClient().listFileTypes(params));
  },
};
