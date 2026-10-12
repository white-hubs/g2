import type { DomainContext } from "@g2-composition/contract";
import type { CommandDispatchClient } from "@g2-contract/command-dispatch";
import type { DictionaryClient } from "@g2-contract/dictionary";
import type { FileClient } from "@g2-contract/file";
import type { OuaaClient } from "@g2-contract/ouaa";
import type { InjectionKey } from "vue";

export const DOMAIN_CONTEXT_KEY: InjectionKey<DomainContext> = Symbol("command-dispatch-context");

let installedContext: DomainContext | undefined;
let installedClient: CommandDispatchClient | undefined;
let installedResourceApi:
  | {
      resolveStaticResourceUrl: (pathOrUrl: string) => string;
    }
  | undefined;

export function installCommandDispatchContext(ctx: DomainContext, client: CommandDispatchClient): void {
  installedContext = ctx;
  installedClient = client;
}

export async function installCommandDispatchResourceApi(ctx: DomainContext): Promise<void> {
  installedResourceApi = (await ctx.loadPlatform("resourcePlatform", "api")) as {
    resolveStaticResourceUrl: (pathOrUrl: string) => string;
  };
}

export function resolveCommandDispatchResourceUrl(pathOrUrl: string): string {
  if (!pathOrUrl || !installedResourceApi) {
    return pathOrUrl;
  }
  return installedResourceApi.resolveStaticResourceUrl(pathOrUrl);
}

export function getCommandDispatchContext(): DomainContext {
  if (!installedContext) {
    throw new Error("指挥调度尚未安装");
  }
  return installedContext;
}

export function getCommandDispatchClient(): CommandDispatchClient {
  if (!installedClient) {
    throw new Error("指挥调度服务尚未加载");
  }
  return installedClient;
}

export function getDictionaryClient(): Promise<DictionaryClient> {
  return getCommandDispatchContext().ensureClient<DictionaryClient>("dictionaryClient");
}

export function getFileClient(): Promise<FileClient> {
  return getCommandDispatchContext().ensureClient<FileClient>("fileClient");
}

export function getOuaaClient(): Promise<OuaaClient> {
  return getCommandDispatchContext().ensureClient<OuaaClient>("ouaaClient");
}
