import type { OuaaClient, Organization } from "@g2-contract/ouaa";

import { getSafetyDutyContext } from "../domain-context";
export async function getOrganizationTree(params: { enabled: boolean }): Promise<Organization[]> {
  const client = await getSafetyDutyContext().ensureClient<OuaaClient>("ouaaClient");
  return (await client.getOrganizationTree(params)) as Organization[];
}
