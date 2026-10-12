import type { WorkbenchClient } from "@g2-client/workbench/client";
import type { DomainContext } from "@g2-composition/contract";
import type { InjectionKey } from "vue";

export const DOMAIN_CONTEXT_KEY: InjectionKey<DomainContext> = Symbol("workbench-domain-context");

let installContext: DomainContext | undefined;
let installedClient: WorkbenchClient | undefined;

export function installWorkbenchContext(ctx: DomainContext, client: WorkbenchClient): void {
  installContext = ctx;
  installedClient = client;
}

export function getWorkbenchContext(): DomainContext {
  if (!installContext) {
    throw new Error("workbench domain not installed");
  }
  return installContext;
}

export function getWorkbenchClient(): WorkbenchClient {
  if (!installedClient) {
    throw new Error("workbench client not installed");
  }
  return installedClient;
}
