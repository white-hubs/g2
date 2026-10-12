import type { MessageClient } from "@g2-client/message/client";
import type { OuaaClient } from "@g2-client/ouaa/client";
import type { RenovationClient } from "@g2-client/renovation/client";
import type { DomainContext } from "@g2-composition/contract";
import type { FileClient } from "@g2-contract/file";

import { RENOVATION_BASE_PATH, resolveRenovationRuntime, type RenovationRuntime } from "./runtime";

let domainContext: DomainContext | undefined;
let renovationClient: RenovationClient | undefined;
let runtime: RenovationRuntime = resolveRenovationRuntime({ basePath: RENOVATION_BASE_PATH });

export function installRenovationContext(context: DomainContext, client: RenovationClient, nextRuntime?: RenovationRuntime): void {
  domainContext = context;
  renovationClient = client;
  if (nextRuntime) {
    runtime = nextRuntime;
  }
}

export function getRenovationContext(): DomainContext {
  if (!domainContext) {
    throw new Error("更新改造 Domain 未安装");
  }
  return domainContext;
}

export function getRenovationClient(): RenovationClient {
  if (!renovationClient) {
    throw new Error("更新改造 Client 未安装");
  }
  return renovationClient;
}

export function getRenovationRuntime(): RenovationRuntime {
  return runtime;
}

export function getMessageClient(): Promise<MessageClient> {
  return getRenovationContext().ensureClient<MessageClient>("messageClient");
}

export function getFileClient(): Promise<FileClient> {
  return getRenovationContext().ensureClient<FileClient>("fileClient");
}

export function getOuaaClient(): Promise<OuaaClient> {
  return getRenovationContext().ensureClient<OuaaClient>("ouaaClient");
}
