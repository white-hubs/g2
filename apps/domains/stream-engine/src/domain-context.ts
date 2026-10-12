import type { StreamEngineClient } from "@g2-client/stream-engine/client";
import type { DomainContext } from "@g2-composition/contract";

let context: DomainContext | undefined;
let client: StreamEngineClient | undefined;
let domainConfig: Record<string, unknown> = {};

export function installStreamEngineContext(
  nextContext: DomainContext,
  nextClient: StreamEngineClient,
  config?: Record<string, unknown>,
): void {
  context = nextContext;
  client = nextClient;
  domainConfig = config ?? {};
}

export function getStreamEngineClient(): StreamEngineClient {
  if (!client) {
    throw new Error("流引擎 Client 未安装");
  }
  return client;
}

export function getStreamEngineContext(): DomainContext {
  if (!context) {
    throw new Error("流引擎 Domain 未安装");
  }
  return context;
}

export function getStreamEngineApplicationCode(): string {
  return typeof domainConfig.applicationCode === "string" && domainConfig.applicationCode ? domainConfig.applicationCode : "stream-engine";
}
