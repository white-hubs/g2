import type { DailyTaskClient } from "@g2-client/daily-task/client";
import type { DomainContext } from "@g2-composition/contract";
import type { InjectionKey } from "vue";

export const DOMAIN_CONTEXT_KEY: InjectionKey<DomainContext> = Symbol("daily-task-domain-context");

let installContext: DomainContext | undefined;
let installedClient: DailyTaskClient | undefined;

export function installDailyTaskContext(ctx: DomainContext, client: DailyTaskClient): void {
  installContext = ctx;
  installedClient = client;
}

export function getDailyTaskContext(): DomainContext {
  if (!installContext) {
    throw new Error("daily-task domain not installed");
  }
  return installContext;
}

export function getDailyTaskClient(): DailyTaskClient {
  if (!installedClient) {
    throw new Error("daily-task client not installed");
  }
  return installedClient;
}

export interface DailyTaskFileClient {
  uploadFile(payload: FormData): Promise<unknown>;
}

export interface DailyTaskOuaaClient {
  listUsers(params: Record<string, unknown>): Promise<unknown>;
}

export async function getFileClient(): Promise<DailyTaskFileClient> {
  return getDailyTaskContext().ensureClient<DailyTaskFileClient>("fileClient");
}

export async function getOuaaClient(): Promise<DailyTaskOuaaClient> {
  return getDailyTaskContext().ensureClient<DailyTaskOuaaClient>("ouaaClient");
}
