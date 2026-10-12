import type { DomainContext } from "@g2-composition/contract";
import type { InjectionKey } from "vue";

export const DOMAIN_CONTEXT_KEY: InjectionKey<DomainContext> = Symbol("rotating-management-domain-context");
export const APPLICATION_CODE_KEY: InjectionKey<string> = Symbol("rotating-management-application-code");
let installContext: DomainContext | undefined;

export function installRotatingManagementContext(ctx: DomainContext): void {
  installContext = ctx;
}
export function getRotatingManagementContext(): DomainContext {
  if (!installContext) throw new Error("rotating-management domain not installed");
  return installContext;
}
