import type { FormAuditClient } from "@g2-client/form-audit/client";
import type { DomainContext } from "@g2-composition/contract";

let context: DomainContext | undefined;
let client: FormAuditClient | undefined;

export function installFormAuditContext(nextContext: DomainContext, nextClient: FormAuditClient): void {
  context = nextContext;
  client = nextClient;
}

export function getFormAuditContext(): DomainContext {
  if (!context) {
    throw new Error("form-audit domain not installed");
  }
  return context;
}

export function getFormAuditClient(): FormAuditClient {
  if (!client) {
    throw new Error("form-audit domain not installed");
  }
  return client;
}
