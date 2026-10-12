import type { Organization } from "@g2-contract/ouaa";

import { services, unwrapResponse } from "./safety-personnel";
export async function getOrganizationTree(params: { enabled: boolean }): Promise<Organization[]> {
  return unwrapResponse(await (await services().ouaa()).getOrganizationTree(params));
}
