import type { SafetyPersonnelClient } from "@g2-client/safety-personnel/client";
import type { DomainContext } from "@g2-composition/contract";

let context: DomainContext | undefined;
let client: SafetyPersonnelClient | undefined;
export function installSafetyDutyContext(ctx: DomainContext, api: SafetyPersonnelClient): void {
  context = ctx;
  client = api;
}
export function getSafetyDutyContext(): DomainContext {
  if (!context) throw new Error("safety-duty domain not installed");
  return context;
}
export function getSafetyDutyClient(): SafetyPersonnelClient {
  if (!client) throw new Error("safety-duty client not installed");
  return client;
}
