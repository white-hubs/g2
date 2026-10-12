import type { DomainContext } from "@g2-composition/contract";
import type { FileClient } from "@g2-contract/file";
import type { WorkReportClient } from "@g2-contract/work-report";
let context: DomainContext | undefined;
let client: WorkReportClient | undefined;
export function installWorkReportContext(next: DomainContext, api: WorkReportClient): void {
  context = next;
  client = api;
}
export function getContext(): DomainContext {
  if (!context) {
    throw new Error("工作汇报 Domain 未安装");
  }
  return context;
}
export function getClient(): WorkReportClient {
  if (!client) {
    throw new Error("工作汇报 Client 未安装");
  }
  return client;
}
export function getFileClient(): Promise<FileClient> {
  return getContext().ensureClient<FileClient>("fileClient");
}
