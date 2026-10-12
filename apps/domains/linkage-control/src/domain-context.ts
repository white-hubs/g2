import type { LinkageClient } from "@g2-contract/linkage-control";
import type { MessageClient } from "@g2-contract/message";

let client: LinkageClient | undefined;
let messageClient: MessageClient | undefined;

export function installLinkageControlClient(value: LinkageClient, messages: MessageClient): void {
  client = value;
  messageClient = messages;
}

export function getLinkageControlMessageClient(): MessageClient {
  if (!messageClient) throw new Error("联动控制消息 Client 尚未安装");
  return messageClient;
}

export function getLinkageControlClient(): LinkageClient {
  if (!client) throw new Error("联动控制 Client 尚未安装");
  return client;
}
