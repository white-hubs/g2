import type { DomainContext } from "@g2-composition/contract";
import type { InjectionKey } from "vue";

export const DOMAIN_CONTEXT_KEY: InjectionKey<DomainContext> = Symbol("intruder-alarm-domain-context");
export const APPLICATION_CODE_KEY: InjectionKey<string> = Symbol("intruder-alarm-application-code");
