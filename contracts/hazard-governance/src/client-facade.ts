import type { HazardGovernanceGateway } from "./gateway";

/**
 * Browser clients implement the same interface as the domain gateway.  Keeping
 * this alias precise is essential: `unknown` here hid every incomplete
 * migration at the page boundary.
 */
export type HazardGovernanceClient = HazardGovernanceGateway;
