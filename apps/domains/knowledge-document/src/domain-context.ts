import type { KnowledgeDocumentClient } from "@g2-client/knowledge-document/client";
import type { DomainContext } from "@g2-composition/contract";
import type { FileClient } from "@g2-contract/file";

let domainContext: DomainContext | undefined;
let knowledgeDocumentClient: KnowledgeDocumentClient | undefined;

export function installKnowledgeDocumentContext(context: DomainContext, client: KnowledgeDocumentClient): void {
  domainContext = context;
  knowledgeDocumentClient = client;
}

export function getKnowledgeDocumentClient(): KnowledgeDocumentClient {
  if (!knowledgeDocumentClient) {
    throw new Error("知识文档 Client 未安装");
  }
  return knowledgeDocumentClient;
}

export function getFileClient(): Promise<FileClient> {
  if (!domainContext) {
    throw new Error("知识文档 Domain 未安装");
  }
  return domainContext.ensureClient<FileClient>("fileClient");
}
