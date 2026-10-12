import type { ProblemsClient } from "@g2-client/problems/client";
import type { DomainContext } from "@g2-composition/contract";

let context: DomainContext | undefined;
let client: ProblemsClient | undefined;

export function installProblemsContext(nextContext: DomainContext, nextClient: ProblemsClient): void {
  context = nextContext;
  client = nextClient;
}
export function getProblemsClient(): ProblemsClient {
  if (!client) {
    throw new Error("隐患排查 Client 未安装");
  }
  return client;
}
export function getProblemsContext(): DomainContext {
  if (!context) {
    throw new Error("隐患排查 Domain 未安装");
  }
  return context;
}
