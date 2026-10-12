import type { DomainContext } from "@g2-composition/contract";
import type { InjectionKey } from "vue";

export const DOMAIN_CONTEXT_KEY: InjectionKey<DomainContext> = Symbol("gas-management-domain-context");
export const APPLICATION_CODE_KEY: InjectionKey<string> = Symbol("gas-management-application-code");
